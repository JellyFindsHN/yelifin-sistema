// lib/auth.ts
import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// ── Tipos ─────────────────────────────────────────────────────────────

export type AuthUser = {
  userId: number;
  firebaseUid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  isActive: boolean;
  subscription: {
    status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
    planSlug: string;
  };
};

type AuthResult =
  | { error: string; status: number; data: null; needsUpgrade?: boolean }
  | { error: null; status: 200; data: AuthUser; needsUpgrade?: never };

// ── verifyAuth ─────────────────────────────────────────────────────────

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "No autorizado", status: 401, data: null };
  }

  const token = authHeader.substring(7);

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch {
    return { error: "Token inválido o expirado", status: 401, data: null };
  }

  try {
    const [user] = await sql`
      SELECT
        u.id,
        u.firebase_uid,
        u.email,
        u.display_name,
        u.is_active,
        us.status        AS subscription_status,
        sp.slug          AS plan_slug
      FROM users u
      LEFT JOIN user_subscriptions us ON us.user_id = u.id
      LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE u.firebase_uid = ${decodedToken.uid}
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

    if (!user) {
      return { error: "Usuario no encontrado", status: 404, data: null };
    }

    if (!user.is_active) {
      return { error: "Esta cuenta ha sido deshabilitada", status: 403, data: null };
    }

    return {
      error: null,
      status: 200,
      data: {
        userId: user.id,
        firebaseUid: user.firebase_uid,
        email: user.email,
        displayName: user.display_name,
        emailVerified: decodedToken.email_verified ?? false,
        isActive: user.is_active,
        subscription: {
          status: user.subscription_status,
          planSlug: user.plan_slug,
        },
      },
    };
  } catch (error) {
    console.error("❌ Error en verifyAuth:", error);
    return { error: "Error interno del servidor", status: 500, data: null };
  }
}

// ── verifySubscription ─────────────────────────────────────────────────

export async function verifySubscription(userId: number): Promise<AuthResult & { data: null } | { error: null; status: 200; isActive: true; planSlug: string }> {
  try {
    const [subscription] = await sql`
      SELECT
        us.status,
        sp.slug AS plan_slug
      FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = ${userId}
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

    if (!subscription) {
      return { error: "Suscripción no encontrada", status: 404, data: null };
    }

    const validStatuses = ["TRIAL", "ACTIVE"];
    if (!validStatuses.includes(subscription.status)) {
      return {
        error: "Tu suscripción no está activa",
        status: 403,
        data: null,
        needsUpgrade: true,
      };
    }

    return {
      error: null,
      status: 200,
      isActive: true,
      planSlug: subscription.plan_slug,
    };
  } catch (error) {
    console.error("❌ Error en verifySubscription:", error);
    return { error: "Error al verificar suscripción", status: 500, data: null };
  }
}

// ── verifyFeatureAccess ────────────────────────────────────────────────

export async function verifyFeatureAccess(userId: number, featureKey: string) {
  try {
    const [result] = await sql`
      SELECT pf.is_enabled
      FROM user_subscriptions us
      JOIN plan_features pf ON pf.plan_id = us.plan_id
      JOIN system_features sf ON sf.id = pf.feature_id
      WHERE us.user_id = ${userId}
        AND sf.feature_key = ${featureKey}
        AND pf.is_enabled = TRUE
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

    if (!result?.is_enabled) {
      return {
        error: "Esta funcionalidad requiere un plan superior",
        status: 403,
        hasAccess: false,
        needsUpgrade: true,
      };
    }

    return { error: null, status: 200, hasAccess: true };
  } catch (error) {
    console.error("❌ Error en verifyFeatureAccess:", error);
    return { error: "Error al verificar permisos", status: 500, hasAccess: false };
  }
}

// ── verifyResourceLimit ────────────────────────────────────────────────

export async function verifyResourceLimit(
  userId: number,
  resourceType: "products" | "sales"
) {
  try {
    const limits: Record<string, { column: string; countQuery: (id: number) => Promise<number> }> = {
      products: {
        column: "max_products",
        countQuery: async (id) => {
          const [r] = await sql`SELECT COUNT(*) AS count FROM products WHERE user_id = ${id} AND is_active = TRUE`;
          return Number(r.count);
        },
      },
      sales: {
        column: "max_sales_per_month",
        countQuery: async (id) => {
          const [r] = await sql`
            SELECT COUNT(*) AS count FROM sales
            WHERE user_id = ${id}
              AND DATE_TRUNC('month', sold_at) = DATE_TRUNC('month', NOW())
          `;
          return Number(r.count);
        },
      },
    };

    const [plan] = await sql`
      SELECT sp.max_products, sp.max_sales_per_month
      FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = ${userId}
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

    if (!plan) {
      return { error: "Plan no encontrado", status: 404, withinLimit: false };
    }

    const limitValue = plan[limits[resourceType].column];

    // NULL = sin límite
    if (limitValue === null) {
      return { error: null, status: 200, withinLimit: true };
    }

    const currentCount = await limits[resourceType].countQuery(userId);

    if (currentCount >= limitValue) {
      const messages = {
        products: "Has alcanzado el límite de productos para tu plan",
        sales: "Has alcanzado el límite de ventas mensuales para tu plan",
      };

      return {
        error: messages[resourceType],
        status: 403,
        withinLimit: false,
        needsUpgrade: true,
      };
    }

    return { error: null, status: 200, withinLimit: true };
  } catch (error) {
    console.error("❌ Error en verifyResourceLimit:", error);
    return { error: "Error al verificar límites", status: 500, withinLimit: false };
  }
}

// ── verifyAuthAndSubscription (helper combinado) ───────────────────────

export async function verifyAuthAndSubscription(request: NextRequest): Promise<AuthResult> {
  const authResult = await verifyAuth(request);
  if (authResult.error !== null) return authResult;

  // TypeScript ya sabe que data no es null aquí
  const subResult = await verifySubscription(authResult.data.userId);
  if (subResult.error !== null) {
    return {
      error: subResult.error,
      status: subResult.status,
      data: null,
      needsUpgrade: "needsUpgrade" in subResult ? subResult.needsUpgrade : false,
    };
  }

  return authResult;
}

// ── createErrorResponse (helper de respuesta) ──────────────────────────

export function createErrorResponse(
  error: string,
  status: number,
  needsUpgrade: boolean = false
) {
  return Response.json(
    { error, ...(needsUpgrade && { needs_upgrade: true }) },
    { status }
  );
}

// Agrega esta función helper al final de lib/auth.ts
export function isAuthSuccess(result: Awaited<ReturnType<typeof verifyAuth>>): result is { error: null; status: 200; data: AuthUser } {
  return result.error === null;
}