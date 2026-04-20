// app/api/purchases/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const body       = await request.json();

    const {
      account_id, currency, exchange_rate,
      shipping, notes, purchased_at, items,
      status = "COMPLETED",
    } = body;

    if (status !== "PENDING" && status !== "COMPLETED")
      return createErrorResponse("Estado inválido", 400);

    // ── Validaciones básicas ────────────────────────────────────────
    if (!account_id)
      return createErrorResponse("La cuenta es requerida", 400);
    if (!items || !Array.isArray(items) || items.length === 0)
      return createErrorResponse("Se requiere al menos un producto", 400);

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0)
        return createErrorResponse("Datos de producto inválidos", 400);
      if (item.unit_cost_usd === undefined || item.unit_cost_usd < 0)
        return createErrorResponse("El costo unitario es requerido", 400);
    }

    // ── Validar cuenta ──────────────────────────────────────────────
    const [account] = await sql`
      SELECT id, balance FROM accounts
      WHERE id = ${account_id} AND user_id = ${userId} AND is_active = TRUE
    `;
    if (!account) return createErrorResponse("Cuenta no encontrada", 404);

    // ── Validar productos y variantes ───────────────────────────────
    for (const item of items) {
      const [product] = await sql`
        SELECT id, name, is_service FROM products
        WHERE id = ${item.product_id} AND user_id = ${userId} AND is_active = TRUE
      `;
      if (!product)
        return createErrorResponse(`Producto #${item.product_id} no encontrado`, 404);
      if (product.is_service)
        return createErrorResponse(
          `"${product.name}" es un servicio y no puede tener compras de inventario`,
          400
        );

      if (item.variant_id) {
        const [variant] = await sql`
          SELECT id FROM product_variants
          WHERE id         = ${Number(item.variant_id)}
            AND product_id = ${item.product_id}
            AND user_id    = ${userId}
            AND is_active  = TRUE
        `;
        if (!variant)
          return createErrorResponse(
            `Variante #${item.variant_id} no encontrada o no pertenece al producto #${item.product_id}`,
            404
          );
      }
    }

    // ── Calcular costos ─────────────────────────────────────────────
    const rate          = Number(exchange_rate) || 1;
    const shippingTotal = Number(shipping)      || 0;
    const curr          = currency || "HNL";
    const totalUnits    = items.reduce((acc: number, i: any) => acc + Number(i.quantity), 0);

    const processedItems = items.map((item: any) => {
      const unitCostUsd     = Number(item.unit_cost_usd);
      const unitCostHnl     = curr === "USD" ? unitCostUsd * rate : unitCostUsd;
      const shippingPerUnit = totalUnits > 0 ? shippingTotal / totalUnits : 0;
      const finalUnitCost   = unitCostHnl + shippingPerUnit;
      const totalCost       = finalUnitCost * Number(item.quantity);

      return {
        product_id:    Number(item.product_id),
        variant_id:    item.variant_id ? Number(item.variant_id) : null,
        quantity:      Number(item.quantity),
        unit_cost_usd: unitCostUsd,
        unit_cost:     finalUnitCost,
        total_cost:    totalCost,
      };
    });

    const subtotal   = processedItems.reduce((acc: number, i: any) => acc + i.total_cost, 0);
    const total      = subtotal;
    const occurredAt = purchased_at ?? new Date().toISOString();

    const txDescription = processedItems.length === 1
      ? `Compra — producto #${processedItems[0].product_id}`
      : `Compra de ${processedItems.length} productos`;

    // ── Transacción atómica ─────────────────────────────────────────
    await sql`BEGIN`;
    try {
      // 1. Crear purchase_batch
      const [batch] = await sql`
        INSERT INTO purchase_batches (
          user_id, account_id, currency, exchange_rate,
          subtotal, shipping, tax, total,
          is_paid, purchased_at, notes, status
        ) VALUES (
          ${userId}, ${account_id}, ${curr}, ${rate},
          ${subtotal}, ${shippingTotal}, ${0}, ${total},
          ${false}, ${occurredAt}, ${notes ?? null}, ${status}
        )
        RETURNING id
      `;
      const purchaseBatchId = batch.id as number;

      // 2. Items (+ inventory sólo si status = COMPLETED)
      for (const item of processedItems) {
        const [batchItem] = await sql`
          INSERT INTO purchase_batch_items (
            user_id, purchase_batch_id, product_id, variant_id,
            quantity, unit_cost_usd, unit_cost, total_cost
          ) VALUES (
            ${userId}, ${purchaseBatchId},
            ${item.product_id}, ${item.variant_id},
            ${item.quantity}, ${item.unit_cost_usd},
            ${item.unit_cost}, ${item.total_cost}
          )
          RETURNING id
        `;

        if (status === "COMPLETED") {
          await sql`
            INSERT INTO inventory_batches (
              user_id, product_id, variant_id, purchase_batch_item_id,
              qty_in, qty_available, unit_cost, received_at
            ) VALUES (
              ${userId}, ${item.product_id}, ${item.variant_id}, ${batchItem.id},
              ${item.quantity}, ${item.quantity}, ${item.unit_cost}, ${occurredAt}
            )
          `;

          await sql`
            INSERT INTO inventory_movements (
              user_id, movement_type, product_id, variant_id,
              quantity, reference_type, reference_id, notes
            ) VALUES (
              ${userId}, 'IN', ${item.product_id}, ${item.variant_id},
              ${item.quantity}, 'PURCHASE', ${purchaseBatchId}, ${notes ?? null}
            )
          `;
        }
      }

      // 3. Transacción financiera de egreso
      await sql`
        INSERT INTO transactions (
          user_id, account_id, type, amount,
          description, reference_type, reference_id, occurred_at
        ) VALUES (
          ${userId}, ${account_id}, 'EXPENSE', ${total},
          ${txDescription}, 'PURCHASE', ${purchaseBatchId}, ${occurredAt}
        )
      `;

      // 4. Descontar balance
      await sql`
        UPDATE accounts
        SET balance = balance - ${total}
        WHERE id = ${account_id} AND user_id = ${userId}
      `;

      await sql`COMMIT`;

      return Response.json(
        {
          message: status === "PENDING"
            ? "Compra registrada como pendiente"
            : "Compra registrada exitosamente",
          data: {
            id:    purchaseBatchId,
            total,
            items: processedItems.length,
          },
        },
        { status: 201 }
      );

    } catch (innerError) {
      await sql`ROLLBACK`;
      throw innerError;
    }

  } catch (error) {
    console.error("POST /api/purchases:", error);
    return createErrorResponse("Error al registrar la compra", 500);
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;

    const purchases = await sql`
      SELECT
        pb.id,
        pb.account_id,
        a.name   AS account_name,
        pb.currency,
        pb.exchange_rate,
        pb.subtotal,
        pb.shipping,
        pb.total,
        pb.status,
        pb.is_paid,
        pb.purchased_at,
        pb.notes,
        pb.created_at,
        COUNT(pbi.id)::int AS items_count
      FROM purchase_batches pb
      LEFT JOIN accounts            a   ON a.id   = pb.account_id
      LEFT JOIN purchase_batch_items pbi ON pbi.purchase_batch_id = pb.id
      WHERE pb.user_id = ${userId}
      GROUP BY pb.id, a.name
      ORDER BY pb.purchased_at DESC
    `;

    return Response.json({ data: purchases, total: purchases.length });
  } catch (error) {
    console.error("GET /api/purchases:", error);
    return createErrorResponse("Error al obtener compras", 500);
  }
}