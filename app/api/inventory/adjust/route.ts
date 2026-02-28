// app/api/inventory/adjust/route.ts
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

    const { product_id, type, quantity, notes } = body;

    // ── Validaciones ───────────────────────────────────────────────
    if (!product_id)               return createErrorResponse("El producto es requerido", 400);
    if (!type || !["in", "out"].includes(type))
                                   return createErrorResponse("El tipo debe ser 'in' o 'out'", 400);
    if (!quantity || quantity < 1) return createErrorResponse("La cantidad debe ser al menos 1", 400);
    if (!notes?.trim())            return createErrorResponse("El motivo del ajuste es requerido", 400);

    // Verificar que el producto pertenece al usuario
    const [product] = await sql`
      SELECT id FROM products
      WHERE id = ${product_id} AND user_id = ${userId}
    `;
    if (!product) return createErrorResponse("Producto no encontrado", 404);

    // Si es OUT, verificar que haya stock suficiente
    if (type === "out") {
      const [stockRow] = await sql`
        SELECT COALESCE(SUM(qty_available), 0)::int AS stock
        FROM inventory_batches
        WHERE product_id = ${product_id} AND user_id = ${userId}
      `;
      if (stockRow.stock < quantity) {
        return createErrorResponse(
          `Stock insuficiente. Disponible: ${stockRow.stock} unidades`,
          400,
        );
      }
    }

    const movementType = type === "in" ? "IN" : "OUT";

    await sql`BEGIN`;
    try {

      if (type === "in") {
        // ── Ajuste positivo: crear batch sin costo ─────────────────
        const [batch] = await sql`
          INSERT INTO inventory_batches (
            user_id, product_id, variant_id, purchase_batch_item_id,
            qty_in, qty_available, unit_cost, received_at
          ) VALUES (
            ${userId}, ${product_id}, ${null}, ${null},
            ${quantity}, ${quantity}, 0, NOW()
          )
          RETURNING id
        `;

        await sql`
          INSERT INTO inventory_movements (
            user_id, movement_type, product_id, variant_id,
            quantity, reference_type, reference_id, notes
          ) VALUES (
            ${userId}, ${movementType}, ${product_id}, ${null},
            ${quantity}, 'ADJUSTMENT', ${batch.id}, ${notes.trim()}
          )
        `;

      } else {
        // ── Ajuste negativo: FIFO sobre batches disponibles ────────
        let remaining = quantity;

        const batches = await sql`
          SELECT id, qty_available
          FROM inventory_batches
          WHERE product_id = ${product_id}
            AND user_id    = ${userId}
            AND qty_available > 0
          ORDER BY received_at ASC
        `;

        for (const batch of batches) {
          if (remaining <= 0) break;

          const deduct = Math.min(remaining, batch.qty_available);
          remaining -= deduct;

          await sql`
            UPDATE inventory_batches
            SET qty_available = qty_available - ${deduct}
            WHERE id = ${batch.id}
          `;
        }

        // Un solo movement que representa el total ajustado
        await sql`
          INSERT INTO inventory_movements (
            user_id, movement_type, product_id, variant_id,
            quantity, reference_type, reference_id, notes
          ) VALUES (
            ${userId}, ${movementType}, ${product_id}, ${null},
            ${quantity}, 'ADJUSTMENT', ${null}, ${notes.trim()}
          )
        `;
      }

      await sql`COMMIT`;

      return Response.json(
        {
          message: type === "in"
            ? "Ajuste positivo registrado exitosamente"
            : "Ajuste negativo registrado exitosamente",
          data: { product_id, type, quantity },
        },
        { status: 201 },
      );

    } catch (innerError) {
      await sql`ROLLBACK`;
      throw innerError;
    }

  } catch (error) {
    console.error("❌ POST /api/inventory/adjust:", error);
    return createErrorResponse("Error al registrar el ajuste", 500);
  }
}