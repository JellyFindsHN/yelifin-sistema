// app/api/accounts/[id]/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const accountId = Number(id);

    if (isNaN(accountId)) return createErrorResponse("ID inválido", 400);

    const { name, type, is_active } = await request.json();

    const [updated] = await sql`
      UPDATE accounts SET
        name      = COALESCE(${name ?? null}, name),
        type      = COALESCE(${type ?? null}, type),
        is_active = COALESCE(${is_active !== undefined ? is_active : null}, is_active)
      WHERE id = ${accountId} AND user_id = ${userId}
      RETURNING *
    `;

    if (!updated) return createErrorResponse("Cuenta no encontrada", 404);

    return Response.json({ data: updated });

  } catch (error) {
    console.error("❌ PATCH /api/accounts/[id]:", error);
    return createErrorResponse("Error al actualizar cuenta", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const accountId = Number(id);

    if (isNaN(accountId)) return createErrorResponse("ID inválido", 400);

    await sql`
      UPDATE accounts SET is_active = FALSE
      WHERE id = ${accountId} AND user_id = ${userId}
    `;

    return Response.json({ message: "Cuenta eliminada correctamente" });

  } catch (error) {
    console.error("❌ DELETE /api/accounts/[id]:", error);
    return createErrorResponse("Error al eliminar cuenta", 500);
  }
}