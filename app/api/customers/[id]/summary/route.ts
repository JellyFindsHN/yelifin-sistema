// app/api/customers/[id]/summary/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);
type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  const { userId } = auth.data;
  const { id } = await params;
  const customerId = Number(id);
  if (isNaN(customerId)) return createErrorResponse("ID inválido", 400);

  try {
    const [customer] = await sql`
      SELECT
        c.id, c.name, c.phone, c.email, c.notes,
        c.total_orders, c.total_spent, c.created_at,
        MAX(s.sold_at) AS last_purchase_at,
        CASE WHEN COUNT(s.id) > 0
          THEN ROUND((SUM(s.total) / COUNT(s.id))::numeric, 2)
          ELSE 0
        END AS avg_order_value
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id
        AND s.user_id = c.user_id
        AND s.status != 'CANCELLED'
      WHERE c.id = ${customerId} AND c.user_id = ${userId}
      GROUP BY c.id
    `;

    if (!customer) return createErrorResponse("Cliente no encontrado", 404);

    const recentSales = await sql`
      SELECT id, sale_number, total, sold_at, status, discount, shipping_cost
      FROM sales
      WHERE customer_id = ${customerId} AND user_id = ${userId}
      ORDER BY sold_at DESC
      LIMIT 6
    `;

    return Response.json({ customer, recentSales });
  } catch (error) {
    console.error("GET /api/customers/[id]/summary:", error);
    return createErrorResponse("Error al obtener resumen del cliente", 500);
  }
}
