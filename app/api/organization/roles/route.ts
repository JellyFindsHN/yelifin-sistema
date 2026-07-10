// app/api/organization/roles/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess, OrgModule } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

const MODULES: OrgModule[] = [
  "DASHBOARD", "PRODUCTS", "INVENTORY", "SALES", "CUSTOMERS",
  "FINANCES", "EVENTS", "REPORTS", "ADMIN",
];

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { orgId } = auth.data;

    const roles = await sql`
      SELECT id, name, is_owner, created_at
      FROM org_roles
      WHERE org_id = ${orgId}
      ORDER BY is_owner DESC, name ASC
    `;

    const perms = await sql`
      SELECT r.id AS role_id, p.module, p.can_view, p.can_edit, p.can_delete, p.show_costs, p.show_profit
      FROM org_roles r
      JOIN org_role_permissions p ON p.role_id = r.id
      WHERE r.org_id = ${orgId}
    `;

    const permsByRole = new Map<number, Record<string, object>>();
    for (const p of perms) {
      if (!permsByRole.has(p.role_id)) permsByRole.set(p.role_id, {});
      permsByRole.get(p.role_id)![p.module] = {
        can_view:    p.can_view,
        can_edit:    p.can_edit,
        can_delete:  p.can_delete,
        show_costs:  p.show_costs,
        show_profit: p.show_profit,
      };
    }

    const data = roles.map((r) => ({
      ...r,
      permissions: permsByRole.get(r.id) ?? {},
    }));

    return Response.json({ data });
  } catch (error) {
    console.error("GET /api/organization/roles:", error);
    return createErrorResponse("Error al obtener roles", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  if (!auth.data.isOwner) {
    return createErrorResponse("Solo el dueño puede crear roles", 403);
  }

  try {
    const { orgId } = auth.data;
    const { name, permissions } = await request.json();

    if (!name?.trim()) return createErrorResponse("El nombre del rol es requerido", 400);

    const [role] = await sql`
      INSERT INTO org_roles (org_id, name, is_owner)
      VALUES (${orgId}, ${name.trim()}, FALSE)
      RETURNING id, name, is_owner, created_at
    `;

    // Insertar permisos para los módulos provistos; los no provistos quedan en false
    const permRows = MODULES.map((module) => {
      const p = permissions?.[module] ?? {};
      return {
        role_id:     role.id,
        module,
        can_view:    p.can_view    ?? false,
        can_edit:    p.can_edit    ?? false,
        can_delete:  p.can_delete  ?? false,
        show_costs:  p.show_costs  ?? false,
        show_profit: p.show_profit ?? false,
      };
    });

    for (const p of permRows) {
      await sql`
        INSERT INTO org_role_permissions (role_id, module, can_view, can_edit, can_delete, show_costs, show_profit)
        VALUES (${p.role_id}, ${p.module}, ${p.can_view}, ${p.can_edit}, ${p.can_delete}, ${p.show_costs}, ${p.show_profit})
      `;
    }

    const savedPerms = await sql`
      SELECT module, can_view, can_edit, can_delete, show_costs, show_profit
      FROM org_role_permissions WHERE role_id = ${role.id}
    `;

    const permissionsMap: Record<string, object> = {};
    for (const p of savedPerms) {
      permissionsMap[p.module] = {
        can_view: p.can_view, can_edit: p.can_edit, can_delete: p.can_delete,
        show_costs: p.show_costs, show_profit: p.show_profit,
      };
    }

    return Response.json({ data: { ...role, permissions: permissionsMap } }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return createErrorResponse("Ya existe un rol con ese nombre", 409);
    }
    console.error("POST /api/organization/roles:", error);
    return createErrorResponse("Error al crear rol", 500);
  }
}
