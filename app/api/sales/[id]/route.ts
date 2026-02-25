// app/api/sales/[id]/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ id: string }> };

// ── GET /api/sales/[id] ────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const saleId = Number(id);

    if (isNaN(saleId)) return createErrorResponse("ID inválido", 400);

    const [sale] = await sql`
      SELECT
        s.*,
        c.name AS customer_name,
        a.name AS account_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      LEFT JOIN accounts a ON a.id = s.account_id
      WHERE s.id = ${saleId} AND s.user_id = ${userId}
    `;

    if (!sale) return createErrorResponse("Venta no encontrada", 404);

    const items = await sql`
      SELECT
        si.*,
        p.name AS product_name,
        p.image_url
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = ${saleId} AND si.user_id = ${userId}
    `;

    const supplies = await sql`
      SELECT
        ss.id,
        ss.supply_id,
        su.name AS supply_name,
        ss.quantity,
        ss.unit_cost,
        ss.line_total
      FROM sale_supplies ss
      JOIN supplies su ON su.id = ss.supply_id
      WHERE ss.sale_id = ${saleId} AND ss.user_id = ${userId}
    `;

    return Response.json({ data: { ...sale, items, supplies } });

  } catch (error) {
    console.error("❌ GET /api/sales/[id]:", error);
    return createErrorResponse("Error al obtener venta", 500);
  }
}