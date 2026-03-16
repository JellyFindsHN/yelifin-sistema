// app/api/transaction-categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params; // ← Await params
    const { name, is_active } = await request.json();

    let category;
    if (name !== undefined && is_active !== undefined) {
      [category] = await sql`
        UPDATE transaction_categories
        SET name = ${name}, is_active = ${is_active}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
    } else if (name !== undefined) {
      [category] = await sql`
        UPDATE transaction_categories
        SET name = ${name}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
    } else if (is_active !== undefined) {
      [category] = await sql`
        UPDATE transaction_categories
        SET is_active = ${is_active}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
    }

    if (!category) {
      return createErrorResponse("Categoría no encontrada", 404);
    }

    return Response.json(category);
  } catch (error: any) {
    console.error(" PATCH /api/transaction-categories/[id]:", error);
    return createErrorResponse("Error al actualizar categoría", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params; // ← Await params

    const [category] = await sql`
      UPDATE transaction_categories
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (!category) {
      return createErrorResponse("Categoría no encontrada", 404);
    }

    return Response.json({ success: true });
  } catch (error: any) {
    console.error(" DELETE /api/transaction-categories/[id]:", error);
    return createErrorResponse("Error al eliminar categoría", 500);
  }
}