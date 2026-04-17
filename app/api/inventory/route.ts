// app/api/inventory/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;

    // Inventario agrupado por producto con stock total y costo promedio ponderado
    const inventory = await sql`
      SELECT
        p.id             AS product_id,
        p.name           AS product_name,
        p.sku,
        p.image_url,
        p.price,

        -- Stock total (base + todas las variantes)
        COALESCE(SUM(ib.qty_available), 0)::numeric AS stock,

        -- Stock solo del producto base (variant_id IS NULL)
        COALESCE(SUM(
          CASE WHEN ib.variant_id IS NULL THEN ib.qty_available ELSE 0 END
        ), 0)::numeric AS base_stock,

        -- Costo promedio del producto base
        CASE
          WHEN SUM(CASE WHEN ib.variant_id IS NULL THEN ib.qty_available ELSE 0 END) > 0
          THEN ROUND(
            SUM(CASE WHEN ib.variant_id IS NULL THEN ib.qty_available * ib.unit_cost ELSE 0 END) /
            SUM(CASE WHEN ib.variant_id IS NULL THEN ib.qty_available ELSE 0 END), 4
          )
          ELSE 0
        END AS base_avg_unit_cost,

        -- Valor total del producto base
        ROUND(
          COALESCE(SUM(
            CASE WHEN ib.variant_id IS NULL THEN ib.qty_available * ib.unit_cost ELSE 0 END
          ), 0), 2
        ) AS base_total_value,

        -- Costo promedio y valor total sobre todo el stock
        CASE
          WHEN SUM(ib.qty_available) > 0
          THEN ROUND(
            SUM(ib.qty_available * ib.unit_cost) / SUM(ib.qty_available), 4
          )
          ELSE 0
        END AS avg_unit_cost,
        ROUND(
          COALESCE(SUM(ib.qty_available * ib.unit_cost), 0), 2
        ) AS total_value,

        -- Stock desglosado por variante
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'variant_id',    pv.id,
                'variant_name',  pv.variant_name,
                'sku',           pv.sku,
                'attributes',    pv.attributes,
                'price_override', pv.price_override,
                'image_url',     pv.image_url,
                'stock',         COALESCE(vib.stock, 0),
                'avg_unit_cost', COALESCE(vib.avg_cost, 0),
                'total_value',   COALESCE(vib.total_val, 0)
              ) ORDER BY pv.id
            ),
            '[]'::json
          )
          FROM product_variants pv
          LEFT JOIN LATERAL (
            SELECT
              SUM(qty_available)::numeric AS stock,
              CASE
                WHEN SUM(qty_available) > 0
                THEN ROUND(SUM(qty_available * unit_cost) / SUM(qty_available), 4)
                ELSE 0
              END AS avg_cost,
              ROUND(COALESCE(SUM(qty_available * unit_cost), 0), 2) AS total_val
            FROM inventory_batches
            WHERE user_id    = p.user_id
              AND product_id = p.id
              AND variant_id = pv.id
          ) vib ON TRUE
          WHERE pv.product_id = p.id
            AND pv.user_id    = p.user_id
            AND pv.is_active  = TRUE
        ) AS variants_stock

      FROM products p
      LEFT JOIN inventory_batches ib
        ON ib.product_id = p.id
       AND ib.user_id    = p.user_id
      WHERE p.user_id   = ${userId}
        AND p.is_active = TRUE
      GROUP BY p.id
      ORDER BY p.name ASC
    `;

    const physical = inventory.filter((i: any) => !i.is_service);

    const totalStock = physical.reduce((acc: number, i: any) => acc + Number(i.stock), 0);
    const totalValue = physical.reduce((acc: number, i: any) => acc + Number(i.total_value), 0);
    const lowStock   = physical.filter((i: any) => Number(i.stock) > 0 && Number(i.stock) < 10).length;
    const outOfStock = physical.filter((i: any) => Number(i.stock) === 0).length;

    return Response.json({
      data: inventory,
      stats: {
        total_products: inventory.length,
        total_physical: physical.length,
        total_stock:    totalStock,
        total_value:    totalValue,
        low_stock:      lowStock,
        out_of_stock:   outOfStock,
      },
    });

  } catch (error) {
    console.error("GET /api/inventory:", error);
    return createErrorResponse("Error al obtener inventario", 500);
  }
}