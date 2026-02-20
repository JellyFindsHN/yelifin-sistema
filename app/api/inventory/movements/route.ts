// app/api/inventory/movements/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { searchParams } = new URL(request.url);

    const date      = searchParams.get("date");       // YYYY-MM-DD (día específico)
    const month     = searchParams.get("month");      // 1-12
    const year      = searchParams.get("year");       // YYYY
    const productId = searchParams.get("product_id");

    // Calcular rango de fechas
    const now = new Date();
    let startISO: string | null = null;
    let endISO:   string | null = null;

    if (date) {
      // Día específico
      startISO = `${date}T00:00:00.000Z`;
      endISO   = `${date}T23:59:59.999Z`;
    } else if (year && month) {
      const y = Number(year), m = Number(month);
      startISO = new Date(y, m - 1, 1).toISOString();
      endISO   = new Date(y, m, 1).toISOString();
    } else if (year && !month) {
      const y = Number(year);
      startISO = new Date(y, 0, 1).toISOString();
      endISO   = new Date(y + 1, 0, 1).toISOString();
    } else {
      // Default: mes actual
      startISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      endISO   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    }

    const movements = await sql`
      SELECT
        im.id,
        im.movement_type,
        im.product_id,
        p.name       AS product_name,
        p.image_url,
        p.sku,
        im.quantity,
        im.reference_type,
        im.reference_id,
        im.notes,
        im.created_at,

        -- IN (compra)
        pbi.unit_cost_usd,
        ib.unit_cost AS unit_cost_hnl,
        CASE
          WHEN pbi.quantity > 0
          THEN ROUND(pb.shipping::numeric / NULLIF(
            (SELECT SUM(i2.quantity) FROM purchase_batch_items i2
             WHERE i2.purchase_batch_id = pb.id), 0
          ), 4)
          ELSE 0
        END AS shipping_per_unit,
        pbi.total_cost,

        -- OUT (venta)
        si.unit_price,
        si.unit_cost,
        si.line_total,
        ROUND((si.line_total - (si.unit_cost * im.quantity))::numeric, 2) AS profit,
        s.sale_number,
        c.name AS customer_name

      FROM inventory_movements im
      JOIN products p ON p.id = im.product_id

      LEFT JOIN purchase_batch_items pbi
        ON im.reference_type = 'PURCHASE'
       AND pbi.purchase_batch_id = im.reference_id
       AND pbi.product_id = im.product_id
       AND pbi.user_id = im.user_id
      LEFT JOIN purchase_batches pb ON pb.id = pbi.purchase_batch_id
      LEFT JOIN inventory_batches ib
        ON ib.purchase_batch_item_id = pbi.id
       AND ib.user_id = im.user_id

      LEFT JOIN sale_items si
        ON im.reference_type = 'SALE'
       AND si.sale_id = im.reference_id
       AND si.product_id = im.product_id
       AND si.user_id = im.user_id
      LEFT JOIN sales s ON s.id = si.sale_id
      LEFT JOIN customers c ON c.id = s.customer_id

      WHERE im.user_id = ${userId}
        AND im.created_at >= ${startISO!}::timestamptz
        AND im.created_at <  ${endISO!}::timestamptz
        ${productId ? sql`AND im.product_id = ${Number(productId)}` : sql``}

      ORDER BY im.created_at DESC
      LIMIT 500
    `;

    return Response.json({ data: movements, total: movements.length });

  } catch (error) {
    console.error("❌ GET /api/inventory/movements:", error);
    return createErrorResponse("Error al obtener movimientos", 500);
  }
}