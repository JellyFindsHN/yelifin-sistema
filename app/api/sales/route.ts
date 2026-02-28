// app/api/sales/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function startOfDay(d: Date)   { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0); }
function endOfDay(d: Date)     { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }

type Preset = "today" | "7d" | "this_month" | "last_month" | "all";

function resolveRange(params: URLSearchParams) {
  const preset  = (params.get("preset") as Preset) || "this_month";
  const from    = params.get("from");
  const to      = params.get("to");
  const payment = params.get("payment");
  const now     = new Date();
  let fromDate: Date | null = null;
  let toDate:   Date | null = null;

  if (from || to) {
    if (from) fromDate = startOfDay(new Date(from));
    if (to)   toDate   = endOfDay(new Date(to));
  } else {
    switch (preset) {
      case "today":
        fromDate = startOfDay(now);  toDate = endOfDay(now);  break;
      case "7d": {
        const seven = new Date(now);
        seven.setDate(seven.getDate() - 6);
        fromDate = startOfDay(seven); toDate = endOfDay(now); break;
      }
      case "this_month":
        fromDate = startOfMonth(now); toDate = endOfMonth(now); break;
      case "last_month": {
        const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        fromDate = startOfMonth(last); toDate = endOfMonth(last); break;
      }
      default:
        fromDate = null; toDate = null;
    }
  }

  return {
    preset,
    fromDateISO: fromDate?.toISOString() ?? null,
    toDateISO:   toDate?.toISOString()   ?? null,
    payment:     payment && payment !== "all" ? payment : null,
  };
}

// ── GET /api/sales ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { searchParams } = new URL(request.url);
    const { fromDateISO, toDateISO, payment } = resolveRange(searchParams);

    const sales = await sql`
      SELECT
        s.id,
        s.sale_number,
        s.customer_id,
        c.name       AS customer_name,
        s.subtotal,
        s.discount,
        s.shipping_cost,
        s.tax,
        s.total,
        s.payment_method,
        s.account_id,
        a.name       AS account_name,
        s.event_id,              -- ✅
        s.sold_at,
        s.notes,
        s.created_at,
        COUNT(si.id)::int AS items_count,
        COALESCE(SUM(si.line_total - (si.unit_cost * si.quantity)), 0) AS net_profit
      FROM sales s
      LEFT JOIN customers  c  ON c.id  = s.customer_id
      LEFT JOIN accounts   a  ON a.id  = s.account_id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE s.user_id = ${userId}
        AND (${fromDateISO}::timestamptz IS NULL OR s.sold_at >= ${fromDateISO})
        AND (${toDateISO}::timestamptz   IS NULL OR s.sold_at <= ${toDateISO})
        AND (${payment}::text            IS NULL OR s.payment_method = ${payment})
      GROUP BY s.id, c.name, a.name
      ORDER BY s.sold_at DESC
    `;

    return Response.json({ data: sales, total: sales.length });
  } catch (error) {
    console.error("❌ GET /api/sales:", error);
    return createErrorResponse("Error al obtener ventas", 500);
  }
}

