// app/api/admin/stats/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAdmin, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const [counts] = await sql`
      SELECT
        COUNT(DISTINCT u.id)::int                                                              AS total_users,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = TRUE)::int                           AS active_users,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = FALSE)::int                          AS inactive_users,
        COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= DATE_TRUNC('month', NOW()))::int   AS new_this_month,
        COUNT(DISTINCT us.id) FILTER (WHERE us.status = 'TRIAL')::int                         AS trial_count,
        COUNT(DISTINCT us.id) FILTER (WHERE us.status = 'ACTIVE')::int                        AS active_count,
        COUNT(DISTINCT us.id) FILTER (WHERE us.status = 'CANCELLED')::int                     AS cancelled_count,
        COUNT(DISTINCT us.id) FILTER (WHERE us.status = 'EXPIRED')::int                       AS expired_count,
        COUNT(DISTINCT us.id) FILTER (WHERE us.status = 'PAST_DUE')::int                      AS past_due_count
      FROM users u
      LEFT JOIN user_subscriptions us ON us.user_id = u.id
    `;

    const planStats = await sql`
      SELECT
        sp.id,
        sp.name,
        sp.slug,
        COUNT(us.id)::int AS user_count
      FROM subscription_plans sp
      LEFT JOIN user_subscriptions us ON us.plan_id = sp.id
      WHERE sp.is_active = TRUE
      GROUP BY sp.id, sp.name, sp.slug
      ORDER BY user_count DESC
    `;

    const recentUsers = await sql`
      SELECT
        u.id,
        u.email,
        u.display_name,
        u.is_active,
        u.created_at,
        up.business_name,
        us.status AS subscription_status,
        sp.name   AS plan_name
      FROM users u
      LEFT JOIN user_profile       up ON up.user_id  = u.id
      LEFT JOIN user_subscriptions us ON us.user_id  = u.id
      LEFT JOIN subscription_plans sp ON sp.id       = us.plan_id
      ORDER BY u.created_at DESC
      LIMIT 5
    `;

    return Response.json({ counts, planStats, recentUsers });
  } catch (error) {
    console.error("GET /api/admin/stats:", error);
    return createErrorResponse("Error al obtener estadísticas", 500);
  }
}
