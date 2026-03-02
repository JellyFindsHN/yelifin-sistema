// app/api/dashboard/route.ts
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

    const now        = new Date();
    const paramMonth = searchParams.get("month");
    const paramYear  = searchParams.get("year");

    const filterAll   = !paramMonth && !paramYear;
    const filterYear  = paramYear  ? Number(paramYear)  : now.getFullYear();
    const filterMonth = paramMonth ? Number(paramMonth) : now.getMonth() + 1;

    let startISO: string;
    let endISO:   string;
    let prevStartISO: string;
    let prevEndISO:   string;

    if (filterAll) {
      startISO     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      endISO       = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      prevStartISO = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      prevEndISO   = startISO;
    } else if (paramYear && !paramMonth) {
      startISO     = new Date(filterYear, 0, 1).toISOString();
      endISO       = new Date(filterYear + 1, 0, 1).toISOString();
      prevStartISO = new Date(filterYear - 1, 0, 1).toISOString();
      prevEndISO   = startISO;
    } else {
      startISO     = new Date(filterYear, filterMonth - 1, 1).toISOString();
      endISO       = new Date(filterYear, filterMonth, 1).toISOString();
      prevStartISO = new Date(filterYear, filterMonth - 2, 1).toISOString();
      prevEndISO   = startISO;
    }

    // ── Revenue ────────────────────────────────────────────────────────
    const [revenueThis] = await sql`
      SELECT COALESCE(SUM(total), 0) AS revenue FROM sales
      WHERE user_id = ${userId} AND sold_at >= ${startISO} AND sold_at < ${endISO}
    `;
    const [revenueLast] = await sql`
      SELECT COALESCE(SUM(total), 0) AS revenue FROM sales
      WHERE user_id = ${userId} AND sold_at >= ${prevStartISO} AND sold_at < ${prevEndISO}
    `;
    const [countThis] = await sql`
      SELECT COUNT(*)::int AS count FROM sales
      WHERE user_id = ${userId} AND sold_at >= ${startISO} AND sold_at < ${endISO}
    `;

    // ── Profit (TAX-INCLUSIVE: se resta el ISV de la venta) ────────────
    // profit = (line_total - costo) - ISV
    // El ISV está dentro del precio, no es ganancia del vendedor.
    // COALESCE(s.tax, 0) ya fue calculado server-side al crear la venta.
    const [profitThis] = await sql`
      SELECT COALESCE(SUM(si.line_total - (si.unit_cost * si.quantity)), 0)
           - COALESCE(SUM(s.tax), 0) AS profit
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.user_id = ${userId} AND s.sold_at >= ${startISO} AND s.sold_at < ${endISO}
    `;
    const [profitLast] = await sql`
      SELECT COALESCE(SUM(si.line_total - (si.unit_cost * si.quantity)), 0)
           - COALESCE(SUM(s.tax), 0) AS profit
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.user_id = ${userId} AND s.sold_at >= ${prevStartISO} AND s.sold_at < ${prevEndISO}
    `;

    // ── Customers ──────────────────────────────────────────────────────
    const [customersTotal] = await sql`
      SELECT COUNT(*)::int AS count FROM customers WHERE user_id = ${userId}
    `;
    const [customersNew] = await sql`
      SELECT COUNT(*)::int AS count FROM customers
      WHERE user_id = ${userId} AND created_at >= ${startISO} AND created_at < ${endISO}
    `;

    // ── Inventory ──────────────────────────────────────────────────────
    const [inventoryStats] = await sql`
      SELECT
        COUNT(DISTINCT p.id)::int                          AS total_products,
        COALESCE(SUM(ib.qty_available), 0)::int           AS total_units,
        COALESCE(SUM(ib.qty_available * ib.unit_cost), 0) AS total_value,
        COUNT(DISTINCT CASE WHEN COALESCE(stock.s, 0) = 0 THEN p.id END)::int AS out_of_stock,
        COUNT(DISTINCT CASE WHEN COALESCE(stock.s, 0) > 0 AND COALESCE(stock.s, 0) < 10 THEN p.id END)::int AS low_stock
      FROM products p
      LEFT JOIN inventory_batches ib ON ib.product_id = p.id AND ib.user_id = p.user_id
      LEFT JOIN (
        SELECT product_id, SUM(qty_available) AS s
        FROM inventory_batches WHERE user_id = ${userId} GROUP BY product_id
      ) stock ON stock.product_id = p.id
      WHERE p.user_id = ${userId} AND p.is_active = TRUE
    `;

    // ── Balance ────────────────────────────────────────────────────────
    const [accountsBalance] = await sql`
      SELECT COALESCE(SUM(balance), 0) AS total
      FROM accounts WHERE user_id = ${userId} AND is_active = TRUE
    `;

    // ── Sales chart ────────────────────────────────────────────────────
    const salesChart = await sql`
      SELECT
        DATE(s.sold_at)::text AS date,
        COALESCE(SUM(s.total), 0) AS revenue,
        COALESCE(SUM(si.line_total - (si.unit_cost * si.quantity)), 0)
          - COALESCE(SUM(s.tax), 0) AS profit
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id AND si.user_id = s.user_id
      WHERE s.user_id = ${userId} AND s.sold_at >= ${startISO} AND s.sold_at < ${endISO}
      GROUP BY DATE(s.sold_at)
      ORDER BY DATE(s.sold_at) ASC
    `;

    // ── Payment methods ────────────────────────────────────────────────
    const paymentMethods = await sql`
      SELECT
        COALESCE(payment_method, 'OTHER') AS method,
        COALESCE(SUM(total), 0)           AS amount
      FROM sales
      WHERE user_id = ${userId} AND sold_at >= ${startISO} AND sold_at < ${endISO}
      GROUP BY COALESCE(payment_method, 'OTHER')
      ORDER BY amount DESC
    `;

    // ── Top 5 productos ────────────────────────────────────────────────
    // Profit por producto: proporcional al ISV de la venta
    // ISV se distribuye en proporción al line_total de cada item
    const topProducts = await sql`
      SELECT
        p.id, p.name, p.image_url,
        SUM(si.quantity)::int AS units_sold,
        COALESCE(SUM(si.line_total), 0) AS revenue,
        COALESCE(SUM(
          si.line_total - (si.unit_cost * si.quantity)
          - (COALESCE(s.tax, 0) * si.line_total / NULLIF(s.subtotal - s.discount, 0))
        ), 0) AS profit
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id AND s.user_id = si.user_id
      JOIN products p ON p.id = si.product_id
      WHERE si.user_id = ${userId} AND s.sold_at >= ${startISO} AND s.sold_at < ${endISO}
      GROUP BY p.id
      ORDER BY units_sold DESC
      LIMIT 5
    `;

    // ── Últimas 5 ventas ───────────────────────────────────────────────
    const recentSales = await sql`
      SELECT
        s.id, s.sale_number, s.total, s.payment_method, s.sold_at,
        c.name AS customer_name,
        COUNT(si.id)::int AS items_count,
        COALESCE(SUM(si.line_total - (si.unit_cost * si.quantity)), 0)
          - COALESCE(s.tax, 0) AS profit
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      LEFT JOIN sale_items si ON si.sale_id = s.id AND si.user_id = s.user_id
      WHERE s.user_id = ${userId} AND s.sold_at >= ${startISO} AND s.sold_at < ${endISO}
      GROUP BY s.id, c.name
      ORDER BY s.sold_at DESC
      LIMIT 5
    `;

    // ── Low stock ──────────────────────────────────────────────────────
    const lowStock = await sql`
      SELECT
        p.id, p.name, p.sku, p.image_url,
        COALESCE(SUM(ib.qty_available), 0)::int AS stock
      FROM products p
      LEFT JOIN inventory_batches ib ON ib.product_id = p.id AND ib.user_id = p.user_id
      WHERE p.user_id = ${userId} AND p.is_active = TRUE
      GROUP BY p.id
      HAVING COALESCE(SUM(ib.qty_available), 0) < 10
      ORDER BY stock ASC
      LIMIT 5
    `;

    const revenueThisNum = Number(revenueThis?.revenue ?? 0);
    const revenueLastNum = Number(revenueLast?.revenue ?? 0);
    const profitThisNum  = Number(profitThis?.profit ?? 0);
    const profitLastNum  = Number(profitLast?.profit ?? 0);

    return Response.json({
      data: {
        period: filterAll ? null : { year: filterYear, month: paramMonth ? filterMonth : null },
        metrics: {
          revenue:         revenueThisNum,
          revenue_change:  revenueLastNum > 0 ? ((revenueThisNum - revenueLastNum) / revenueLastNum) * 100 : null,
          profit:          profitThisNum,
          profit_change:   profitLastNum  > 0 ? ((profitThisNum  - profitLastNum)  / profitLastNum)  * 100 : null,
          sales_count:     Number(countThis?.count ?? 0),
          customers_total: Number(customersTotal?.count ?? 0),
          customers_new:   Number(customersNew?.count ?? 0),
          inventory: {
            total_products: Number(inventoryStats?.total_products ?? 0),
            total_units:    Number(inventoryStats?.total_units    ?? 0),
            total_value:    Number(inventoryStats?.total_value    ?? 0),
            out_of_stock:   Number(inventoryStats?.out_of_stock   ?? 0),
            low_stock:      Number(inventoryStats?.low_stock      ?? 0),
          },
          balance: Number(accountsBalance?.total ?? 0),
        },
        sales_chart:     salesChart.map((r: any) => ({ date: r.date, revenue: Number(r.revenue), profit: Number(r.profit) })),
        payment_methods: paymentMethods.map((r: any) => ({ method: String(r.method), amount: Number(r.amount) })),
        top_products:    topProducts.map((r: any) => ({
          id: Number(r.id), name: String(r.name), image_url: r.image_url ?? null,
          units_sold: Number(r.units_sold), revenue: Number(r.revenue), profit: Number(r.profit),
        })),
        recent_sales: recentSales.map((r: any) => ({
          id: Number(r.id), sale_number: String(r.sale_number), total: Number(r.total),
          payment_method: r.payment_method ?? "OTHER", sold_at: String(r.sold_at),
          customer_name: r.customer_name ?? null, items_count: Number(r.items_count), profit: Number(r.profit),
        })),
        low_stock: lowStock.map((r: any) => ({
          id: Number(r.id), name: String(r.name), sku: r.sku ?? null,
          image_url: r.image_url ?? null, stock: Number(r.stock),
        })),
      },
    });
  } catch (error) {
    console.error("❌ GET /api/dashboard:", error);
    return createErrorResponse("Error al obtener datos del dashboard", 500);
  }
}