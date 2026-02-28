// app/api/events/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

// ── GET /api/events ────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;

    const rows = await sql`
      SELECT
        e.id,
        e.name,
        e.location,
        e.starts_at,
        e.ends_at,
        e.fixed_cost,
        e.notes,
        e.created_at,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'),  0) AS total_sales,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE'), 0) AS total_tx_expenses
      FROM events e
      LEFT JOIN transactions t
        ON  t.reference_type = 'EVENT'
        AND t.reference_id   = e.id
        AND t.user_id        = e.user_id
      WHERE e.user_id = ${userId}
      GROUP BY e.id
      ORDER BY e.starts_at DESC
    `;

    const now = new Date();

    const events = rows.map((e) => {
      const start         = new Date(e.starts_at);
      const end           = new Date(e.ends_at);
      const totalSales    = Number(e.total_sales);
      const fixedCost     = Number(e.fixed_cost);
      const txExpenses    = Number(e.total_tx_expenses);
      const totalExpenses = fixedCost + txExpenses;
      const netProfit     = totalSales - totalExpenses;

      const status =
        now < start  ? "PLANNED" :
        now <= end   ? "ACTIVE"  : "COMPLETED";

      return {
        id:             e.id,
        name:           e.name,
        location:       e.location,
        starts_at:      e.starts_at,
        ends_at:        e.ends_at,
        fixed_cost:     fixedCost,
        notes:          e.notes,
        created_at:     e.created_at,
        status,
        total_sales:    totalSales,
        total_expenses: totalExpenses,
        net_profit:     netProfit,
        roi:            totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : 0,
      };
    });

    return Response.json({ data: events, total: events.length });

  } catch (error) {
    console.error("❌ GET /api/events:", error);
    return createErrorResponse("Error al obtener eventos", 500);
  }
}

// ── POST /api/events ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { name, location, starts_at, ends_at, fixed_cost = 0, notes } = await request.json();

    if (!name?.trim())
      return createErrorResponse("El nombre es requerido", 400);
    if (!starts_at)
      return createErrorResponse("La fecha inicio es requerida", 400);
    if (!ends_at)
      return createErrorResponse("La fecha fin es requerida", 400);
    if (new Date(starts_at) > new Date(ends_at))
      return createErrorResponse("La fecha inicio debe ser antes que la fecha fin", 400);

    const [event] = await sql`
      INSERT INTO events (user_id, name, location, starts_at, ends_at, fixed_cost, notes)
      VALUES (
        ${userId},
        ${name.trim()},
        ${location?.trim() || null},
        ${starts_at},
        ${ends_at},
        ${fixed_cost},
        ${notes?.trim() || null}
      )
      RETURNING *
    `;

    return Response.json({ data: event }, { status: 201 });

  } catch (error) {
    console.error("❌ POST /api/events:", error);
    return createErrorResponse("Error al crear evento", 500);
  }
}