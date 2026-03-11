// app/api/transaction-categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const categories = type
      ? await sql`
          SELECT id, name, type, is_active
          FROM transaction_categories
          WHERE user_id = ${userId} AND type = ${type}
          ORDER BY type, name
        `
      : await sql`
          SELECT id, name, type, is_active
          FROM transaction_categories
          WHERE user_id = ${userId}
          ORDER BY type, name
        `;
    console.log("Categorías obtenidas:", categories);
    return Response.json(categories);
  } catch (error: any) {
    console.error("❌ GET /api/transaction-categories:", error);
    return createErrorResponse("Error al obtener categorías", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { name, type } = await request.json();

    if (!name || !type) {
      return createErrorResponse("Nombre y tipo son requeridos", 400);
    }

    const [category] = await sql`
      INSERT INTO transaction_categories (user_id, name, type)
      VALUES (${userId}, ${name}, ${type})
      RETURNING *
    `;

    return Response.json(category, { status: 201 });
  } catch (error: any) {
    if (error.code === "23505") {
      return createErrorResponse(
        "Ya existe una categoría con ese nombre para este tipo",
        409
      );
    }
    console.error("❌ POST /api/transaction-categories:", error);
    return createErrorResponse("Error al crear categoría", 500);
  }
}