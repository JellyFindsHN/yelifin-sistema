// app/api/admin/users/[id]/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAdmin, createErrorResponse, isAuthSuccess } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ id: string }> };

// ── GET /api/admin/users/[id] ─────────────────────────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await verifyAdmin(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { id } = await params;
    const userId = Number(id);
    if (isNaN(userId)) return createErrorResponse("ID inválido", 400);

    const [user] = await sql`
      SELECT
        u.id,
        u.firebase_uid,
        u.email,
        u.display_name,
        u.photo_url,
        u.is_active,
        u.created_at,
        up.business_name,
        up.business_logo_url,
        up.timezone,
        up.currency,
        up.locale,
        up.onboarding_completed,
        us.id                        AS subscription_id,
        us.status                    AS subscription_status,
        us.trial_start_date,
        us.trial_end_date,
        us.current_period_start,
        us.current_period_end,
        us.cancel_at_period_end,
        us.cancelled_at,
        us.provider,
        us.created_at                AS subscription_created_at,
        sp.id                        AS plan_id,
        sp.name                      AS plan_name,
        sp.slug                      AS plan_slug,
        sp.price_usd,
        sp.billing_interval,
        sp.max_products,
        sp.max_sales_per_month
      FROM users u
      LEFT JOIN user_profile       up ON up.user_id = u.id
      LEFT JOIN user_subscriptions us ON us.user_id = u.id
      LEFT JOIN subscription_plans sp ON sp.id      = us.plan_id
      WHERE u.id = ${userId}
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

    if (!user) return createErrorResponse("Usuario no encontrado", 404);

    // Firebase metadata (last sign in / last token refresh)
    let firebaseMeta: { last_sign_in_time: string | null; last_refresh_time: string | null } = {
      last_sign_in_time: null,
      last_refresh_time: null,
    };
    try {
      const fbUser = await adminAuth.getUser(user.firebase_uid);
      firebaseMeta = {
        last_sign_in_time: fbUser.metadata.lastSignInTime ?? null,
        last_refresh_time: fbUser.metadata.lastRefreshTime ?? null,
      };
    } catch { /* usuario puede no existir en Firebase */ }

    // Totales de actividad
    const [activity] = await sql`
      SELECT
        (SELECT COUNT(*) FROM sales       WHERE user_id = ${userId})::int AS total_sales,
        (SELECT COUNT(*) FROM products    WHERE user_id = ${userId} AND is_active = TRUE)::int AS total_products,
        (SELECT COUNT(*) FROM transactions WHERE user_id = ${userId})::int AS total_transactions
    `;

    return Response.json({ user: { ...user, ...firebaseMeta }, activity });
  } catch (error) {
    console.error("GET /api/admin/users/[id]:", error);
    return createErrorResponse("Error al obtener usuario", 500);
  }
}

// ── PATCH /api/admin/users/[id] ───────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifyAdmin(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { id } = await params;
    const userId = Number(id);
    if (isNaN(userId)) return createErrorResponse("ID inválido", 400);

    const body = await request.json();
    const { is_active, plan_id, subscription_status, trial_end_date, current_period_end } = body;

    // Prevenir que el admin se desactive a sí mismo
    if (is_active === false && userId === auth.data.userId) {
      return createErrorResponse("No podés desactivar tu propia cuenta", 400);
    }

    await sql`BEGIN`;
    try {
      if (is_active !== undefined) {
        await sql`UPDATE users SET is_active = ${is_active}, updated_at = NOW() WHERE id = ${userId}`;
      }

      const hasSubUpdate = plan_id !== undefined || subscription_status !== undefined ||
                           trial_end_date !== undefined || current_period_end !== undefined;

      if (hasSubUpdate) {
        const [current] = await sql`SELECT id FROM user_subscriptions WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1`;

        if (current) {
          await sql`
            UPDATE user_subscriptions
            SET
              plan_id              = COALESCE(${plan_id              ?? null}::bigint,  plan_id),
              status               = COALESCE(${subscription_status  ?? null}::text,   status),
              trial_end_date       = COALESCE(${trial_end_date       ?? null}::timestamp, trial_end_date),
              current_period_end   = COALESCE(${current_period_end   ?? null}::timestamp, current_period_end),
              updated_at           = NOW()
            WHERE id = ${current.id}
          `;
        } else if (plan_id) {
          await sql`
            INSERT INTO user_subscriptions (user_id, plan_id, status, provider, created_at, updated_at)
            VALUES (${userId}, ${plan_id}, ${subscription_status ?? 'TRIAL'}, 'MANUAL', NOW(), NOW())
          `;
        }
      }

      await sql`COMMIT`;
      return Response.json({ message: "Usuario actualizado exitosamente" });
    } catch (innerError) {
      await sql`ROLLBACK`;
      throw innerError;
    }
  } catch (error) {
    console.error("PATCH /api/admin/users/[id]:", error);
    return createErrorResponse("Error al actualizar usuario", 500);
  }
}
