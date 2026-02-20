// app/api/customers/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;

    const customers = await sql`
      SELECT id, name, phone, email, notes, total_orders, total_spent, created_at
      FROM customers
      WHERE user_id = ${userId}
      ORDER BY name ASC
    `;

    return Response.json({ data: customers, total: customers.length });

  } catch (error) {
    console.error("❌ GET /api/customers:", error);
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
    console.error("❌ POST /api/customers:", error);
    return createErrorResponse("Error al crear cliente", 500);
  }
}