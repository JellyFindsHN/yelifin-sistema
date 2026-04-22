// app/api/purchases/[id]/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ id: string }> };

// ── PATCH /api/purchases/[id] — confirmar llegada de inventario ────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id }     = await params;
    const purchaseId = Number(id);

    if (isNaN(purchaseId)) return createErrorResponse("ID inválido", 400);

    const body = await request.json();
    const { shipping: newShipping, shipping_account_id: bodyShippingAccId } = body;

    // ── Validar que la compra existe y está PENDING ─────────────────
    const [purchase] = await sql`
      SELECT id, account_id, shipping_account_id, status, shipping, subtotal, total, purchased_at, notes
      FROM purchase_batches
      WHERE id = ${purchaseId} AND user_id = ${userId}
    `;

    if (!purchase)
      return createErrorResponse("Compra no encontrada", 404);
    if (purchase.status !== "PENDING")
      return createErrorResponse("Esta compra ya fue registrada en inventario", 409);

    // ── Obtener items con sus costos actuales ───────────────────────
    const items = await sql`
      SELECT id, product_id, variant_id, quantity, unit_cost_usd, unit_cost, total_cost
      FROM purchase_batch_items
      WHERE purchase_batch_id = ${purchaseId} AND user_id = ${userId}
    `;

    if (items.length === 0)
      return createErrorResponse("La compra no tiene items", 400);

    const oldShipping   = Number(purchase.shipping);
    const shippingFinal = newShipping !== undefined && newShipping !== null
      ? Math.max(0, Number(newShipping))
      : oldShipping;
    const shippingDelta = shippingFinal - oldShipping;
    const occurredAt    = purchase.purchased_at ?? new Date().toISOString();

    const totalUnits = items.reduce((acc: number, i: any) => acc + Number(i.quantity), 0);

    // Recalcular unit_cost si el envío cambió
    const updatedItems = items.map((item: any) => {
      const perUnitDelta  = totalUnits > 0 ? shippingDelta / totalUnits : 0;
      const newUnitCost   = Number(item.unit_cost) + perUnitDelta;
      const newTotalCost  = newUnitCost * Number(item.quantity);
      return {
        ...item,
        unit_cost:  newUnitCost,
        total_cost: newTotalCost,
      };
    });

    const newTotal = Number(purchase.total) + shippingDelta;

    // Cuenta que absorbe el delta de envío: body override > stored > main account
    const shippingAccId = bodyShippingAccId
      ? Number(bodyShippingAccId)
      : purchase.shipping_account_id
        ? Number(purchase.shipping_account_id)
        : null;

    await sql`BEGIN`;
    try {
      // 1. Actualizar costos en items si el envío cambió
      if (shippingDelta !== 0) {
        for (const item of updatedItems) {
          await sql`
            UPDATE purchase_batch_items
            SET unit_cost  = ${item.unit_cost},
                total_cost = ${item.total_cost}
            WHERE id = ${item.id} AND user_id = ${userId}
          `;
        }

        // Actualizar la compra (shipping y total)
        await sql`
          UPDATE purchase_batches
          SET shipping = ${shippingFinal},
              subtotal = ${newTotal},
              total    = ${newTotal}
          WHERE id = ${purchaseId} AND user_id = ${userId}
        `;

        if (shippingAccId) {
          // El envío tiene cuenta dedicada — buscar tx existente o crearla
          const [existingShippingTx] = await sql`
            SELECT id FROM transactions
            WHERE reference_type = 'PURCHASE_SHIPPING'
              AND reference_id   = ${purchaseId}
              AND user_id        = ${userId}
          `;
          if (existingShippingTx) {
            await sql`
              UPDATE transactions
              SET amount = amount + ${shippingDelta}
              WHERE id = ${existingShippingTx.id}
            `;
            await sql`
              UPDATE accounts
              SET balance = balance - ${shippingDelta}
              WHERE id = ${shippingAccId} AND user_id = ${userId}
            `;
          } else {
            // No existía tx de envío — crearla con el monto final
            await sql`
              INSERT INTO transactions (
                user_id, account_id, type, amount,
                description, reference_type, reference_id, occurred_at
              ) VALUES (
                ${userId}, ${shippingAccId}, 'EXPENSE', ${shippingFinal},
                'Pago de envío', 'PURCHASE_SHIPPING', ${purchaseId}, ${occurredAt}
              )
            `;
            await sql`
              UPDATE accounts
              SET balance = balance - ${shippingFinal}
              WHERE id = ${shippingAccId} AND user_id = ${userId}
            `;
          }
        } else if (purchase.account_id) {
          // Envío incluido en la transacción principal
          await sql`
            UPDATE transactions
            SET amount = ${newTotal}
            WHERE reference_type = 'PURCHASE'
              AND reference_id   = ${purchaseId}
              AND user_id        = ${userId}
          `;
          await sql`
            UPDATE accounts
            SET balance = balance - ${shippingDelta}
            WHERE id = ${purchase.account_id} AND user_id = ${userId}
          `;
        }
        // Para compras CC sin shipping_account: no ajustamos la CC (edge case)
      } else if (shippingAccId && shippingFinal > 0) {
        // El envío no cambió pero el usuario seleccionó cuenta de envío — asegurar que la tx exista
        const [existingShippingTx] = await sql`
          SELECT id FROM transactions
          WHERE reference_type = 'PURCHASE_SHIPPING'
            AND reference_id   = ${purchaseId}
            AND user_id        = ${userId}
        `;
        if (!existingShippingTx) {
          await sql`
            INSERT INTO transactions (
              user_id, account_id, type, amount,
              description, reference_type, reference_id, occurred_at
            ) VALUES (
              ${userId}, ${shippingAccId}, 'EXPENSE', ${shippingFinal},
              'Pago de envío', 'PURCHASE_SHIPPING', ${purchaseId}, ${occurredAt}
            )
          `;
          await sql`
            UPDATE accounts
            SET balance = balance - ${shippingFinal}
            WHERE id = ${shippingAccId} AND user_id = ${userId}
          `;
        }
      }

      // 2. Insertar inventory_batches y movements
      for (const item of updatedItems) {
        await sql`
          INSERT INTO inventory_batches (
            user_id, product_id, variant_id, purchase_batch_item_id,
            qty_in, qty_available, unit_cost, received_at
          ) VALUES (
            ${userId}, ${item.product_id}, ${item.variant_id}, ${item.id},
            ${item.quantity}, ${item.quantity}, ${item.unit_cost}, ${occurredAt}
          )
        `;

        await sql`
          INSERT INTO inventory_movements (
            user_id, movement_type, product_id, variant_id,
            quantity, reference_type, reference_id, notes
          ) VALUES (
            ${userId}, 'IN', ${item.product_id}, ${item.variant_id},
            ${item.quantity}, 'PURCHASE', ${purchaseId}, ${purchase.notes ?? null}
          )
        `;
      }

      // 3. Marcar como completada
      await sql`
        UPDATE purchase_batches
        SET status = 'COMPLETED'
        WHERE id = ${purchaseId} AND user_id = ${userId}
      `;

      await sql`COMMIT`;

      return Response.json({
        message: "Inventario registrado exitosamente",
        data: { id: purchaseId, total: newTotal, shipping_adjusted: shippingDelta !== 0 },
      });

    } catch (innerError) {
      await sql`ROLLBACK`;
      throw innerError;
    }

  } catch (error) {
    console.error("PATCH /api/purchases/[id]:", error);
    return createErrorResponse("Error al confirmar la llegada", 500);
  }
}
