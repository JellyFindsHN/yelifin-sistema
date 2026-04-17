// app/api/inventory/movements/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId }       = auth.data;
    const { searchParams } = new URL(request.url);

    const date      = searchParams.get("date");
    const month     = searchParams.get("month");
    const year      = searchParams.get("year");
    const productId = searchParams.get("product_id");
    const variantId = searchParams.get("variant_id");

    const now = new Date();
    let startISO: string;
    let endISO:   string;

    if (date) {
      startISO = `${date}T00:00:00.000Z`;
      endISO   = `${date}T23:59:59.999Z`;
    } else if (year && month) {
      const y = Number(year), m = Number(month);
      startISO = new Date(y, m - 1, 1).toISOString();
      endISO   = new Date(y, m,     1).toISOString();
    } else if (year && !month) {
      const y = Number(year);
      startISO = new Date(y,     0, 1).toISOString();
      endISO   = new Date(y + 1, 0, 1).toISOString();
    } else {
      startISO = new Date(now.getFullYear(), now.getMonth(),     1).toISOString();
      endISO   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    }

    const movements = await sql`
      SELECT
        im.id,
        im.movement_type,
        im.product_id,
        im.variant_id,
        p.name        AS product_name,
        p.image_url,
        p.sku,
        pv.variant_name,
        pv.sku        AS variant_sku,
        im.quantity,
        im.reference_type,
        im.reference_id,
        im.notes,
        im.created_at,

        -- ── PURCHASE (IN) ──────────────────────────────────────────

        -- Moneda de la compra — clave para saber si unit_cost_usd aplica
        CASE WHEN im.reference_type = 'PURCHASE' THEN pb.currency      END AS purchase_currency,
        CASE WHEN im.reference_type = 'PURCHASE' THEN pb.exchange_rate END AS exchange_rate,

        -- unit_cost_usd solo tiene sentido cuando la compra fue en USD
        CASE
          WHEN im.reference_type = 'PURCHASE' AND pb.currency = 'USD'
          THEN pbi.unit_cost_usd
        END AS unit_cost_usd,

        -- Costo en moneda local siempre disponible
        CASE WHEN im.reference_type = 'PURCHASE' THEN ib.unit_cost END AS unit_cost_hnl,

        -- Costo en la moneda de la compra (sea USD u otra)
        -- Si fue en USD → unit_cost_usd; si fue en otra moneda → unit_cost_hnl
        CASE
          WHEN im.reference_type = 'PURCHASE' AND pb.currency = 'USD'
          THEN pbi.unit_cost_usd
          WHEN im.reference_type = 'PURCHASE'
          THEN ib.unit_cost
        END AS unit_cost_purchase,

        CASE
          WHEN im.reference_type = 'PURCHASE' AND COALESCE(pbi.quantity, 0) > 0
          THEN ROUND(
            pb.shipping::numeric / NULLIF(
              (SELECT SUM(i2.quantity) FROM purchase_batch_items i2
               WHERE i2.purchase_batch_id = pb.id), 0
            ), 4)
          ELSE 0
        END AS shipping_per_unit,
        CASE WHEN im.reference_type = 'PURCHASE' THEN pbi.total_cost END AS total_cost,

        -- ── SALE (OUT) ─────────────────────────────────────────────
        CASE WHEN im.reference_type = 'SALE' THEN si.unit_price     END AS unit_price,
        CASE WHEN im.reference_type = 'SALE' THEN si.unit_cost      END AS unit_cost,
        CASE WHEN im.reference_type = 'SALE' THEN si.line_total     END AS line_total,
        CASE
          WHEN im.reference_type = 'SALE'
          THEN ROUND((si.line_total - (si.unit_cost * im.quantity))::numeric, 2)
        END AS profit,
        CASE WHEN im.reference_type = 'SALE' THEN s.sale_number     END AS sale_number,
        CASE WHEN im.reference_type = 'SALE' THEN c.name            END AS customer_name

      FROM inventory_movements im
      JOIN products p ON p.id = im.product_id

      -- Variante (opcional)
      LEFT JOIN product_variants pv
        ON pv.id      = im.variant_id
       AND pv.user_id = im.user_id

      -- PURCHASE joins — filtrar por variant_id para evitar duplicados
      LEFT JOIN purchase_batch_items pbi
        ON  im.reference_type     = 'PURCHASE'
        AND pbi.purchase_batch_id = im.reference_id
        AND pbi.product_id        = im.product_id
        AND pbi.user_id           = im.user_id
        AND (
          (im.variant_id IS NULL AND pbi.variant_id IS NULL)
          OR pbi.variant_id = im.variant_id
        )
      LEFT JOIN purchase_batches pb
        ON  pb.id      = pbi.purchase_batch_id
       AND pb.user_id = im.user_id
      LEFT JOIN inventory_batches ib
        ON  ib.purchase_batch_item_id = pbi.id
        AND ib.user_id                = im.user_id

      -- SALE joins — filtrar por variant_id para evitar duplicados
      LEFT JOIN sale_items si
        ON  im.reference_type = 'SALE'
        AND si.sale_id        = im.reference_id
        AND si.product_id     = im.product_id
        AND si.user_id        = im.user_id
        AND (
          (im.variant_id IS NULL AND si.variant_id IS NULL)
          OR si.variant_id = im.variant_id
        )
      LEFT JOIN sales     s ON s.id  = si.sale_id
      LEFT JOIN customers c ON c.id  = s.customer_id

      WHERE im.user_id    = ${userId}
        AND im.created_at >= ${startISO}::timestamptz
        AND im.created_at <  ${endISO}::timestamptz
        ${productId ? sql`AND im.product_id = ${Number(productId)}` : sql``}
        ${variantId ? sql`AND im.variant_id = ${Number(variantId)}` : sql``}

      ORDER BY im.created_at DESC
      LIMIT 500
    `;

    return Response.json({ data: movements, total: movements.length });

  } catch (error) {
    console.error("GET /api/inventory/movements:", error);
    return createErrorResponse("Error al obtener movimientos", 500);
  }
}