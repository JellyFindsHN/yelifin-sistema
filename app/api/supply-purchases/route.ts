// app/api/supply-purchases/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

// Helpers
function toISOOrNull(value: any) {
  const s = (value ?? "").toString().trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// GET /api/supply-purchases?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from"); // YYYY-MM-DD
    const to = searchParams.get("to");     // YYYY-MM-DD

    const fromISO = from ? toISOOrNull(`${from}T00:00:00`) : null;
    const toISO = to ? toISOOrNull(`${to}T23:59:59`) : null;

    const purchases = await sql`
      SELECT
        sp.id,
        sp.user_id,
        sp.supplier_id,
        sp.purchased_at,
        sp.created_at,
        COALESCE(SUM(spi.line_total), 0) AS total,
        COUNT(spi.id)::int AS items_count
      FROM supply_purchases sp
    LEFT JOIN supply_purchase_items spi ON spi.supply_purchase_id = sp.id
      WHERE sp.user_id = ${userId}
        AND (${fromISO}::timestamptz IS NULL OR sp.purchased_at >= ${fromISO}::timestamptz)
        AND (${toISO}::timestamptz   IS NULL OR sp.purchased_at <= ${toISO}::timestamptz)
      GROUP BY sp.id
      ORDER BY sp.purchased_at DESC
    `;

    return Response.json({ data: purchases, total: purchases.length });
  } catch (error) {
    console.error("❌ GET /api/supply-purchases:", error);
    return createErrorResponse("Error al obtener compras de suministros", 500);
  }
}

// POST /api/supply-purchases
// Body:
// {
//   supplier_id?: number | null,
//   purchased_at?: string (ISO) | string (YYYY-MM-DD) | omit,
//   items: [{ supply_id: number, quantity: number, unit_cost: number }]
// }
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const body = await request.json().catch(() => ({}));

    const supplier_id =
      body?.supplier_id === null || body?.supplier_id === undefined
        ? null
        : Number(body.supplier_id);

    if (supplier_id !== null && Number.isNaN(supplier_id)) {
      return createErrorResponse("Proveedor inválido", 400);
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) return createErrorResponse("Se requiere al menos un item", 400);

    // purchased_at: si viene YYYY-MM-DD o ISO, lo normalizamos
    let purchased_at: string | null = null;
    const rawPurchasedAt = (body?.purchased_at ?? "").toString().trim();

    if (!rawPurchasedAt) {
      purchased_at = new Date().toISOString();
    } else {
      // si viene YYYY-MM-DD, lo convertimos a ISO 00:00
      purchased_at =
        rawPurchasedAt.length === 10 && rawPurchasedAt.includes("-")
          ? toISOOrNull(`${rawPurchasedAt}T00:00:00`)
          : toISOOrNull(rawPurchasedAt);

      if (!purchased_at) return createErrorResponse("Fecha inválida", 400);
    }

    // Validar items + calcular line_total
    const normalizedItems: { supply_id: number; quantity: number; unit_cost: number; line_total: number }[] = [];

    for (const it of items) {
      const supply_id = Number(it?.supply_id);
      const quantity = Number(it?.quantity);
      const unit_cost = Number(it?.unit_cost);

      if (!supply_id || Number.isNaN(supply_id)) return createErrorResponse("supply_id inválido", 400);
      if (Number.isNaN(quantity) || quantity <= 0) return createErrorResponse("Cantidad inválida", 400);
      if (Number.isNaN(unit_cost) || unit_cost < 0) return createErrorResponse("Costo unitario inválido", 400);

      normalizedItems.push({
        supply_id,
        quantity,
        unit_cost,
        line_total: quantity * unit_cost,
      });
    }

    // Transacción
    await sql`BEGIN`;

    try {
      // 1) Crear compra
      const [purchase] = await sql`
        INSERT INTO supply_purchases (user_id, supplier_id, purchased_at)
        VALUES (${userId}, ${supplier_id}, ${purchased_at}::timestamptz)
        RETURNING id
      `;

      const purchaseId = purchase.id as number;

      // 2) Insertar items + actualizar stock
      for (const it of normalizedItems) {
        // Verificar que el suministro pertenezca al user
        const [exists] = await sql`
          SELECT id FROM supplies
          WHERE id = ${it.supply_id} AND user_id = ${userId}
        `;
        if (!exists) {
          await sql`ROLLBACK`;
          return createErrorResponse("Suministro no encontrado", 404);
        }

       await sql`
  INSERT INTO supply_purchase_items (
    user_id, supply_purchase_id, supply_id,
    quantity, unit_cost, line_total
  ) VALUES (
    ${userId}, ${purchaseId}, ${it.supply_id},
    ${it.quantity}, ${it.unit_cost}, ${it.line_total}
  )
`;

        // Incrementar stock. (Opcional: actualizar unit_cost al último costo)
        await sql`
          UPDATE supplies
          SET
            stock = stock + ${it.quantity},
            unit_cost = ${it.unit_cost}
          WHERE id = ${it.supply_id} AND user_id = ${userId}
        `;
      }

      await sql`COMMIT`;

      const total = normalizedItems.reduce((acc, x) => acc + x.line_total, 0);

      return Response.json(
        { message: "Compra registrada", data: { id: purchaseId, total } },
        { status: 201 }
      );
    } catch (inner) {
      await sql`ROLLBACK`;
      throw inner;
    }
  } catch (error) {
    console.error("❌ POST /api/supply-purchases:", error);
    return createErrorResponse("Error al registrar compra de suministros", 500);
  }
}
