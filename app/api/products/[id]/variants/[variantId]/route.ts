// app/api/products/[id]/variants/[variantId]/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ id: string; variantId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id, variantId } = await params;
    const productId  = Number(id);
    const variantIdN = Number(variantId);

    if (isNaN(productId) || isNaN(variantIdN)) {
      return createErrorResponse("ID inválido", 400);
    }

    // Verificar que la variante existe, pertenece al usuario y al producto correcto
    const [existing] = await sql`
      SELECT id FROM product_variants
      WHERE id         = ${variantIdN}
        AND product_id = ${productId}
        AND user_id    = ${userId}
      LIMIT 1
    `;
    if (!existing) return createErrorResponse("Variante no encontrada", 404);

    const body = await request.json();
    const { variant_name, sku, attributes, price_override, image_url, is_active } = body;

    if (price_override !== undefined && price_override !== null) {
      if (isNaN(Number(price_override)) || Number(price_override) < 0) {
        return createErrorResponse("El precio debe ser un número mayor o igual a 0", 400);
      }
    }

    // Verificar SKU duplicado (excluyendo la misma variante)
    if (sku) {
      const [skuConflict] = await sql`
        SELECT id FROM product_variants
        WHERE user_id = ${userId}
          AND sku     = ${sku}
          AND id     != ${variantIdN}
        LIMIT 1
      `;
      if (skuConflict) {
        return createErrorResponse("Ya existe una variante con este SKU", 409);
      }
    }

    const [updated] = await sql`
      UPDATE product_variants SET
        variant_name   = COALESCE(${variant_name  ?? null}, variant_name),
        sku            = COALESCE(${sku?.trim() || null}, sku),
        attributes     = COALESCE(${attributes    ? JSON.stringify(attributes) : null}, attributes),
        price_override = ${price_override !== undefined && price_override !== null
                              ? Number(price_override)
                              : null},
        image_url      = COALESCE(${image_url     ?? null}, image_url),
        is_active      = COALESCE(${is_active     !== undefined ? is_active : null}, is_active),
        updated_at     = CURRENT_TIMESTAMP
      WHERE id         = ${variantIdN}
        AND product_id = ${productId}
        AND user_id    = ${userId}
      RETURNING *
    `;

    return Response.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/products/[id]/variants/[variantId]:", error);
    return createErrorResponse("Error al actualizar variante", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id, variantId } = await params;
    const productId  = Number(id);
    const variantIdN = Number(variantId);

    if (isNaN(productId) || isNaN(variantIdN)) {
      return createErrorResponse("ID inválido", 400);
    }

    const [existing] = await sql`
      SELECT id FROM product_variants
      WHERE id         = ${variantIdN}
        AND product_id = ${productId}
        AND user_id    = ${userId}
      LIMIT 1
    `;
    if (!existing) return createErrorResponse("Variante no encontrada", 404);

    // Verificar si tiene historial en ventas o inventario
    const [usage] = await sql`
      SELECT (
        (SELECT COUNT(*) FROM inventory_movements WHERE variant_id = ${variantIdN}) +
        (SELECT COUNT(*) FROM sale_items          WHERE variant_id = ${variantIdN})
      ) AS total
    `;

    if (Number(usage.total) === 0) {
      await sql`
        DELETE FROM product_variants
        WHERE id         = ${variantIdN}
          AND product_id = ${productId}
          AND user_id    = ${userId}
      `;
      return Response.json({ message: "Variante eliminada permanentemente" });
    }

    // Con historial → soft delete
    await sql`
      UPDATE product_variants SET
        is_active  = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id         = ${variantIdN}
        AND product_id = ${productId}
        AND user_id    = ${userId}
    `;

    return Response.json({ message: "Variante desactivada correctamente" });
  } catch (error) {
    console.error("DELETE /api/products/[id]/variants/[variantId]:", error);
    return createErrorResponse("Error al eliminar variante", 500);
  }
}