// app/api/reports/sales/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { searchParams } = new URL(request.url);
    const def  = defaultRange();
    const from = searchParams.get("from") ?? def.from;
    const to   = searchParams.get("to")   ?? def.to;

    // ── Resumen ────────────────────────────────────────────────────
    const [summary] = await sql`
      SELECT
        COUNT(DISTINCT s.id)::int                                              AS total_sales,
        COALESCE(SUM(s.total),    0)::float                                    AS total_revenue,
        COALESCE(SUM(s.discount), 0)::float                                    AS total_discount,
        COALESCE(SUM(si.unit_cost * si.quantity), 0)::float                   AS total_cogs,
        COALESCE(SUM(s.total) - SUM(si.unit_cost * si.quantity), 0)::float    AS gross_profit
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id AND si.user_id = ${userId}
      WHERE s.user_id = ${userId}
        AND s.status  = 'COMPLETED'
        AND s.sold_at >= ${from}::date
        AND s.sold_at <  (${to}::date + INTERVAL '1 day')
    `;

    // ── Por día ────────────────────────────────────────────────────
    const byDay = await sql`
      SELECT
        DATE(s.sold_at)::text                     AS date,
        COUNT(*)::int                             AS sales_count,
        COALESCE(SUM(s.total), 0)::float          AS revenue,
        COALESCE(SUM(s.total) - SUM(si.unit_cost * si.quantity), 0)::float AS profit
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id AND si.user_id = ${userId}
      WHERE s.user_id = ${userId}
        AND s.status  = 'COMPLETED'
        AND s.sold_at >= ${from}::date
        AND s.sold_at <  (${to}::date + INTERVAL '1 day')
      GROUP BY DATE(s.sold_at)
      ORDER BY DATE(s.sold_at)
    `;

    // ── Por producto ───────────────────────────────────────────────
    const byProduct = await sql`
      SELECT
        p.name                                                  AS product_name,
        COALESCE(p.sku, '')                                     AS sku,
        SUM(si.quantity)::int                                   AS qty_sold,
        COALESCE(SUM(si.line_total), 0)::float                 AS revenue,
        COALESCE(SUM(si.unit_cost * si.quantity), 0)::float   AS cogs,
        COALESCE(SUM(si.line_total - si.unit_cost * si.quantity), 0)::float AS profit,
        CASE
          WHEN SUM(si.line_total) > 0
          THEN ROUND(100.0 * SUM(si.line_total - si.unit_cost * si.quantity) / SUM(si.line_total), 1)
          ELSE 0
        END::float AS margin_pct
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN sales    s ON s.id = si.sale_id
      WHERE si.user_id = ${userId}
        AND s.status   = 'COMPLETED'
        AND s.sold_at  >= ${from}::date
        AND s.sold_at  <  (${to}::date + INTERVAL '1 day')
      GROUP BY p.id, p.name, p.sku
      ORDER BY revenue DESC
      LIMIT 50
    `;

    // ── Detalle ventas ─────────────────────────────────────────────
    const detail = await sql`
      SELECT
        s.sale_number,
        DATE(s.sold_at)::text                                                  AS date,
        COALESCE(c.name, 'Sin cliente')                                        AS customer,
        s.payment_method,
        COALESCE(a.name, '')                                                   AS account_name,
        COUNT(si.id)::int                                                       AS items_count,
        COALESCE(s.discount, 0)::float                                         AS discount,
        COALESCE(SUM(si.unit_cost * si.quantity), 0)::float                   AS cogs,
        s.total::float                                                          AS total,
        COALESCE(s.total - SUM(si.unit_cost * si.quantity), 0)::float         AS profit
      FROM sales s
      LEFT JOIN customers  c  ON c.id  = s.customer_id
      LEFT JOIN accounts   a  ON a.id  = s.account_id
      LEFT JOIN sale_items si ON si.sale_id = s.id AND si.user_id = ${userId}
      WHERE s.user_id = ${userId}
        AND s.status  = 'COMPLETED'
        AND s.sold_at >= ${from}::date
        AND s.sold_at <  (${to}::date + INTERVAL '1 day')
      GROUP BY s.id, s.sale_number, s.sold_at, c.name, s.payment_method, a.name, s.discount, s.total
      ORDER BY s.sold_at DESC
      LIMIT 1000
    `;

    return Response.json({ summary, byDay, byProduct, detail, from, to });
  } catch (error) {
    console.error("GET /api/reports/sales:", error);
    return createErrorResponse("Error al generar reporte de ventas", 500);
  }
}
