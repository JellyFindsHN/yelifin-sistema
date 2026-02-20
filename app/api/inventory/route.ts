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
        COALESCE(SUM(ib.qty_available), 0)::int                          AS stock,
        CASE
          WHEN SUM(ib.qty_available) > 0
          THEN ROUND(
            SUM(ib.qty_available * ib.unit_cost) / SUM(ib.qty_available), 4
          )
          ELSE 0
        END                                                               AS avg_unit_cost,
        ROUND(
          COALESCE(SUM(ib.qty_available * ib.unit_cost), 0), 2
        )                                                                 AS total_value
      FROM products p
      LEFT JOIN inventory_batches ib
        ON ib.product_id = p.id
       AND ib.user_id    = p.user_id
      WHERE p.user_id   = ${userId}
        AND p.is_active = TRUE
      GROUP BY p.id
      ORDER BY p.name ASC
    `;

    // Estadísticas globales
    const totalStock = inventory.reduce((acc: number, i: any) => acc + Number(i.stock), 0);
    const totalValue = inventory.reduce((acc: number, i: any) => acc + Number(i.total_value), 0);
    const lowStock = inventory.filter((i: any) => Number(i.stock) > 0 && Number(i.stock) < 10).length;
    const outOfStock = inventory.filter((i: any) => Number(i.stock) === 0).length;

    return Response.json({
      data: inventory,
      stats: {
        total_products: inventory.length,
        total_stock: totalStock,
        total_value: totalValue,
        low_stock: lowStock,
        out_of_stock: outOfStock,
      },
    });

  } catch (error) {
    console.error("❌ GET /api/inventory:", error);
    return createErrorResponse("Error al obtener inventario", 500);
  }
}