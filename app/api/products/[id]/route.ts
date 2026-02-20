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
        p.*,
        COALESCE(SUM(ib.qty_available), 0) AS stock
      FROM products p
      LEFT JOIN inventory_batches ib ON ib.product_id = p.id
        AND ib.user_id = p.user_id
      WHERE p.id = ${productId}
        AND p.user_id = ${userId}
      GROUP BY p.id
    `;

    if (!product) return createErrorResponse("Producto no encontrado", 404);

    return Response.json({ data: product });

  } catch (error) {
    console.error("❌ GET /api/products/[id]:", error);
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
      WHERE id = ${productId} AND user_id = ${userId}
      LIMIT 1
    `;

    if (!existing) return createErrorResponse("Producto no encontrado", 404);

    const body = await request.json();
    const { name, description, sku, price, image_url, is_active } = body;

    if (sku) {
      const [skuConflict] = await sql`
        SELECT id FROM products
        WHERE user_id = ${userId}
          AND sku = ${sku}
          AND id != ${productId}
        LIMIT 1
      `;
      if (skuConflict) return createErrorResponse("Ya existe un producto con este SKU", 409);
    }

    const [updated] = await sql`
      UPDATE products SET
        name        = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        sku         = COALESCE(${sku ?? null}, sku),
        price       = COALESCE(${price !== undefined ? Number(price) : null}, price),
        image_url   = COALESCE(${image_url ?? null}, image_url),
        is_active   = COALESCE(${is_active !== undefined ? is_active : null}, is_active),
        updated_at  = CURRENT_TIMESTAMP
      WHERE id = ${productId}
        AND user_id = ${userId}
      RETURNING *
    `;

    return Response.json({ data: updated });

  } catch (error) {
    console.error("❌ PATCH /api/products/[id]:", error);
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
      WHERE id = ${productId} AND user_id = ${userId}
      LIMIT 1
    `;

    if (!existing) return createErrorResponse("Producto no encontrado", 404);

    await sql`
      UPDATE products SET
        is_active  = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${productId}
        AND user_id = ${userId}
    `;

    return Response.json({ message: "Producto eliminado correctamente" });

  } catch (error) {
    console.error("❌ DELETE /api/products/[id]:", error);
    return createErrorResponse("Error al eliminar producto", 500);
  }
}