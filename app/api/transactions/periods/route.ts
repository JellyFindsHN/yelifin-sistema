// app/api/transactions/periods/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const periods = await sql`
      SELECT DISTINCT
        EXTRACT(YEAR  FROM occurred_at)::int AS year,
        EXTRACT(MONTH FROM occurred_at)::int AS month
      FROM transactions
      WHERE user_id = ${userId}
      ORDER BY year DESC, month DESC
    `;
    return Response.json({ data: periods });
  } catch (error) {
    console.error("❌ GET /api/transactions/periods:", error);
    return createErrorResponse("Error al obtener períodos", 500);
  }
}