// app/api/auth/me/route.ts
import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return Response.json(
        { error: "Token inválido o expirado" },
        { status: 401 }
      );
    }

    // 2. Usuario + perfil + suscripción
    const [userData] = await sql`
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

        us.id               AS subscription_id,
        us.status           AS subscription_status,
        us.current_period_start,
        us.current_period_end,
        us.cancel_at_period_end,

        sp.id               AS plan_id,
        sp.name             AS plan_name,
        sp.slug             AS plan_slug,
        sp.price_usd,
        sp.billing_interval,
        sp.max_products,
        sp.max_sales_per_month,
        sp.max_storage_mb

      FROM users u
      LEFT JOIN user_profile up ON up.user_id = u.id
      LEFT JOIN user_subscriptions us ON us.user_id = u.id
      LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE u.firebase_uid = ${decodedToken.uid}
        AND u.is_active = TRUE
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

    if (!userData) {
      return Response.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // 3. Features del plan
    const features = await sql`
      SELECT
        sf.feature_key,
        sf.feature_name,
        sf.category
      FROM user_subscriptions us
      JOIN plan_features pf ON pf.plan_id = us.plan_id
      JOIN system_features sf ON sf.id = pf.feature_id
      WHERE us.user_id = ${userData.id}
        AND us.status IN ('TRIAL', 'ACTIVE')
        AND pf.is_enabled = TRUE
        AND sf.is_active = TRUE
      ORDER BY us.created_at DESC
    `;

    // Agrupar features por categoría
    const featuresByCategory = features.reduce(
      (acc: Record<string, any[]>, f) => {
        if (!acc[f.category]) acc[f.category] = [];
        acc[f.category].push({
          key: f.feature_key,
          name: f.feature_name,
          category: f.category,
        });
        return acc;
      },
      {}
    );

    // 4. Construir respuesta
    return Response.json(
      {
        user: {
          id: userData.id,
          firebase_uid: userData.firebase_uid,
          email: userData.email,
          display_name: userData.display_name,
          photo_url: userData.photo_url,
          is_active: userData.is_active,
          created_at: userData.created_at,
        },
        profile: {
          user_id: userData.id,
          business_name: userData.business_name,
          business_logo_url: userData.business_logo_url,
          timezone: userData.timezone ?? "America/Tegucigalpa",
          currency: userData.currency ?? "HNL",
          locale: userData.locale ?? "es-HN",
          onboarding_completed: userData.onboarding_completed ?? false,
        },
        subscription: {
          id: userData.subscription_id,
          status: userData.subscription_status,
          plan: {
            id: userData.plan_id,
            name: userData.plan_name,
            slug: userData.plan_slug,
            price_usd: userData.price_usd,
            billing_interval: userData.billing_interval,
            limits: {
              max_products: userData.max_products,
              max_sales_per_month: userData.max_sales_per_month,
              max_storage_mb: userData.max_storage_mb,
            },
          },
          current_period_start: userData.current_period_start,
          current_period_end: userData.current_period_end,
          cancel_at_period_end: userData.cancel_at_period_end,
        },
        features: featuresByCategory,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error en /api/auth/me:", error);
    return Response.json(
      { error: "Error al obtener información del usuario" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/auth/me — actualizar perfil ─────────────────────────────
export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const body = await request.json() as Record<string, unknown>;

    const has = (k: string) => k in body;

    // ── Tabla users: display_name ───────────────────────────────────
    if (has("display_name")) {
      const val = typeof body.display_name === "string" ? body.display_name.trim() || null : null;
      await sql`
        UPDATE users SET display_name = ${val}, updated_at = NOW()
        WHERE id = ${userId}
      `;
    }

    // ── Tabla user_profile: campos del negocio ──────────────────────
    const patchProfile = has("business_name") || has("business_logo_url") ||
                         has("timezone") || has("currency") || has("locale");

    if (patchProfile) {
      // Obtener valores actuales para no pisar lo que no llegó
      const [current] = await sql`
        SELECT business_name, business_logo_url, timezone, currency, locale
        FROM user_profile WHERE user_id = ${userId}
      `;

      const business_name     = has("business_name")     ? (body.business_name     as string | null) : current?.business_name;
      const business_logo_url = has("business_logo_url") ? (body.business_logo_url as string | null) : current?.business_logo_url;
      const timezone          = has("timezone")          ? (body.timezone          as string)        : current?.timezone;
      const currency          = has("currency")          ? (body.currency          as string)        : current?.currency;
      const locale            = has("locale")            ? (body.locale            as string)        : current?.locale;

      await sql`
        UPDATE user_profile
        SET
          business_name     = ${business_name     ?? null},
          business_logo_url = ${business_logo_url ?? null},
          timezone          = ${timezone          ?? "America/Tegucigalpa"},
          currency          = ${currency          ?? "HNL"},
          locale            = ${locale            ?? "es-HN"},
          updated_at        = NOW()
        WHERE user_id = ${userId}
      `;
    }

    return Response.json({ message: "Perfil actualizado exitosamente" }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH /api/auth/me:", error);
    return createErrorResponse("Error al actualizar el perfil", 500);
  }
}