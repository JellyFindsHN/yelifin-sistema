import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/onboarding — verificar si el usuario completó el onboarding
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;

    const [profile] = await sql`
      SELECT onboarding_completed, currency
      FROM user_profile
      WHERE user_id = ${userId}
    `;

    return Response.json({
      data: {
        onboarding_completed: profile?.onboarding_completed ?? false,
        currency: profile?.currency ?? "HNL",
      },
    });
  } catch (error) {
    console.error("❌ GET /api/onboarding:", error);
    return createErrorResponse("Error al verificar onboarding", 500);
  }
}

// POST /api/onboarding — completar onboarding
// Body: { currency: string, accounts: { name: string, type: string, balance?: number }[] }
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const body = await request.json();

    const currency = (body?.currency ?? "HNL").toString().trim().toUpperCase();
    const accounts = Array.isArray(body?.accounts) ? body.accounts : [];

    if (!currency || currency.length !== 3)
      return createErrorResponse("Moneda inválida", 400);

    // La cuenta de efectivo siempre debe estar
    const hasEfectivo = accounts.some(
      (a: any) => (a.type ?? "").toUpperCase() === "CASH"
    );
    if (!hasEfectivo)
      return createErrorResponse("Debe incluir al menos una cuenta de efectivo", 400);

    // Validar cuentas
    const validTypes = ["CASH", "BANK", "WALLET", "OTHER"];
    for (const acc of accounts) {
      if (!acc.name?.trim())
        return createErrorResponse("El nombre de la cuenta es requerido", 400);
      if (!validTypes.includes((acc.type ?? "").toUpperCase()))
        return createErrorResponse(`Tipo de cuenta inválido: ${acc.type}`, 400);
    }

    await sql`BEGIN`;
    try {
      // 1. Actualizar moneda y marcar onboarding completo
      await sql`
        UPDATE user_profile
        SET
          currency             = ${currency},
          onboarding_completed = TRUE,
          updated_at           = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
      `;

      // 2. Crear cuentas (ignorar duplicados por nombre)
      for (const acc of accounts) {
        const name    = acc.name.trim();
        const type    = (acc.type ?? "CASH").toUpperCase();
        const balance = Number(acc.balance ?? 0);

        await sql`
          INSERT INTO accounts (user_id, name, type, balance, is_active)
          VALUES (${userId}, ${name}, ${type}, ${balance}, TRUE)
          ON CONFLICT (user_id, name) DO NOTHING
        `;
      }

      await sql`COMMIT`;

      return Response.json(
        { message: "Onboarding completado", data: { currency } },
        { status: 201 }
      );
    } catch (inner) {
      await sql`ROLLBACK`;
      throw inner;
    }
  } catch (error) {
    console.error("❌ POST /api/onboarding:", error);
    return createErrorResponse("Error al completar onboarding", 500);
  }
}