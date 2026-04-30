// app/api/customers/loyalty/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  const { userId } = auth.data;
  try {
    const policies = await sql`
      SELECT * FROM loyalty_policies
      WHERE user_id = ${userId}
      ORDER BY sort_order ASC, created_at ASC
    `;
    return Response.json({ data: policies });
  } catch (error) {
    console.error("GET /api/customers/loyalty:", error);
    return createErrorResponse("Error al obtener políticas", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  const { userId } = auth.data;
  try {
    const { tier_name, color, min_orders, min_spent, discount_pct, sort_order } = await request.json();

    if (!tier_name?.trim()) return createErrorResponse("El nombre del nivel es requerido", 400);
    if (discount_pct === undefined || Number(discount_pct) < 0 || Number(discount_pct) > 100)
      return createErrorResponse("El descuento debe estar entre 0 y 100", 400);
    if (min_orders == null && min_spent == null)
      return createErrorResponse("Debe definir al menos una condición (órdenes o monto)", 400);

    const [policy] = await sql`
      INSERT INTO loyalty_policies (user_id, tier_name, color, min_orders, min_spent, discount_pct, sort_order)
      VALUES (
        ${userId},
        ${tier_name.trim()},
        ${color ?? "amber"},
        ${min_orders != null ? Number(min_orders) : null},
        ${min_spent  != null ? Number(min_spent)  : null},
        ${Number(discount_pct)},
        ${Number(sort_order ?? 0)}
      )
      RETURNING *
    `;
    return Response.json({ data: policy }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") return createErrorResponse("Ya existe un nivel con ese nombre", 400);
    console.error("POST /api/customers/loyalty:", error);
    return createErrorResponse("Error al crear política", 500);
  }
}
