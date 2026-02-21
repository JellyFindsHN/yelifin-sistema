// app/api/transactions/route.ts
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

    const accountId = searchParams.get("account_id");
    const month     = searchParams.get("month");
    const year      = searchParams.get("year");
    const date      = searchParams.get("date");

    const now = new Date();
    let startISO: string;
    let endISO:   string;

    if (date) {
      startISO = `${date}T00:00:00.000Z`;
      endISO   = `${date}T23:59:59.999Z`;
    } else if (year && month) {
      const y = Number(year), m = Number(month);
      startISO = new Date(y, m - 1, 1).toISOString();
      endISO   = new Date(y, m, 1).toISOString();
    } else if (year && !month) {
      const y = Number(year);
      startISO = new Date(y, 0, 1).toISOString();
      endISO   = new Date(y + 1, 0, 1).toISOString();
    } else {
      startISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      endISO   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    }

    const transactions = await sql`
      SELECT
        t.id,
        t.type,
        t.amount,
        t.category,
        t.description,
        t.reference_type,
        t.reference_id,
        t.occurred_at,
        t.created_at,
        -- Cuenta origen
        a.id   AS account_id,
        a.name AS account_name,
        a.type AS account_type,
        -- Cuenta destino (transferencias)
        ta.id   AS to_account_id,
        ta.name AS to_account_name
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts ta ON ta.id = t.to_account_id
      WHERE t.user_id = ${userId}
        AND t.occurred_at >= ${startISO}::timestamptz
        AND t.occurred_at <  ${endISO}::timestamptz
        ${accountId ? sql`AND (t.account_id = ${Number(accountId)} OR t.to_account_id = ${Number(accountId)})` : sql``}
      ORDER BY t.occurred_at DESC
      LIMIT 500
    `;

    // Totales del período
    const [totals] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'INCOME'   THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE'  THEN amount ELSE 0 END), 0) AS total_expense,
        COALESCE(SUM(CASE WHEN type = 'TRANSFER' THEN amount ELSE 0 END), 0) AS total_transfer,
        COUNT(*)::int AS total_count
      FROM transactions t
      WHERE t.user_id = ${userId}
        AND t.occurred_at >= ${startISO}::timestamptz
        AND t.occurred_at <  ${endISO}::timestamptz
        ${accountId ? sql`AND (t.account_id = ${Number(accountId)} OR t.to_account_id = ${Number(accountId)})` : sql``}
    `;

    return Response.json({
      data:   transactions,
      totals: {
        income:   Number(totals.total_income),
        expense:  Number(totals.total_expense),
        transfer: Number(totals.total_transfer),
        count:    Number(totals.total_count),
      },
    });
  } catch (error) {
    console.error("❌ GET /api/transactions:", error);
    return createErrorResponse("Error al obtener transacciones", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const body = await request.json();
    const { type, account_id, to_account_id, amount, category, description, occurred_at } = body;

    if (!type || !["INCOME", "EXPENSE", "TRANSFER"].includes(type))
      return createErrorResponse("Tipo de transacción inválido", 400);
    if (!account_id)
      return createErrorResponse("La cuenta es requerida", 400);
    if (!amount || Number(amount) <= 0)
      return createErrorResponse("El monto debe ser mayor a 0", 400);
    if (type === "TRANSFER" && !to_account_id)
      return createErrorResponse("La cuenta destino es requerida", 400);
    if (type === "TRANSFER" && account_id === to_account_id)
      return createErrorResponse("Las cuentas deben ser diferentes", 400);

    // Verificar cuenta origen
    const [account] = await sql`
      SELECT id, balance FROM accounts
      WHERE id = ${account_id} AND user_id = ${userId} AND is_active = TRUE
    `;
    if (!account) return createErrorResponse("Cuenta no encontrada", 404);

    const amt = Number(amount);
    const occurredAt = occurred_at ?? new Date().toISOString();

    // Insertar transacción
    const [transaction] = await sql`
      INSERT INTO transactions (
        user_id, type, account_id, to_account_id,
        amount, category, description,
        reference_type, occurred_at
      ) VALUES (
        ${userId}, ${type}, ${account_id}, ${to_account_id ?? null},
        ${amt}, ${category ?? null}, ${description ?? null},
        'OTHER', ${occurredAt}
      )
      RETURNING id
    `;

    // Actualizar balances
    if (type === "INCOME") {
      await sql`UPDATE accounts SET balance = balance + ${amt} WHERE id = ${account_id} AND user_id = ${userId}`;
    } else if (type === "EXPENSE") {
      await sql`UPDATE accounts SET balance = balance - ${amt} WHERE id = ${account_id} AND user_id = ${userId}`;
    } else if (type === "TRANSFER") {
      const [toAccount] = await sql`
        SELECT id FROM accounts WHERE id = ${to_account_id} AND user_id = ${userId} AND is_active = TRUE
      `;
      if (!toAccount) return createErrorResponse("Cuenta destino no encontrada", 404);
      await sql`UPDATE accounts SET balance = balance - ${amt} WHERE id = ${account_id}   AND user_id = ${userId}`;
      await sql`UPDATE accounts SET balance = balance + ${amt} WHERE id = ${to_account_id} AND user_id = ${userId}`;
    }

    return Response.json(
      { message: "Transacción registrada", data: { id: transaction.id } },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ POST /api/transactions:", error);
    return createErrorResponse("Error al registrar transacción", 500);
  }
}