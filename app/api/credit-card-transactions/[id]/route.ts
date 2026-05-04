import { NextRequest } from "next/server";
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
    const { id } = await params;
    const txId = Number(id);
    const body = await request.json();
    const { description, category, occurred_at, amount, currency, exchange_rate } = body;

    // Fetch existing transaction
    const [existing] = await sql`
      SELECT id, type, amount, currency, exchange_rate, amount_local, sale_id, credit_card_id
      FROM credit_card_transactions
      WHERE id = ${txId} AND user_id = ${userId}
    `;
    if (!existing) return createErrorResponse("Transacción no encontrada", 404);
    if (existing.type !== "CHARGE" || existing.sale_id !== null) {
      return createErrorResponse("Esta transacción no se puede editar", 403);
    }

    // Resolve new values
    const newAmount      = amount !== undefined ? Number(amount) : Number(existing.amount);
    const newCurrency    = currency ?? existing.currency;
    const oldAmount      = Number(existing.amount);
    const oldCurrency    = existing.currency;
    const newExchangeRate =
      exchange_rate !== undefined ? Number(exchange_rate) : Number(existing.exchange_rate ?? 1);
    const newAmountLocal =
      newCurrency === "USD" ? newAmount * newExchangeRate : newAmount;

    // Revert old balance impact
    if (oldCurrency === "USD") {
      await sql`
        UPDATE credit_cards
        SET balance_usd = balance_usd - ${oldAmount}
        WHERE id = ${existing.credit_card_id} AND user_id = ${userId}
      `;
    } else {
      await sql`
        UPDATE credit_cards
        SET balance = balance - ${oldAmount}
        WHERE id = ${existing.credit_card_id} AND user_id = ${userId}
      `;
    }

    // Apply new balance impact
    if (newCurrency === "USD") {
      await sql`
        UPDATE credit_cards
        SET balance_usd = balance_usd + ${newAmount}
        WHERE id = ${existing.credit_card_id} AND user_id = ${userId}
      `;
    } else {
      await sql`
        UPDATE credit_cards
        SET balance = balance + ${newAmount}
        WHERE id = ${existing.credit_card_id} AND user_id = ${userId}
      `;
    }

    // Resolve category: undefined means "do not change", null/string means set it
    const categoryVal: string | null =
      category !== undefined ? (category?.trim() || null) : existing.category;

    const [updated] = await sql`
      UPDATE credit_card_transactions SET
        description   = COALESCE(${description !== undefined ? description?.trim() || null : null}, description),
        category      = ${categoryVal},
        occurred_at   = COALESCE(${occurred_at ?? null}, occurred_at),
        amount        = ${newAmount},
        currency      = ${newCurrency},
        exchange_rate = ${newCurrency === "USD" ? newExchangeRate : null},
        amount_local  = ${newAmountLocal}
      WHERE id = ${txId} AND user_id = ${userId}
      RETURNING *
    `;

    return Response.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/credit-card-transactions/[id]:", error);
    return createErrorResponse("Error al actualizar transacción", 500);
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
    const txId = Number(id);

    const [existing] = await sql`
      SELECT id, type, amount, currency, credit_card_id, sale_id
      FROM credit_card_transactions
      WHERE id = ${txId} AND user_id = ${userId}
    `;
    if (!existing) return createErrorResponse("Transacción no encontrada", 404);
    if (existing.type !== "CHARGE" || existing.sale_id !== null) {
      return createErrorResponse("Esta transacción no se puede eliminar", 403);
    }

    // Revert balance
    if (existing.currency === "USD") {
      await sql`
        UPDATE credit_cards
        SET balance_usd = balance_usd - ${Number(existing.amount)}
        WHERE id = ${existing.credit_card_id} AND user_id = ${userId}
      `;
    } else {
      await sql`
        UPDATE credit_cards
        SET balance = balance - ${Number(existing.amount)}
        WHERE id = ${existing.credit_card_id} AND user_id = ${userId}
      `;
    }

    await sql`
      DELETE FROM credit_card_transactions
      WHERE id = ${txId} AND user_id = ${userId}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/credit-card-transactions/[id]:", error);
    return createErrorResponse("Error al eliminar transacción", 500);
  }
}
