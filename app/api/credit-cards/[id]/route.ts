// app/api/credit-cards/[id]/route.ts
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

    const [card] = await sql`
      SELECT
        id, name, last_four, credit_limit,
        statement_closing_day, payment_due_day,
        balance, balance_usd, is_active, created_at, updated_at
      FROM credit_cards
      WHERE id = ${Number(id)} AND user_id = ${userId}
    `;

    if (!card) return createErrorResponse("Tarjeta no encontrada", 404);

    // Compute current billing-cycle start based on statement_closing_day
    const closingDay = card.statement_closing_day as number | null;
    let cycleStart: Date;
    const now = new Date();
    if (!closingDay) {
      cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (now.getDate() >= closingDay) {
      cycleStart = new Date(now.getFullYear(), now.getMonth(), closingDay);
    } else {
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, closingDay);
    }

    const [stmtTotals] = await sql`
      SELECT
        COALESCE(SUM(
          CASE WHEN type = 'CHARGE'
            THEN COALESCE(amount_local, CASE WHEN currency != 'USD' THEN amount ELSE 0 END)
          ELSE 0 END
        ), 0) AS statement_balance_local,
        COALESCE(SUM(
          CASE WHEN type = 'CHARGE' AND currency = 'USD' THEN amount ELSE 0 END
        ), 0) AS statement_balance_usd
      FROM credit_card_transactions
      WHERE credit_card_id = ${Number(id)}
        AND user_id      = ${userId}
        AND occurred_at >= ${cycleStart.toISOString()}::timestamptz
    `;

    return Response.json({
      data: {
        ...card,
        statement_balance_local: Number(stmtTotals.statement_balance_local),
        statement_balance_usd:   Number(stmtTotals.statement_balance_usd),
        cycle_start:             cycleStart.toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/credit-cards/[id]:", error);
    return createErrorResponse("Error al obtener tarjeta", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const body = await request.json();

    const [existing] = await sql`
      SELECT id FROM credit_cards WHERE id = ${Number(id)} AND user_id = ${userId}
    `;
    if (!existing) return createErrorResponse("Tarjeta no encontrada", 404);

    const {
      name,
      last_four,
      credit_limit,
      statement_closing_day,
      payment_due_day,
      is_active,
    } = body;

    const [updated] = await sql`
      UPDATE credit_cards SET
        name                  = COALESCE(${name?.trim() ?? null}, name),
        last_four             = COALESCE(${last_four ?? null}, last_four),
        credit_limit          = COALESCE(${credit_limit !== undefined ? Number(credit_limit) : null}, credit_limit),
        statement_closing_day = COALESCE(${statement_closing_day ?? null}, statement_closing_day),
        payment_due_day       = COALESCE(${payment_due_day ?? null}, payment_due_day),
        is_active             = COALESCE(${is_active ?? null}, is_active),
        updated_at            = NOW()
      WHERE id = ${Number(id)} AND user_id = ${userId}
      RETURNING *
    `;

    return Response.json({ data: updated });
  } catch (error: any) {
    if (error.code === "23505")
      return createErrorResponse("Ya existe una tarjeta con ese nombre", 409);
    console.error("PATCH /api/credit-cards/[id]:", error);
    return createErrorResponse("Error al actualizar tarjeta", 500);
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
    const { id } = await params;

    const [card] = await sql`
      SELECT id, balance, balance_usd FROM credit_cards
      WHERE id = ${Number(id)} AND user_id = ${userId}
    `;
    if (!card) return createErrorResponse("Tarjeta no encontrada", 404);

    if (Number(card.balance) !== 0 || Number(card.balance_usd) !== 0)
      return createErrorResponse("No se puede eliminar una tarjeta con saldo pendiente", 400);

    // Soft delete
    await sql`
      UPDATE credit_cards SET is_active = FALSE, updated_at = NOW()
      WHERE id = ${Number(id)} AND user_id = ${userId}
    `;

    return Response.json({ message: "Tarjeta eliminada" });
  } catch (error) {
    console.error("DELETE /api/credit-cards/[id]:", error);
    return createErrorResponse("Error al eliminar tarjeta", 500);
  }
}
