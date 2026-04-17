// app/api/products/[id]/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ id: string }> };

// ── GET /api/products/[id] ─────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const productId = Number(id);

    if (isNaN(productId)) return createErrorResponse("ID inválido", 400);

    const [product] = await sql`
      SELECT
        p.id,
        p.user_id,
        p.name,
        p.description,
        p.is_service,
        p.sku,
        p.barcode,
        p.price,
        p.image_url,
        p.is_active,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(ib.qty_available), 0) AS stock,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id',             pv.id,
                'variant_name',   pv.variant_name,
                'sku',            pv.sku,
                'attributes',     pv.attributes,
                'price_override', pv.price_override,
                'image_url',      pv.image_url,
                'is_active',      pv.is_active,
                'created_at',     pv.created_at,
                'updated_at',     pv.updated_at
              ) ORDER BY pv.id
            ),
            '[]'::json
          )
          FROM product_variants pv
          WHERE pv.product_id = p.id
            AND pv.user_id    = p.user_id
            AND pv.is_active  = TRUE
        ) AS variants
      FROM products p
      LEFT JOIN inventory_batches ib
        ON ib.product_id = p.id
       AND ib.user_id    = p.user_id
      WHERE p.id       = ${productId}
        AND p.user_id  = ${userId}
      GROUP BY p.id
    `;

    if (!product) return createErrorResponse("Producto no encontrado", 404);

    return Response.json({ data: product });
  } catch (error) {
    console.error("GET /api/products/[id]:", error);
    return createErrorResponse("Error al obtener producto", 500);
  }
}

// ── PATCH /api/products/[id] ───────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const productId = Number(id);

    if (isNaN(productId)) return createErrorResponse("ID inválido", 400);

    const [existing] = await sql`
      SELECT id FROM products
      WHERE id      = ${productId}
        AND user_id = ${userId}
      LIMIT 1
    `;
    if (!existing) return createErrorResponse("Producto no encontrado", 404);

    const body = await request.json();
    const { name, description, sku, price, image_url, is_active, is_service } = body;

    // Verificar SKU duplicado (excluyendo el mismo registro)
    if (sku) {
      const [skuConflict] = await sql`
        SELECT id FROM products
        WHERE user_id = ${userId}
          AND sku     = ${sku}
          AND id     != ${productId}
        LIMIT 1
      `;
      if (skuConflict) {
        return createErrorResponse("Ya existe un producto con este SKU", 409);
      }
    }

    const [updated] = await sql`
      UPDATE products SET
        name        = COALESCE(${name       ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        sku         = COALESCE(${sku        ?? null}, sku),
        price       = COALESCE(${price      !== undefined ? Number(price) : null}, price),
        image_url   = COALESCE(${image_url  ?? null}, image_url),
        is_active   = COALESCE(${is_active  !== undefined ? is_active   : null}, is_active),
        is_service  = COALESCE(${is_service !== undefined ? is_service  : null}, is_service),
        updated_at  = CURRENT_TIMESTAMP
      WHERE id      = ${productId}
        AND user_id = ${userId}
      RETURNING *
    `;

    return Response.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/products/[id]:", error);
    return createErrorResponse("Error al actualizar producto", 500);
  }
}

// ── DELETE /api/products/[id] ──────────────────────────────────────────
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const productId = Number(id);

    if (isNaN(productId)) return createErrorResponse("ID inválido", 400);

    const [existing] = await sql`
      SELECT id FROM products
      WHERE id      = ${productId}
        AND user_id = ${userId}
      LIMIT 1
    `;
    if (!existing) return createErrorResponse("Producto no encontrado", 404);

    const [usage] = await sql`
      SELECT (
        (SELECT COUNT(*) FROM inventory_movements WHERE product_id = ${productId}) +
        (SELECT COUNT(*) FROM sale_items          WHERE product_id = ${productId})
      ) AS total
    `;

    if (Number(usage.total) === 0) {
      await sql`DELETE FROM products WHERE id = ${productId} AND user_id = ${userId}`;
      return Response.json({ message: "Producto eliminado permanentemente" });
    }

    await sql`
      UPDATE products SET
        is_active  = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id      = ${productId}
        AND user_id = ${userId}
    `;

    return Response.json({ message: "Producto desactivado correctamente" });
  } catch (error) {
    console.error("DELETE /api/products/[id]:", error);
    return createErrorResponse("Error al eliminar producto", 500);
  }
}