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
    const body = await request.json();

    const { account_id, currency, exchange_rate, shipping, notes, purchased_at, items } = body;

    if (!account_id) return createErrorResponse("La cuenta es requerida", 400);
    if (!items || !Array.isArray(items) || items.length === 0)
      return createErrorResponse("Se requiere al menos un producto", 400);

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0)
        return createErrorResponse("Datos de producto inválidos", 400);
      if (item.unit_cost_usd === undefined || item.unit_cost_usd < 0)
        return createErrorResponse("El costo unitario es requerido", 400);
    }

    // Verificar que la cuenta existe y pertenece al usuario
    const [account] = await sql`
      SELECT id, balance FROM accounts
      WHERE id = ${account_id} AND user_id = ${userId} AND is_active = TRUE
    `;
    if (!account) return createErrorResponse("Cuenta no encontrada", 404);

    const rate          = Number(exchange_rate) || 1;
    const shippingTotal = Number(shipping)      || 0;
    const curr          = currency || "HNL";
    const totalUnits    = items.reduce((acc: number, i: any) => acc + Number(i.quantity), 0);

    const processedItems = items.map((item: any) => {
      const unitCostUsd    = Number(item.unit_cost_usd);
      const unitCostHnl    = curr === "USD" ? unitCostUsd * rate : unitCostUsd;
      const shippingPerUnit = totalUnits > 0 ? shippingTotal / totalUnits : 0;
      const finalUnitCost  = unitCostHnl + shippingPerUnit;
      const totalCost      = finalUnitCost * Number(item.quantity);
      return {
        product_id:    item.product_id,
        variant_id:    item.variant_id ?? null,
        quantity:      Number(item.quantity),
        unit_cost_usd: unitCostUsd,
        unit_cost:     finalUnitCost,
        total_cost:    totalCost,
      };
    });

    const subtotal = processedItems.reduce((acc: number, i: any) => acc + i.total_cost, 0);
    const total    = subtotal;

    let purchaseBatchId: number | null = null;

    try {
      // 1. Crear purchase_batch (con account_id)
      const [batch] = await sql`
        INSERT INTO purchase_batches (
          user_id, account_id, currency, exchange_rate,
          subtotal, shipping, tax, total,
          is_paid, purchased_at, notes
        ) VALUES (
          ${userId}, ${account_id}, ${curr}, ${rate},
          ${subtotal}, ${shippingTotal}, ${0}, ${total},
          ${false}, ${purchased_at ?? new Date().toISOString()}, ${notes ?? null}
        )
        RETURNING id
      `;
      purchaseBatchId = batch.id;

      // 2. Items + inventory_batches + movements
      for (const item of processedItems) {
        const [batchItem] = await sql`
          INSERT INTO purchase_batch_items (
            user_id, purchase_batch_id, product_id, variant_id,
            quantity, unit_cost_usd, unit_cost, total_cost
          ) VALUES (
            ${userId}, ${purchaseBatchId}, ${item.product_id}, ${item.variant_id},
            ${item.quantity}, ${item.unit_cost_usd}, ${item.unit_cost}, ${item.total_cost}
          )
          RETURNING id
        `;

        await sql`
          INSERT INTO inventory_batches (
            user_id, product_id, variant_id, purchase_batch_item_id,
            qty_in, qty_available, unit_cost, received_at
          ) VALUES (
            ${userId}, ${item.product_id}, ${item.variant_id}, ${batchItem.id},
            ${item.quantity}, ${item.quantity}, ${item.unit_cost},
            ${purchased_at ?? new Date().toISOString()}
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

      // 3. Registrar transacción de egreso
      const [transaction] = await sql`
                INSERT INTO transactions (
        user_id, account_id, type, amount,
        description, reference_type, reference_id, occurred_at
        ) VALUES (
        ${userId}, ${account_id}, 'EXPENSE', ${total},
        ${'Compra de inventario #' + purchaseBatchId}, 'PURCHASE', ${purchaseBatchId},
        ${purchased_at ?? new Date().toISOString()}
        )
        RETURNING id
      `;

      // 4. Descontar balance de la cuenta
      await sql`
        UPDATE accounts
        SET balance = balance - ${total}
        WHERE id = ${account_id} AND user_id = ${userId}
      `;

      return Response.json(
        { message: "Compra registrada exitosamente", data: { id: purchaseBatchId, total, items: processedItems.length } },
        { status: 201 },
      );

    } catch (innerError) {
      if (purchaseBatchId) {
        await sql`DELETE FROM purchase_batches WHERE id = ${purchaseBatchId} AND user_id = ${userId}`;
      }
      throw innerError;
    }

  } catch (error) {
    console.error("❌ POST /api/purchases:", error);
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
        pb.id, pb.account_id, a.name AS account_name,
        pb.currency, pb.exchange_rate, pb.subtotal,
        pb.shipping, pb.total, pb.is_paid,
        pb.purchased_at, pb.notes, pb.created_at,
        COUNT(pbi.id)::int AS items_count
      FROM purchase_batches pb
      LEFT JOIN accounts a ON a.id = pb.account_id
      LEFT JOIN purchase_batch_items pbi ON pbi.purchase_batch_id = pb.id
      WHERE pb.user_id = ${userId}
      GROUP BY pb.id, a.name
      ORDER BY pb.purchased_at DESC
    `;
    return Response.json({ data: purchases, total: purchases.length });
  } catch (error) {
    console.error("❌ GET /api/purchases:", error);
    return createErrorResponse("Error al obtener compras", 500);
  }
}