// app/api/organization/members/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { orgId } = auth.data;

    const members = await sql`
      SELECT
        om.id,
        om.user_id,
        om.role_id,
        om.is_active,
        om.joined_at,
        om.created_at,
        u.email,
        u.display_name,
        r.name     AS role_name,
        r.is_owner AS is_owner_role
      FROM organization_members om
      JOIN users     u ON u.id = om.user_id
      JOIN org_roles r ON r.id = om.role_id
      WHERE om.org_id = ${orgId}
      ORDER BY om.joined_at ASC
    `;

    return Response.json({ data: members });
  } catch (error) {
    console.error("GET /api/organization/members:", error);
    return createErrorResponse("Error al obtener miembros", 500);
  }
}
