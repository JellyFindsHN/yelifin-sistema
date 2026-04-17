// app/api/products/[id]/variants/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const productId = Number(id);

    if (isNaN(productId)) return createErrorResponse("ID inválido", 400);

    // Verificar que el producto padre existe y pertenece al usuario
    const [product] = await sql`
      SELECT id FROM products
      WHERE id      = ${productId}
        AND user_id = ${userId}
        AND is_active = TRUE
      LIMIT 1
    `;
    if (!product) return createErrorResponse("Producto no encontrado", 404);

    const body = await request.json();
    const { variant_name, sku, attributes, price_override, image_url } = body;

    if (!variant_name || typeof variant_name !== "string" || variant_name.trim().length < 1) {
      return createErrorResponse("El nombre de la variante es requerido", 400);
    }

    if (price_override !== undefined && price_override !== null) {
      if (isNaN(Number(price_override)) || Number(price_override) < 0) {
        return createErrorResponse("El precio debe ser un número mayor o igual a 0", 400);
      }
    }

    // Verificar SKU duplicado en variantes del mismo usuario
    if (sku) {
      const [skuConflict] = await sql`
        SELECT id FROM product_variants
        WHERE user_id = ${userId}
          AND sku     = ${sku}
        LIMIT 1
      `;
      if (skuConflict) {
        return createErrorResponse("Ya existe una variante con este SKU", 409);
      }
    }

    const [variant] = await sql`
      INSERT INTO product_variants (
        user_id,
        product_id,
        variant_name,
        sku,
        attributes,
        price_override,
        image_url
      )
      VALUES (
        ${userId},
        ${productId},
        ${variant_name.trim()},
        ${sku            ?? null},
        ${attributes     ? JSON.stringify(attributes) : null},
        ${price_override !== undefined && price_override !== null
            ? Number(price_override)
            : null},
        ${image_url      ?? null}
      )
      RETURNING *
    `;

    return Response.json({ data: variant }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products/[id]/variants:", error);
    return createErrorResponse("Error al crear variante", 500);
  }
}