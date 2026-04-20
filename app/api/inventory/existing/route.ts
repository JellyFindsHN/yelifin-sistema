// app/api/inventory/existing/route.ts
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

    const { product_id, variant_id, quantity, unit_cost, purchased_at, notes } = body;

    // ── Validaciones ───────────────────────────────────────────────
    if (!product_id)
      return createErrorResponse("El producto es requerido", 400);
    if (!quantity || quantity < 1)
      return createErrorResponse("La cantidad debe ser al menos 1", 400);

    const variantId = variant_id ? Number(variant_id) : null;

    // Verificar producto
    const [product] = await sql`
      SELECT id, is_service FROM products
      WHERE id = ${product_id} AND user_id = ${userId} AND is_active = TRUE
    `;
    if (!product)
      return createErrorResponse("Producto no encontrado", 404);
    if (product.is_service)
      return createErrorResponse("No se puede registrar inventario inicial para un servicio", 400);

    // Verificar variante si se envió
    if (variantId !== null) {
      const [variant] = await sql`
        SELECT id FROM product_variants
        WHERE id         = ${variantId}
          AND product_id = ${product_id}
          AND user_id    = ${userId}
          AND is_active  = TRUE
      `;
      if (!variant)
        return createErrorResponse(
          `Variante #${variantId} no encontrada o no pertenece a este producto`,
          404
        );
    }

    const unitCost   = Number(unit_cost) || 0;
    const receivedAt = purchased_at
      ? new Date(purchased_at).toISOString()
      : new Date().toISOString();
    const finalNotes = notes?.trim() || "Inventario inicial";

    // ── Transacción atómica ────────────────────────────────────────
    await sql`BEGIN`;
    try {
      const [batch] = await sql`
        INSERT INTO inventory_batches (
          user_id, product_id, variant_id,
          purchase_batch_item_id,
          qty_in, qty_available, unit_cost, received_at
        ) VALUES (
          ${userId}, ${product_id}, ${variantId},
          ${null},
          ${quantity}, ${quantity}, ${unitCost}, ${receivedAt}
        )
        RETURNING id
      `;

      await sql`
        INSERT INTO inventory_movements (
          user_id, movement_type, product_id, variant_id,
          quantity, reference_type, reference_id, notes
        ) VALUES (
          ${userId}, 'IN', ${product_id}, ${variantId},
          ${quantity}, 'INITIAL', ${batch.id}, ${finalNotes}
        )
      `;

      await sql`COMMIT`;

      return Response.json(
        {
          message: "Inventario inicial registrado exitosamente",
          data: {
            batch_id:   batch.id,
            product_id,
            variant_id: variantId,
            quantity,
            unit_cost:  unitCost,
          },
        },
        { status: 201 }
      );

    } catch (innerError) {
      await sql`ROLLBACK`;
      throw innerError;
    }

  } catch (error) {
    console.error("POST /api/inventory/existing:", error);
    return createErrorResponse("Error al registrar inventario inicial", 500);
  }
}