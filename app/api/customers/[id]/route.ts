// app/api/customers/[id]/route.ts
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
    const customerId = Number(id);

    if (isNaN(customerId)) return createErrorResponse("ID inválido", 400);

    const { name, phone, email, notes } = await request.json();

    const [updated] = await sql`
      UPDATE customers SET
        name  = COALESCE(${name ?? null}, name),
        phone = COALESCE(${phone ?? null}, phone),
        email = COALESCE(${email ?? null}, email),
        notes = COALESCE(${notes ?? null}, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${customerId} AND user_id = ${userId}
      RETURNING *
    `;

    if (!updated) return createErrorResponse("Cliente no encontrado", 404);

    return Response.json({ data: updated });

  } catch (error) {
    console.error("❌ PATCH /api/customers/[id]:", error);
    return createErrorResponse("Error al actualizar cliente", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const customerId = Number(id);

    if (isNaN(customerId)) return createErrorResponse("ID inválido", 400);

    await sql`
      DELETE FROM customers
      WHERE id = ${customerId} AND user_id = ${userId}
    `;

    return Response.json({ message: "Cliente eliminado correctamente" });

  } catch (error) {
    console.error("❌ DELETE /api/customers/[id]:", error);
    return createErrorResponse("Error al eliminar cliente", 500);
  }
}