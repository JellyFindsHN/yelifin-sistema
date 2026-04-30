// app/api/customers/loyalty/[id]/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);
type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  const { userId } = auth.data;
  const { id } = await params;
  const policyId = Number(id);
  if (isNaN(policyId)) return createErrorResponse("ID inválido", 400);

  try {
    const { tier_name, color, min_orders, min_spent, discount_pct, is_active, sort_order } = await request.json();

    if (!tier_name?.trim()) return createErrorResponse("El nombre del nivel es requerido", 400);
    if (Number(discount_pct) < 0 || Number(discount_pct) > 100)
      return createErrorResponse("El descuento debe estar entre 0 y 100", 400);

    const [updated] = await sql`
      UPDATE loyalty_policies SET
        tier_name    = ${tier_name.trim()},
        color        = ${color ?? "amber"},
        min_orders   = ${min_orders  != null ? Number(min_orders)  : null},
        min_spent    = ${min_spent   != null ? Number(min_spent)   : null},
        discount_pct = ${Number(discount_pct)},
        is_active    = ${is_active  !== undefined ? Boolean(is_active) : true},
        sort_order   = ${Number(sort_order ?? 0)},
        updated_at   = NOW()
      WHERE id = ${policyId} AND user_id = ${userId}
      RETURNING *
    `;

    if (!updated) return createErrorResponse("Política no encontrada", 404);
    return Response.json({ data: updated });
  } catch (error: any) {
    if (error?.code === "23505") return createErrorResponse("Ya existe un nivel con ese nombre", 400);
    console.error("PATCH /api/customers/loyalty/[id]:", error);
    return createErrorResponse("Error al actualizar política", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  const { userId } = auth.data;
  const { id } = await params;
  const policyId = Number(id);
  if (isNaN(policyId)) return createErrorResponse("ID inválido", 400);

  try {
    await sql`DELETE FROM loyalty_policies WHERE id = ${policyId} AND user_id = ${userId}`;
    return Response.json({ message: "Política eliminada" });
  } catch (error) {
    console.error("DELETE /api/customers/loyalty/[id]:", error);
    return createErrorResponse("Error al eliminar política", 500);
  }
}
