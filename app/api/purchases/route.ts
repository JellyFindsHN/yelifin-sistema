// app/api/purchases/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const body       = await request.json();

    const {
      account_id, credit_card_id, shipping_account_id, currency, exchange_rate,
      shipping, notes, purchased_at, items,
      status = "COMPLETED",
    } = body;

    const isCreditCard = !!credit_card_id && !account_id;

    if (status !== "PENDING" && status !== "COMPLETED")
      return createErrorResponse("Estado inválido", 400);

    // ── Validaciones básicas ────────────────────────────────────────
    if (!isCreditCard && !account_id)
      return createErrorResponse("La cuenta es requerida", 400);
    if (isCreditCard && !credit_card_id)
      return createErrorResponse("La tarjeta de crédito es requerida", 400);
    if (!items || !Array.isArray(items) || items.length === 0)
      return createErrorResponse("Se requiere al menos un producto", 400);

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0)
        return createErrorResponse("Datos de producto inválidos", 400);
      if (item.unit_cost_usd === undefined || item.unit_cost_usd < 0)
        return createErrorResponse("El costo unitario es requerido", 400);
    }

    // ── Validar cuenta o tarjeta ────────────────────────────────────
    if (!isCreditCard) {
      const [account] = await sql`
        SELECT id FROM accounts WHERE id = ${account_id} AND user_id = ${userId} AND is_active = TRUE
      `;
      if (!account) return createErrorResponse("Cuenta no encontrada", 404);
    } else {
      const [card] = await sql`
        SELECT id FROM credit_cards WHERE id = ${Number(credit_card_id)} AND user_id = ${userId} AND is_active = TRUE
      `;
      if (!card) return createErrorResponse("Tarjeta de crédito no encontrada", 404);
    }

    // ── Validar productos y variantes ───────────────────────────────
    const productInfoMap = new Map<number, { name: string; sku: string | null }>();
    for (const item of items) {
      const [product] = await sql`
        SELECT id, name, sku, is_service FROM products
        WHERE id = ${item.product_id} AND user_id = ${userId} AND is_active = TRUE
      `;
      if (!product)
        return createErrorResponse(`Producto #${item.product_id} no encontrado`, 404);
      if (product.is_service)
        return createErrorResponse(
          `"${product.name}" es un servicio y no puede tener compras de inventario`,
          400
        );
      productInfoMap.set(item.product_id, { name: product.name, sku: product.sku ?? null });

      if (item.variant_id) {
        const [variant] = await sql`
          SELECT id FROM product_variants
          WHERE id         = ${Number(item.variant_id)}
            AND product_id = ${item.product_id}
            AND user_id    = ${userId}
            AND is_active  = TRUE
        `;
        if (!variant)
          return createErrorResponse(
            `Variante #${item.variant_id} no encontrada o no pertenece al producto #${item.product_id}`,
            404
          );
      }
    }

    // ── Calcular costos ─────────────────────────────────────────────
    const rate          = Number(exchange_rate) || 1;
    const shippingTotal = Number(shipping)      || 0; // siempre en moneda local
    const curr          = currency || "HNL";
    const isUsd         = curr === "USD";
    const totalUnits    = items.reduce((acc: number, i: any) => acc + Number(i.quantity), 0);

    // Shipping ingresado en moneda local — distribuir por unidad directamente
    const shippingPerUnitLocal = totalUnits > 0 ? shippingTotal / totalUnits : 0;

    const processedItems = items.map((item: any) => {
      const qty                = Number(item.quantity);
      const unitCostInCurrency = Number(item.unit_cost_usd); // en moneda de compra (USD o HNL)
      const unitCostLocal      = isUsd ? unitCostInCurrency * rate : unitCostInCurrency;
      const finalUnitCostLocal = unitCostLocal + shippingPerUnitLocal;

      return {
        product_id:        Number(item.product_id),
        variant_id:        item.variant_id ? Number(item.variant_id) : null,
        quantity:          qty,
        unit_cost_usd:     unitCostInCurrency,       // en moneda de compra
        unit_cost:         finalUnitCostLocal,        // en moneda local (para COGS)
        total_cost:        finalUnitCostLocal * qty,  // en moneda local
        total_in_currency: unitCostInCurrency * qty,  // en moneda de compra, sin envío
      };
    });

    // totalInCurrency: sólo productos en moneda de compra (para CC)
    // totalLocal: productos + envío en moneda local (para cuentas)
    const totalInCurrency = processedItems.reduce((acc: number, i: any) => acc + i.total_in_currency, 0);
    const totalLocal      = processedItems.reduce((acc: number, i: any) => acc + i.total_cost, 0);
    const productsLocal   = totalLocal - shippingTotal;
    const subtotal        = totalLocal;
    const total           = totalLocal;
    const occurredAt      = purchased_at ?? new Date().toISOString();

    // ¿Se paga el envío desde una cuenta separada?
    const shippingAccId      = shipping_account_id ? Number(shipping_account_id) : null;
    const hasShippingAccount = !!shippingAccId && shippingTotal > 0;

    let txDescription: string;
    if (processedItems.length === 1) {
      const info = productInfoMap.get(processedItems[0].product_id);
      txDescription = `Compra — ${info?.name ?? 'producto'}${info?.sku ? ` (${info.sku})` : ''}`;
    } else {
      txDescription = `Compra de ${processedItems.length} productos`;
    }

    // ── Transacción atómica ─────────────────────────────────────────
    await sql`BEGIN`;
    try {
      // 1. Crear purchase_batch
      const [batch] = await sql`
        INSERT INTO purchase_batches (
          user_id, account_id, shipping_account_id, currency, exchange_rate,
          subtotal, shipping, tax, total,
          is_paid, purchased_at, notes, status
        ) VALUES (
          ${userId}, ${isCreditCard ? null : account_id}, ${shippingAccId},
          ${curr}, ${rate},
          ${subtotal}, ${shippingTotal}, ${0}, ${total},
          ${false}, ${occurredAt}, ${notes ?? null}, ${status}
        )
        RETURNING id
      `;
      const purchaseBatchId = batch.id as number;

      // 2. Items (+ inventory sólo si status = COMPLETED)
      for (const item of processedItems) {
        const [batchItem] = await sql`
          INSERT INTO purchase_batch_items (
            user_id, purchase_batch_id, product_id, variant_id,
            quantity, unit_cost_usd, unit_cost, total_cost
          ) VALUES (
            ${userId}, ${purchaseBatchId},
            ${item.product_id}, ${item.variant_id},
            ${item.quantity}, ${item.unit_cost_usd},
            ${item.unit_cost}, ${item.total_cost}
          )
          RETURNING id
        `;

        if (status === "COMPLETED") {
          await sql`
            INSERT INTO inventory_batches (
              user_id, product_id, variant_id, purchase_batch_item_id,
              qty_in, qty_available, unit_cost, received_at
            ) VALUES (
              ${userId}, ${item.product_id}, ${item.variant_id}, ${batchItem.id},
              ${item.quantity}, ${item.quantity}, ${item.unit_cost}, ${occurredAt}
            )
          `;

          await sql`
            INSERT INTO inventory_movements (
              user_id, movement_type, product_id, variant_id,
              quantity, reference_type, reference_id, notes
            ) VALUES (
              ${userId}, 'IN', ${item.product_id}, ${item.variant_id},
              ${item.quantity}, 'PURCHASE', ${purchaseBatchId}, ${notes ?? null}
            )
          `;
        }
      }

      // 3. Movimiento financiero
      if (isCreditCard) {
        // CC se carga solo por los productos; el envío va a cuenta separada (si aplica)
        const ccAmount      = totalInCurrency; // siempre productos en moneda de compra
        const ccAmountLocal = hasShippingAccount ? productsLocal : totalLocal;
        await sql`
          INSERT INTO credit_card_transactions (
            user_id, credit_card_id, type, description,
            amount, currency, exchange_rate, amount_local,
            occurred_at
          ) VALUES (
            ${userId}, ${Number(credit_card_id)}, 'CHARGE', ${txDescription},
            ${ccAmount}, ${curr}, ${isUsd ? rate : null}, ${ccAmountLocal},
            ${occurredAt}
          )
        `;
        if (isUsd) {
          await sql`UPDATE credit_cards SET balance_usd = balance_usd + ${ccAmount}, updated_at = NOW() WHERE id = ${Number(credit_card_id)} AND user_id = ${userId}`;
        } else {
          await sql`UPDATE credit_cards SET balance = balance + ${ccAmount}, updated_at = NOW() WHERE id = ${Number(credit_card_id)} AND user_id = ${userId}`;
        }
        if (hasShippingAccount) {
          await sql`
            INSERT INTO transactions (
              user_id, account_id, type, amount,
              description, reference_type, reference_id, occurred_at
            ) VALUES (
              ${userId}, ${shippingAccId}, 'EXPENSE', ${shippingTotal},
              ${'Pago de envío'}, 'PURCHASE_SHIPPING', ${purchaseBatchId}, ${occurredAt}
            )
          `;
          await sql`UPDATE accounts SET balance = balance - ${shippingTotal} WHERE id = ${shippingAccId} AND user_id = ${userId}`;
        }
      } else if (hasShippingAccount) {
        // Productos desde cuenta principal; envío desde cuenta separada
        await sql`
          INSERT INTO transactions (
            user_id, account_id, type, amount,
            description, reference_type, reference_id, occurred_at
          ) VALUES (
            ${userId}, ${account_id}, 'EXPENSE', ${productsLocal},
            ${txDescription}, 'PURCHASE', ${purchaseBatchId}, ${occurredAt}
          )
        `;
        await sql`UPDATE accounts SET balance = balance - ${productsLocal} WHERE id = ${account_id} AND user_id = ${userId}`;
        await sql`
          INSERT INTO transactions (
            user_id, account_id, type, amount,
            description, reference_type, reference_id, occurred_at
          ) VALUES (
            ${userId}, ${shippingAccId}, 'EXPENSE', ${shippingTotal},
            ${'Pago de envío'}, 'PURCHASE_SHIPPING', ${purchaseBatchId}, ${occurredAt}
          )
        `;
        await sql`UPDATE accounts SET balance = balance - ${shippingTotal} WHERE id = ${shippingAccId} AND user_id = ${userId}`;
      } else {
        await sql`
          INSERT INTO transactions (
            user_id, account_id, type, amount,
            description, reference_type, reference_id, occurred_at
          ) VALUES (
            ${userId}, ${account_id}, 'EXPENSE', ${total},
            ${txDescription}, 'PURCHASE', ${purchaseBatchId}, ${occurredAt}
          )
        `;
        await sql`UPDATE accounts SET balance = balance - ${total} WHERE id = ${account_id} AND user_id = ${userId}`;
      }

      await sql`COMMIT`;

      return Response.json(
        {
          message: status === "PENDING"
            ? "Compra registrada como pendiente"
            : "Compra registrada exitosamente",
          data: {
            id:    purchaseBatchId,
            total,
            items: processedItems.length,
          },
        },
        { status: 201 }
      );

    } catch (innerError) {
      await sql`ROLLBACK`;
      throw innerError;
    }

  } catch (error) {
    console.error("POST /api/purchases:", error);
    return createErrorResponse("Error al registrar la compra", 500);
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;

    const purchases = await sql`
      SELECT
        pb.id,
        pb.account_id,
        a.name   AS account_name,
        pb.shipping_account_id,
        sa.name  AS shipping_account_name,
        pb.currency,
        pb.exchange_rate,
        pb.subtotal,
        pb.shipping,
        pb.total,
        pb.status,
        pb.is_paid,
        pb.purchased_at,
        pb.notes,
        pb.created_at,
        COUNT(pbi.id)::int AS items_count
      FROM purchase_batches pb
      LEFT JOIN accounts             a  ON a.id  = pb.account_id
      LEFT JOIN accounts             sa ON sa.id = pb.shipping_account_id
      LEFT JOIN purchase_batch_items pbi ON pbi.purchase_batch_id = pb.id
      WHERE pb.user_id = ${userId}
      GROUP BY pb.id, a.name, sa.name
      ORDER BY pb.purchased_at DESC
    `;

    return Response.json({ data: purchases, total: purchases.length });
  } catch (error) {
    console.error("GET /api/purchases:", error);
    return createErrorResponse("Error al obtener compras", 500);
  }
}