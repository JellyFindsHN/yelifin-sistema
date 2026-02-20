// app/api/supplies/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/supplies?search=...
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();

    const supplies = await sql`
      SELECT
        id,
        user_id,
        name,
        unit,
        stock::int,
        min_stock::int,
        unit_cost,
        created_at
      FROM supplies
      WHERE user_id = ${userId}
        AND (${search} = '' OR LOWER(name) LIKE ${"%" + search + "%"})
      ORDER BY created_at DESC
    `;

    return Response.json({ data: supplies, total: supplies.length });
  } catch (error) {
    console.error("❌ GET /api/supplies:", error);
    return createErrorResponse("Error al obtener suministros", 500);
  }
}

// POST /api/supplies
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const body = await request.json();

    const name = (body?.name ?? "").trim();
    const unit = (body?.unit ?? "unit").trim();
    const stock = Number(body?.stock ?? 0);
    const min_stock = Number(body?.min_stock ?? 0);
    const unit_cost = Number(body?.unit_cost ?? 0);

    if (!name) return createErrorResponse("El nombre es requerido", 400);
    if (Number.isNaN(stock) || stock < 0) return createErrorResponse("Stock inválido", 400);
    if (Number.isNaN(min_stock) || min_stock < 0) return createErrorResponse("Stock mínimo inválido", 400);
    if (Number.isNaN(unit_cost) || unit_cost < 0) return createErrorResponse("Costo unitario inválido", 400);

    const [created] = await sql`
      INSERT INTO supplies (user_id, name, unit, stock, min_stock, unit_cost)
      VALUES (${userId}, ${name}, ${unit}, ${stock}, ${min_stock}, ${unit_cost})
      RETURNING id
    `;

    return Response.json(
      { message: "Suministro creado", data: { id: created.id } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ POST /api/supplies:", error);
    // Si el UNIQUE(user_id, name) falla:
    if (String(error?.message ?? "").toLowerCase().includes("unique")) {
      return createErrorResponse("Ya existe un suministro con ese nombre", 400);
    }
    return createErrorResponse("Error al crear suministro", 500);
  }
}
