// app/api/products/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

// ── GET /api/products ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;

    const products = await sql`
      SELECT
        p.id,
        p.user_id,
        p.name,
        p.description,
        p.sku,
        p.barcode,
        p.price,
        p.image_url,
        p.is_active,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(ib.qty_available), 0) AS stock
      FROM products p
      LEFT JOIN inventory_batches ib
        ON ib.product_id = p.id
       AND ib.user_id = p.user_id
      WHERE p.user_id = ${userId}
        AND p.is_active = TRUE
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    return Response.json({
      data: products,
      total: products.length,
    });
  } catch (error) {
    console.error("❌ GET /api/products:", error);
    return createErrorResponse("Error al obtener productos", 500);
  }
}

// ── POST /api/products ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const body = await request.json();

    const { name, description, sku, price, image_url } = body;

    // Validaciones
    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return createErrorResponse("El nombre del producto es requerido", 400);
    }

    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return createErrorResponse(
        "El precio debe ser un número mayor o igual a 0",
        400
      );
    }

    // Verificar límite del plan (sin GROUP BY para evitar error)
    const [limitCheck] = await sql`
      SELECT
        sp.max_products,
        (
          SELECT COUNT(*)
          FROM products p
          WHERE p.user_id = us.user_id
            AND p.is_active = TRUE
        )::int AS current_count
      FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = ${userId}
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

    if (
      limitCheck &&
      limitCheck.max_products !== null &&
      Number(limitCheck.current_count) >= Number(limitCheck.max_products)
    ) {
      return createErrorResponse(
        "Has alcanzado el límite de productos para tu plan",
        403,
        true
      );
    }

    // Verificar SKU duplicado
    if (sku) {
      const [existing] = await sql`
        SELECT id
        FROM products
        WHERE user_id = ${userId}
          AND sku = ${sku}
        LIMIT 1
      `;

      if (existing) {
        return createErrorResponse("Ya existe un producto con este SKU", 409);
      }
    }

    // Crear producto (barcode queda NULL)
    const [product] = await sql`
      INSERT INTO products (user_id, name, description, sku, barcode, price, image_url)
      VALUES (
        ${userId},
        ${name.trim()},
        ${description ?? null},
        ${sku ?? null},
        ${null},
        ${Number(price)},
        ${image_url ?? null}
      )
      RETURNING *
    `;

    return Response.json({ data: product }, { status: 201 });
  } catch (error) {
    console.error("❌ POST /api/products:", error);
    return createErrorResponse("Error al crear producto", 500);
  }
}
