// app/api/customers/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId }       = auth.data;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || null;
    const page   = Math.max(1, Number(searchParams.get("page"))  || 1);
    const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25));
    const offset = (page - 1) * limit;

    // ── Stats globales (sin filtro de búsqueda) ───────────────────────
    const [statsRow] = await sql`
      SELECT
        COUNT(*)::int                                  AS total_customers,
        COALESCE(SUM(total_spent),  0)::numeric        AS total_spent,
        COALESCE(SUM(total_orders), 0)::int            AS total_orders
      FROM customers
      WHERE user_id = ${userId}
    `;

    // ── Count para paginación ─────────────────────────────────────────
    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count
      FROM customers
      WHERE user_id = ${userId}
        AND (
          ${search}::text IS NULL OR
          name  ILIKE ${'%' + (search ?? '') + '%'} OR
          email ILIKE ${'%' + (search ?? '') + '%'} OR
          phone ILIKE ${'%' + (search ?? '') + '%'}
        )
    `;

    const totalPages = Math.max(1, Math.ceil(count / limit));

    // ── Data paginada ─────────────────────────────────────────────────
    const customers = await sql`
      SELECT id, name, phone, email, notes, total_orders, total_spent, created_at
      FROM customers
      WHERE user_id = ${userId}
        AND (
          ${search}::text IS NULL OR
          name  ILIKE ${'%' + (search ?? '') + '%'} OR
          email ILIKE ${'%' + (search ?? '') + '%'} OR
          phone ILIKE ${'%' + (search ?? '') + '%'}
        )
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return Response.json({
      data:       customers,
      total:      count,
      page,
      totalPages,
      limit,
      stats: {
        total_customers: statsRow.total_customers,
        total_spent:     Number(statsRow.total_spent),
        total_orders:    statsRow.total_orders,
      },
    });

  } catch (error) {
    console.error(" GET /api/customers:", error);
    return createErrorResponse("Error al obtener clientes", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { name, phone, email, notes } = await request.json();

    if (!name) return createErrorResponse("El nombre es requerido", 400);

    const [customer] = await sql`
      INSERT INTO customers (user_id, name, phone, email, notes)
      VALUES (${userId}, ${name}, ${phone ?? null}, ${email ?? null}, ${notes ?? null})
      RETURNING *
    `;

    return Response.json({ data: customer }, { status: 201 });

  } catch (error) {
    console.error(" POST /api/customers:", error);
    return createErrorResponse("Error al crear cliente", 500);
  }
}