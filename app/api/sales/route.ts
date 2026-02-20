// app/api/sales/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

type Preset = "today" | "7d" | "this_month" | "last_month" | "all";

function resolveRange(params: URLSearchParams) {
  const preset = (params.get("preset") as Preset) || "this_month"; // ✅ default: mes actual
  const from = params.get("from"); // YYYY-MM-DD
  const to = params.get("to");     // YYYY-MM-DD
  const payment = params.get("payment"); // CASH|CARD|...

  const now = new Date();
  let fromDate: Date | null = null;
  let toDate: Date | null = null;

  // Si vienen from/to, mandan sobre el preset
  if (from || to) {
    if (from) fromDate = startOfDay(new Date(from));
    if (to) toDate = endOfDay(new Date(to));
  } else {
    switch (preset) {
      case "today": {
        fromDate = startOfDay(now);
        toDate = endOfDay(now);
        break;
      }
      case "7d": {
        const seven = new Date(now);
        seven.setDate(seven.getDate() - 6); // incluye hoy => 7 días
        fromDate = startOfDay(seven);
        toDate = endOfDay(now);
        break;
      }
      case "this_month": {
        fromDate = startOfMonth(now);
        toDate = endOfMonth(now);
        break;
      }
      case "last_month": {
        const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        fromDate = startOfMonth(last);
        toDate = endOfMonth(last);
        break;
      }
      case "all":
      default: {
        fromDate = null;
        toDate = null;
      }
    }
  }

  return {
    preset,
    fromDateISO: fromDate ? fromDate.toISOString() : null,
    toDateISO: toDate ? toDate.toISOString() : null,
    payment: payment && payment !== "all" ? payment : null,
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
        c.name AS customer_name,
        s.subtotal,
        s.discount,
        s.tax,
        s.total,
        s.payment_method,
        s.account_id,
        a.name AS account_name,
        s.sold_at,
        s.notes,
        s.created_at,
        COUNT(si.id)::int AS items_count,
        COALESCE(SUM(si.line_total - (si.unit_cost * si.quantity)), 0) AS net_profit
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      LEFT JOIN accounts a ON a.id = s.account_id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE s.user_id = ${userId}
        AND (${fromDateISO}::timestamptz IS NULL OR s.sold_at >= ${fromDateISO})
        AND (${toDateISO}::timestamptz IS NULL OR s.sold_at <= ${toDateISO})
        AND (${payment}::text IS NULL OR s.payment_method = ${payment})
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
      payment_method,
      account_id,
      notes,
      sold_at,
    } = body;

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

    const processedItems: any[] = [];

    for (const item of items) {
      const batches = await sql`
        SELECT id, qty_available, unit_cost
        FROM inventory_batches
        WHERE user_id = ${userId}
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
        const take = Math.min(remaining, Number(batch.qty_available));
        totalCost += take * Number(batch.unit_cost);
        remaining -= take;
      }

      const avgUnitCost = totalCost / item.quantity;
      const itemDiscount = item.discount ?? 0;
      const lineTotal = item.unit_price * item.quantity - itemDiscount;

      processedItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_cost: avgUnitCost,
        item_discount: itemDiscount,
        line_total: lineTotal,
        batches,
      });
    }

    const subtotal = processedItems.reduce(
      (acc, i) => acc + i.unit_price * i.quantity,
      0
    );
    const globalDiscount = Number(discount) || 0;
    const totalItemDiscounts = processedItems.reduce(
      (acc, i) => acc + i.item_discount,
      0
    );
    const totalDiscount = globalDiscount + totalItemDiscounts;
    const total = subtotal - totalDiscount;

    const [lastSale] = await sql`
      SELECT sale_number FROM sales
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const lastNum = lastSale
      ? parseInt(String(lastSale.sale_number).replace(/\D/g, "")) || 0
      : 0;

    const saleNumber = `VTA-${String(lastNum + 1).padStart(5, "0")}`;

    let saleId: number | null = null;

    try {
      const [sale] = await sql`
        INSERT INTO sales (
          user_id, sale_number, customer_id,
          subtotal, discount, tax, total,
          payment_method, account_id,
          sold_at, notes
        ) VALUES (
          ${userId}, ${saleNumber}, ${customer_id ?? null},
          ${subtotal}, ${totalDiscount}, ${0}, ${total},
          ${payment_method}, ${account_id},
          ${sold_at ?? new Date().toISOString()}, ${notes ?? null}
        )
        RETURNING id
      `;

      saleId = sale.id;

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

      await sql`
        INSERT INTO transactions (
          user_id, type, account_id, amount,
          category, description, reference_type, reference_id, occurred_at
        ) VALUES (
          ${userId}, 'INCOME', ${account_id}, ${total},
          'Ventas', ${`Venta ${saleNumber}`}, 'SALE', ${saleId},
          ${sold_at ?? new Date().toISOString()}
        )
      `;

      await sql`
        UPDATE accounts
        SET balance = balance + ${total}
        WHERE id = ${account_id} AND user_id = ${userId}
      `;

      if (customer_id) {
        await sql`
          UPDATE customers
          SET
            total_orders = total_orders + 1,
            total_spent   = total_spent + ${total},
            updated_at    = CURRENT_TIMESTAMP
          WHERE id = ${customer_id} AND user_id = ${userId}
        `;
      }

      return Response.json(
        {
          message: "Venta registrada exitosamente",
          data: { id: saleId, sale_number: saleNumber, total },
        },
        { status: 201 }
      );
    } catch (innerError) {
      if (saleId) {
        await sql`DELETE FROM sales WHERE id = ${saleId} AND user_id = ${userId}`;
      }
      throw innerError;
    }
  } catch (error) {
    console.error("❌ POST /api/sales:", error);
    return createErrorResponse("Error al registrar la venta", 500);
  }
}
