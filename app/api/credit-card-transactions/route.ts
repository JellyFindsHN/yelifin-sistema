// app/api/credit-card-transactions/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { searchParams } = new URL(request.url);

    const month   = searchParams.get("month");
    const year    = searchParams.get("year");
    const date    = searchParams.get("date");
    const cardId  = searchParams.get("card_id");

    let startISO: string;
    let endISO: string;
    const now = new Date();

    if (date) {
      const d = new Date(`${date}T00:00:00`);
      startISO = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
      endISO   = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0).toISOString();
    } else if (year && month) {
      const y = Number(year), m = Number(month);
      startISO = new Date(y, m - 1, 1).toISOString();
      endISO   = new Date(y, m, 1).toISOString();
    } else if (year) {
      const y = Number(year);
      startISO = new Date(y, 0, 1).toISOString();
      endISO   = new Date(y + 1, 0, 1).toISOString();
    } else {
      startISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      endISO   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    }

    const rows = await sql`
      SELECT
        cct.id,
        cct.credit_card_id,
        cc.name        AS card_name,
        cc.last_four,
        cct.type,
        cct.description,
        cct.amount,
        cct.currency,
        cct.exchange_rate,
        cct.amount_local,
        cct.sale_id,
        cct.account_transaction_id,
        cct.occurred_at,
        cct.created_at,
        s.sale_number,
        a.name         AS account_name
      FROM credit_card_transactions cct
      JOIN credit_cards cc ON cc.id = cct.credit_card_id
      LEFT JOIN sales s ON s.id = cct.sale_id
      LEFT JOIN transactions t ON t.id = cct.account_transaction_id
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE cct.user_id = ${userId}
        AND cct.occurred_at >= ${startISO}::timestamptz
        AND cct.occurred_at <  ${endISO}::timestamptz
        ${cardId ? sql`AND cct.credit_card_id = ${Number(cardId)}` : sql``}
      ORDER BY cct.occurred_at DESC
      LIMIT 500
    `;

    return Response.json({ data: rows });
  } catch (error) {
    console.error("GET /api/credit-card-transactions:", error);
    return createErrorResponse("Error al obtener movimientos", 500);
  }
}
