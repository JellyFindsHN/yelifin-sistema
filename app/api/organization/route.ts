// app/api/organization/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { orgId } = auth.data;

    const [org] = await sql`
      SELECT id, name, slug, logo_url, timezone, currency, locale, created_at
      FROM organizations
      WHERE id = ${orgId}
    `;

    return Response.json({ data: org });
  } catch (error) {
    console.error("GET /api/organization:", error);
    return createErrorResponse("Error al obtener organización", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  if (!auth.data.isOwner) {
    return createErrorResponse("Solo el dueño puede editar la organización", 403);
  }

  try {
    const { orgId } = auth.data;
    const body = await request.json();

    const allowed = ["name", "logo_url", "timezone", "currency", "locale"] as const;
    type Field = (typeof allowed)[number];

    const updates: Partial<Record<Field, string>> = {};
    for (const key of allowed) {
      if (key in body && body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return createErrorResponse("No hay campos para actualizar", 400);
    }

    const [org] = await sql`
      UPDATE organizations
      SET
        name       = COALESCE(${updates.name       ?? null}, name),
        logo_url   = COALESCE(${updates.logo_url   ?? null}, logo_url),
        timezone   = COALESCE(${updates.timezone   ?? null}, timezone),
        currency   = COALESCE(${updates.currency   ?? null}, currency),
        locale     = COALESCE(${updates.locale     ?? null}, locale),
        updated_at = NOW()
      WHERE id = ${orgId}
      RETURNING id, name, slug, logo_url, timezone, currency, locale
    `;

    return Response.json({ data: org });
  } catch (error) {
    console.error("PATCH /api/organization:", error);
    return createErrorResponse("Error al actualizar organización", 500);
  }
}
