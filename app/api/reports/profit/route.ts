// app/api/reports/profit/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

function defaultRange() {
  const now  = new Date();
  const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to   = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
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

    // ── Resumen global ─────────────────────────────────────────────
    const [summary] = await sql`
      SELECT
        COALESCE(SUM(s.total), 0)::float                                         AS revenue,
        COALESCE(SUM(si.unit_cost * si.quantity), 0)::float                     AS cogs,
        COALESCE(SUM(s.total) - SUM(si.unit_cost * si.quantity), 0)::float      AS gross_profit,
        COALESCE(SUM(s.discount), 0)::float                                      AS total_discount,
        CASE
          WHEN SUM(s.total) > 0
          THEN ROUND(100.0 * (SUM(s.total) - SUM(si.unit_cost * si.quantity)) / SUM(s.total), 1)::float
          ELSE 0
        END                                                                       AS margin_pct,
        COUNT(DISTINCT s.id)::int                                                AS total_sales
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id AND si.user_id = ${userId}
      WHERE s.user_id = ${userId}
        AND s.status  = 'COMPLETED'
        AND s.sold_at >= ${from}::date
        AND s.sold_at <  (${to}::date + INTERVAL '1 day')
    `;

    // ── Por mes ────────────────────────────────────────────────────
    const byMonth = await sql`
      SELECT
        TO_CHAR(s.sold_at, 'YYYY-MM')                                           AS month,
        TO_CHAR(s.sold_at, 'Mon YYYY')                                          AS month_label,
        COALESCE(SUM(s.total), 0)::float                                        AS revenue,
        COALESCE(SUM(si.unit_cost * si.quantity), 0)::float                    AS cogs,
        COALESCE(SUM(s.total) - SUM(si.unit_cost * si.quantity), 0)::float     AS profit,
        COUNT(DISTINCT s.id)::int                                               AS sales_count
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id AND si.user_id = ${userId}
      WHERE s.user_id = ${userId}
        AND s.status  = 'COMPLETED'
        AND s.sold_at >= ${from}::date
        AND s.sold_at <  (${to}::date + INTERVAL '1 day')
      GROUP BY TO_CHAR(s.sold_at, 'YYYY-MM'), TO_CHAR(s.sold_at, 'Mon YYYY')
      ORDER BY month
    `;

    // ── Por producto ───────────────────────────────────────────────
    const byProduct = await sql`
      SELECT
        p.name                                                                   AS product_name,
        COALESCE(p.sku, '')                                                      AS sku,
        SUM(si.quantity)::int                                                    AS qty_sold,
        COALESCE(SUM(si.line_total), 0)::float                                  AS revenue,
        COALESCE(SUM(si.unit_cost * si.quantity), 0)::float                    AS cogs,
        COALESCE(SUM(si.line_total - si.unit_cost * si.quantity), 0)::float    AS profit,
        CASE
          WHEN SUM(si.line_total) > 0
          THEN ROUND(100.0 * SUM(si.line_total - si.unit_cost * si.quantity) / SUM(si.line_total), 1)::float
          ELSE 0
        END AS margin_pct
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN sales    s ON s.id = si.sale_id
      WHERE si.user_id = ${userId}
        AND s.status   = 'COMPLETED'
        AND s.sold_at  >= ${from}::date
        AND s.sold_at  <  (${to}::date + INTERVAL '1 day')
      GROUP BY p.id, p.name, p.sku
      ORDER BY profit DESC
      LIMIT 50
    `;

    // ── Gastos del período (transacciones tipo EXPENSE) ────────────
    const [expenses] = await sql`
      SELECT COALESCE(SUM(amount), 0)::float AS total_expenses
      FROM transactions
      WHERE user_id   = ${userId}
        AND type      = 'EXPENSE'
        AND occurred_at >= ${from}::date
        AND occurred_at <  (${to}::date + INTERVAL '1 day')
    `;

    return Response.json({ summary, byMonth, byProduct, expenses, from, to });
  } catch (error) {
    console.error("GET /api/reports/profit:", error);
    return createErrorResponse("Error al generar reporte de rentabilidad", 500);
  }
}
