// app/api/accounts/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;

    const accounts = await sql`
      SELECT id, name, type, balance, is_active, created_at
      FROM accounts
      WHERE user_id = ${userId} AND is_active = TRUE
      ORDER BY name ASC
    `;

    return Response.json({ data: accounts, total: accounts.length });

  } catch (error) {
    console.error("❌ GET /api/accounts:", error);
    return createErrorResponse("Error al obtener cuentas", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { name, type, balance } = await request.json();

    if (!name) return createErrorResponse("El nombre es requerido", 400);
    if (!type) return createErrorResponse("El tipo es requerido", 400);

    const [account] = await sql`
      INSERT INTO accounts (user_id, name, type, balance)
      VALUES (${userId}, ${name}, ${type}, ${Number(balance) || 0})
      RETURNING *
    `;

    return Response.json({ data: account }, { status: 201 });

  } catch (error: any) {
    if (error.code === "23505")
      return createErrorResponse("Ya existe una cuenta con ese nombre", 409);
    console.error("❌ POST /api/accounts:", error);
    return createErrorResponse("Error al crear cuenta", 500);
  }
}