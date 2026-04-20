// app/api/credit-cards/[id]/transactions/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const now = new Date();

    let startISO: string;
    let endISO: string;

    if (year && month) {
      const y = Number(year), m = Number(month);
      startISO = new Date(y, m - 1, 1).toISOString();
      endISO = new Date(y, m, 1).toISOString();
    } else if (year) {
      const y = Number(year);
      startISO = new Date(y, 0, 1).toISOString();
      endISO = new Date(y + 1, 0, 1).toISOString();
    } else {
      startISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      endISO = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    }

    const [card] = await sql`
      SELECT id FROM credit_cards WHERE id = ${Number(id)} AND user_id = ${userId}
    `;
    if (!card) return createErrorResponse("Tarjeta no encontrada", 404);

    const transactions = await sql`
      SELECT
        cct.id,
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
        a.name AS account_name
      FROM credit_card_transactions cct
      LEFT JOIN sales s ON s.id = cct.sale_id
      LEFT JOIN transactions t ON t.id = cct.account_transaction_id
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE cct.credit_card_id = ${Number(id)}
        AND cct.user_id = ${userId}
        AND cct.occurred_at >= ${startISO}::timestamptz
        AND cct.occurred_at <  ${endISO}::timestamptz
      ORDER BY cct.occurred_at DESC
      LIMIT 500
    `;

    const [totals] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'CHARGE'  AND currency != 'USD' THEN amount ELSE 0 END), 0) AS total_charges_local,
        COALESCE(SUM(CASE WHEN type = 'CHARGE'  AND currency = 'USD'  THEN amount ELSE 0 END), 0) AS total_charges_usd,
        COALESCE(SUM(CASE WHEN type = 'PAYMENT' AND currency != 'USD' THEN amount ELSE 0 END), 0) AS total_payments_local,
        COALESCE(SUM(CASE WHEN type = 'PAYMENT' AND currency = 'USD'  THEN amount ELSE 0 END), 0) AS total_payments_usd,
        COUNT(*)::int AS total_count
      FROM credit_card_transactions
      WHERE credit_card_id = ${Number(id)}
        AND user_id = ${userId}
        AND occurred_at >= ${startISO}::timestamptz
        AND occurred_at <  ${endISO}::timestamptz
    `;

    return Response.json({
      data: transactions,
      totals: {
        charges_local: Number(totals.total_charges_local),
        charges_usd: Number(totals.total_charges_usd),
        payments_local: Number(totals.total_payments_local),
        payments_usd: Number(totals.total_payments_usd),
        count: Number(totals.total_count),
      },
    });
  } catch (error) {
    console.error("GET /api/credit-cards/[id]/transactions:", error);
    return createErrorResponse("Error al obtener movimientos", 500);
  }
}
