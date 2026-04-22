// app/api/admin/users/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAdmin, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "all";   // all | TRIAL | ACTIVE | CANCELLED | EXPIRED
    const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit  = 20;
    const offset = (page - 1) * limit;

    const users = await sql`
      SELECT
        u.id,
        u.email,
        u.display_name,
        u.is_active,
        u.created_at,
        up.business_name,
        up.business_logo_url,
        up.currency,
        us.id                   AS subscription_id,
        us.status               AS subscription_status,
        us.trial_end_date,
        us.current_period_end,
        us.created_at           AS subscription_created_at,
        sp.id                   AS plan_id,
        sp.name                 AS plan_name,
        sp.slug                 AS plan_slug,
        sp.price_usd
      FROM users u
      LEFT JOIN user_profile       up ON up.user_id = u.id
      LEFT JOIN user_subscriptions us ON us.user_id = u.id
      LEFT JOIN subscription_plans sp ON sp.id      = us.plan_id
      WHERE (
        ${search} = ''
        OR u.email         ILIKE ${'%' + search + '%'}
        OR u.display_name  ILIKE ${'%' + search + '%'}
        OR up.business_name ILIKE ${'%' + search + '%'}
      )
      AND (${status} = 'all' OR us.status = ${status})
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ total }] = await sql`
      SELECT COUNT(DISTINCT u.id)::int AS total
      FROM users u
      LEFT JOIN user_profile       up ON up.user_id = u.id
      LEFT JOIN user_subscriptions us ON us.user_id = u.id
      WHERE (
        ${search} = ''
        OR u.email          ILIKE ${'%' + search + '%'}
        OR u.display_name   ILIKE ${'%' + search + '%'}
        OR up.business_name ILIKE ${'%' + search + '%'}
      )
      AND (${status} = 'all' OR us.status = ${status})
    `;

    return Response.json({ data: users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET /api/admin/users:", error);
    return createErrorResponse("Error al obtener usuarios", 500);
  }
}