// ── POST /api/sales ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const body = await request.json();

    const {
      customer_id,
      items,
      discount,
      shipping_cost,
      payment_method,
      account_id,
      notes,
      sold_at,
      supplies_used,
      event_id,      // ✅ viene opcional
    } = body;

    // ── Validaciones básicas ───────────────────────────────────────────
    if (!items || !Array.isArray(items) || items.length === 0)
      return createErrorResponse("Se requiere al menos un producto", 400);
    if (!payment_method)
      return createErrorResponse("El método de pago es requerido", 400);
    if (!account_id)
      return createErrorResponse("La cuenta de destino es requerida", 400);

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0)
        return createErrorResponse("Datos de producto inválidos", 400);
      if (item.unit_price === undefined || item.unit_price < 0)
        return createErrorResponse("El precio unitario es requerido", 400);
    }

    // ── Verificar cuenta activa ────────────────────────────────────────
    const [account] = await sql`
      SELECT id FROM accounts
      WHERE id = ${account_id} AND user_id = ${userId} AND is_active = TRUE
    `;
    if (!account) return createErrorResponse("Cuenta no encontrada", 404);

    // ── Verificar evento si viene ─────────────────────────────────────
    const eventIdNum = event_id ? Number(event_id) : null;
    if (eventIdNum) {
      const [ev] = await sql`
        SELECT id FROM events WHERE id = ${eventIdNum} AND user_id = ${userId}
      `;
      if (!ev) return createErrorResponse("Evento no encontrado", 404);
    }

    // ── Pre-procesar items FIFO ────────────────────────────────────────
    const processedItems: any[] = [];

    for (const item of items) {
      const batches = await sql`
        SELECT id, qty_available, unit_cost
        FROM inventory_batches
        WHERE user_id    = ${userId}
          AND product_id = ${item.product_id}
          AND qty_available > 0
        ORDER BY received_at ASC
      `;

      const totalAvailable = batches.reduce(
        (acc: number, b: any) => acc + Number(b.qty_available),
        0
      );

      if (totalAvailable < item.quantity) {
        const [product] = await sql`
          SELECT name FROM products WHERE id = ${item.product_id}
        `;
        return createErrorResponse(
          `Stock insuficiente para "${product?.name}". Disponible: ${totalAvailable}`,
          400
        );
      }

      let remaining = item.quantity;
      let totalCost = 0;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const take  = Math.min(remaining, Number(batch.qty_available));
        totalCost  += take * Number(batch.unit_cost);
        remaining  -= take;
      }

      processedItems.push({
        product_id:    item.product_id,
        variant_id:    item.variant_id ?? null,
        quantity:      item.quantity,
        unit_price:    item.unit_price,
        unit_cost:     totalCost / item.quantity,
        item_discount: item.discount ?? 0,
        line_total:    item.unit_price * item.quantity - (item.discount ?? 0),
        batches,
      });
    }

    // ── Validar suministros ────────────────────────────────────────────
    const normalizedSupplies: {
      supply_id:  number;
      quantity:   number;
      unit_cost:  number;
      line_total: number;
    }[] = [];

    if (Array.isArray(supplies_used) && supplies_used.length > 0) {
      for (const s of supplies_used) {
        const supply_id = Number(s.supply_id);
        const quantity  = Number(s.quantity);
        const unit_cost = Number(s.unit_cost);

        if (!supply_id || quantity <= 0)
          return createErrorResponse("Datos de suministro inválidos", 400);

        const [supply] = await sql`
          SELECT id FROM supplies WHERE id = ${supply_id} AND user_id = ${userId}
        `;
        if (!supply)
          return createErrorResponse(`Suministro #${supply_id} no encontrado`, 404);

        normalizedSupplies.push({
          supply_id,
          quantity,
          unit_cost,
          line_total: quantity * unit_cost,
        });
      }
    }

    // ── Cálculos finales ───────────────────────────────────────────────
    const subtotal           = processedItems.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
    const globalDiscount     = Number(discount) || 0;
    const totalItemDiscounts = processedItems.reduce((acc, i) => acc + i.item_discount, 0);
    const totalDiscount      = globalDiscount + totalItemDiscounts;
    const shippingAmount     = Number(shipping_cost) || 0;
    const saleTotal          = subtotal - totalDiscount;
    const grandTotal         = saleTotal + shippingAmount;   // total real que entra a la cuenta
    const suppliesCost       = normalizedSupplies.reduce((acc, s) => acc + s.line_total, 0);
    const occurredAt         = sold_at ?? new Date().toISOString();

    // ── Número de venta ────────────────────────────────────────────────
    const [lastSale] = await sql`
      SELECT sale_number
      FROM sales
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const lastNum    = lastSale ? parseInt(String(lastSale.sale_number).replace(/\D/g, "")) || 0 : 0;
    const saleNumber = `VTA-${String(lastNum + 1).padStart(5, "0")}`;

    // ══════════════════════════════════════════════════════════════════
    // TRANSACCIÓN DB
    // ══════════════════════════════════════════════════════════════════
    await sql`BEGIN`;
    try {

      // 1. Crear la venta (guardando event_id) ✅
      const [sale] = await sql`
        INSERT INTO sales (
          user_id, sale_number, customer_id,
          subtotal, discount, tax, shipping_cost, total,
          payment_method, account_id, event_id,
          sold_at, notes
        ) VALUES (
          ${userId}, ${saleNumber}, ${customer_id ?? null},
          ${subtotal}, ${totalDiscount}, ${0}, ${shippingAmount}, ${grandTotal},
          ${payment_method}, ${account_id}, ${eventIdNum},
          ${occurredAt}::timestamptz, ${notes ?? null}
        )
        RETURNING id
      `;
      const saleId = sale.id as number;

      // 2. Items + FIFO de inventario
      for (const item of processedItems) {
        await sql`
          INSERT INTO sale_items (
            user_id, sale_id, product_id, variant_id,
            quantity, unit_price, unit_cost, line_total
          ) VALUES (
            ${userId}, ${saleId}, ${item.product_id}, ${item.variant_id},
            ${item.quantity}, ${item.unit_price}, ${item.unit_cost}, ${item.line_total}
          )
        `;

        let remaining = item.quantity;
        for (const batch of item.batches) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, Number(batch.qty_available));
          await sql`
            UPDATE inventory_batches
            SET qty_available = qty_available - ${take}
            WHERE id = ${batch.id} AND user_id = ${userId}
          `;
          remaining -= take;
        }

        await sql`
          INSERT INTO inventory_movements (
            user_id, movement_type, product_id, variant_id,
            quantity, reference_type, reference_id
          ) VALUES (
            ${userId}, 'OUT', ${item.product_id}, ${item.variant_id},
            ${item.quantity}, 'SALE', ${saleId}
          )
        `;
      }

      // 3. Suministros usados
      for (const s of normalizedSupplies) {
        await sql`
          INSERT INTO sale_supplies (
            user_id, sale_id, supply_id,
            quantity, unit_cost, line_total
          ) VALUES (
            ${userId}, ${saleId}, ${s.supply_id},
            ${s.quantity}, ${s.unit_cost}, ${s.line_total}
          )
        `;

        await sql`
          UPDATE supplies
          SET stock = GREATEST(0, stock - ${s.quantity})
          WHERE id = ${s.supply_id} AND user_id = ${userId}
        `;

        await sql`
          INSERT INTO supply_movements (
            user_id, movement_type, supply_id,
            quantity, reference_type, reference_id
          ) VALUES (
            ${userId}, 'OUT', ${s.supply_id},
            ${s.quantity}, 'SALE', ${saleId}
          )
        `;
      }

      // 4. Transacción INCOME — referencia a EVENT o SALE según corresponda ✅
      const txRefType = eventIdNum ? "EVENT" : "SALE";
      const txRefId   = eventIdNum ? eventIdNum : saleId;

      await sql`
        INSERT INTO transactions (
          user_id, type, account_id, amount,
          category, description, reference_type, reference_id, occurred_at
        ) VALUES (
          ${userId}, 'INCOME', ${account_id}, ${grandTotal},
          'Ventas',
          ${shippingAmount > 0
            ? `Venta ${saleNumber} (incluye envío L ${shippingAmount.toFixed(2)})`
            : `Venta ${saleNumber}`
          },
          ${txRefType}, ${txRefId}, ${occurredAt}::timestamptz
        )
      `;

      // 5. Actualizar balance de la cuenta
      await sql`
        UPDATE accounts
        SET balance = balance + ${grandTotal}
        WHERE id = ${account_id} AND user_id = ${userId}
      `;

      // 6. Actualizar métricas de cliente
      if (customer_id) {
        await sql`
          UPDATE customers
          SET total_orders = total_orders + 1,
              total_spent  = total_spent + ${grandTotal},
              updated_at   = CURRENT_TIMESTAMP
          WHERE id = ${customer_id} AND user_id = ${userId}
        `;
      }

      await sql`COMMIT`;

      return Response.json(
        {
          message: "Venta registrada exitosamente",
          data: {
            id:            saleId,
            sale_number:   saleNumber,
            subtotal,
            discount:      totalDiscount,
            shipping_cost: shippingAmount,
            supplies_cost: suppliesCost,
            total:         grandTotal,
          },
        },
        { status: 201 }
      );

    } catch (innerError) {
      await sql`ROLLBACK`;
      throw innerError;
    }

  } catch (error) {
    console.error("❌ POST /api/sales:", error);
    return createErrorResponse("Error al registrar la venta", 500);
  }
}