// app/api/admin/plans/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAdmin, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const plans = await sql`
      SELECT
        sp.id,
        sp.name,
        sp.slug,
        sp.description,
        sp.price_usd,
        sp.billing_interval,
        sp.max_products,
        sp.max_sales_per_month,
        sp.max_storage_mb,
        sp.is_active,
        COUNT(us.id)::int AS user_count
      FROM subscription_plans sp
      LEFT JOIN user_subscriptions us ON us.plan_id = sp.id
      GROUP BY sp.id
      ORDER BY sp.price_usd ASC, sp.name ASC
    `;

    return Response.json({ data: plans });
  } catch (error) {
    console.error("GET /api/admin/plans:", error);
    return createErrorResponse("Error al obtener planes", 500);
  }
}
