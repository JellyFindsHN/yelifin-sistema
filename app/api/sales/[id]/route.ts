// app/api/sales/[id]/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ id: string }> };

// ── GET /api/sales/[id] ────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const saleId = Number(id);

    if (isNaN(saleId)) return createErrorResponse("ID inválido", 400);

    const [sale] = await sql`
      SELECT
        s.*,
        c.name AS customer_name,
        a.name AS account_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      LEFT JOIN accounts  a ON a.id = s.account_id
      WHERE s.id = ${saleId} AND s.user_id = ${userId}
    `;

    if (!sale) return createErrorResponse("Venta no encontrada", 404);

    const items = await sql`
      SELECT si.*, p.name AS product_name, p.image_url
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = ${saleId} AND si.user_id = ${userId}
    `;

    const supplies = await sql`
      SELECT ss.id, ss.supply_id, su.name AS supply_name,
             ss.quantity, ss.unit_cost, ss.line_total
      FROM sale_supplies ss
      JOIN supplies su ON su.id = ss.supply_id
      WHERE ss.sale_id = ${saleId} AND ss.user_id = ${userId}
    `;

    return Response.json({ data: { ...sale, items, supplies } });

  } catch (error) {
    console.error("❌ GET /api/sales/[id]:", error);
    return createErrorResponse("Error al obtener venta", 500);
  }
}

// ── PATCH /api/sales/[id] ──────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id } = await params;
    const saleId = Number(id);

    if (isNaN(saleId)) return createErrorResponse("ID inválido", 400);

    const body = await request.json();
    const action = body.action as "confirm" | "cancel" | "edit";

    if (!["confirm", "cancel", "edit"].includes(action))
      return createErrorResponse("Acción inválida. Usar: confirm | cancel | edit", 400);

    const [sale] = await sql`
      SELECT * FROM sales WHERE id = ${saleId} AND user_id = ${userId}
    `;
    if (!sale) return createErrorResponse("Venta no encontrada", 404);

    if (sale.status !== "PENDING")
      return createErrorResponse("Solo se pueden modificar ventas pendientes", 400);

    // ── CONFIRM ──────────────────────────────────────────────────────
    if (action === "confirm") {
      const txParts: string[] = [`Venta ${sale.sale_number}`];
      if (Number(sale.tax_rate) > 0) txParts.push(`ISV ${sale.tax_rate}% incluido`);
      if (Number(sale.shipping_cost) > 0) txParts.push(`envío L ${Number(sale.shipping_cost).toFixed(2)}`);
      const txDescription = txParts.length > 1
        ? `${txParts[0]} (${txParts.slice(1).join(", ")})`
        : txParts[0];

      const refType = sale.event_id ? "EVENT" : "SALE";
      const refId = sale.event_id ? sale.event_id : saleId;

      await sql`BEGIN`;
      try {
        await sql`
          UPDATE sales SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
          WHERE id = ${saleId} AND user_id = ${userId}
        `;
        await sql`
          INSERT INTO transactions (
            user_id, type, account_id, amount,
            category, description, reference_type, reference_id, occurred_at
          ) VALUES (
            ${userId}, 'INCOME', ${sale.account_id}, ${sale.total},
            'Ventas', ${txDescription}, ${refType}, ${refId}, ${sale.sold_at}
          )
        `;
        await sql`
          UPDATE accounts SET balance = balance + ${sale.total}
          WHERE id = ${sale.account_id} AND user_id = ${userId}
        `;
        if (sale.customer_id) {
          await sql`
            UPDATE customers
            SET total_orders = total_orders + 1,
                total_spent  = total_spent + ${sale.total},
                updated_at   = CURRENT_TIMESTAMP
            WHERE id = ${sale.customer_id} AND user_id = ${userId}
          `;
        }
        await sql`COMMIT`;
        return Response.json({ message: "Venta confirmada", data: { id: saleId, status: "COMPLETED" } });
      } catch (e) {
        await sql`ROLLBACK`;
        throw e;
      }
    }

    // ── CANCEL ───────────────────────────────────────────────────────
    if (action === "cancel") {
      const items = await sql`
        SELECT product_id, variant_id, quantity FROM sale_items
        WHERE sale_id = ${saleId} AND user_id = ${userId}
      `;

      await sql`BEGIN`;
      try {
        for (const item of items) {
          const [lastBatch] = await sql`
            SELECT id FROM inventory_batches
            WHERE user_id = ${userId} AND product_id = ${item.product_id}
            ORDER BY received_at DESC LIMIT 1
          `;
          if (lastBatch) {
            await sql`
              UPDATE inventory_batches
              SET qty_available = qty_available + ${item.quantity}
              WHERE id = ${lastBatch.id} AND user_id = ${userId}
            `;
          }
          await sql`
            INSERT INTO inventory_movements (
              user_id, movement_type, product_id, variant_id,
              quantity, reference_type, reference_id
            ) VALUES (
              ${userId}, 'IN', ${item.product_id}, ${item.variant_id},
              ${item.quantity}, 'SALE_CANCELLED', ${saleId}
            )
          `;
        }

        const supplies = await sql`
          SELECT supply_id, quantity FROM sale_supplies
          WHERE sale_id = ${saleId} AND user_id = ${userId}
        `;
        for (const s of supplies) {
          await sql`
            UPDATE supplies SET stock = stock + ${s.quantity}
            WHERE id = ${s.supply_id} AND user_id = ${userId}
          `;
          await sql`
            INSERT INTO supply_movements (user_id, movement_type, supply_id, quantity, reference_type, reference_id)
            VALUES (${userId}, 'IN', ${s.supply_id}, ${s.quantity}, 'SALE_CANCELLED', ${saleId})
          `;
        }

        await sql`DELETE FROM sale_supplies WHERE sale_id = ${saleId} AND user_id = ${userId}`;
        await sql`DELETE FROM sale_items    WHERE sale_id = ${saleId} AND user_id = ${userId}`;
        await sql`DELETE FROM sales         WHERE id      = ${saleId} AND user_id = ${userId}`;

        await sql`COMMIT`;
        return Response.json({ message: "Venta cancelada y stock devuelto", data: { id: saleId, status: "CANCELLED" } });
      } catch (e) {
        await sql`ROLLBACK`;
        throw e;
      }
    }

    // ── EDIT ─────────────────────────────────────────────────────────
    if (action === "edit") {
      const {
        items: newItems,
        discount,
        shipping_cost,
        tax_rate,
        notes,
        customer_id,
        account_id,   // ← ahora se lee del body
      } = body;

      if (!newItems || !Array.isArray(newItems) || newItems.length === 0)
        return createErrorResponse("Se requiere al menos un producto", 400);

      const taxRateNum = Number(tax_rate ?? sale.tax_rate) || 0;
      if (![0, 15, 18].includes(taxRateNum))
        return createErrorResponse("El porcentaje de impuesto debe ser 0, 15 o 18", 400);

      // Validar cuenta si se está cambiando
      if (account_id && account_id !== sale.account_id) {
        const [account] = await sql`
          SELECT id FROM accounts WHERE id = ${account_id} AND user_id = ${userId} AND is_active = TRUE
        `;
        if (!account) return createErrorResponse("Cuenta de destino no encontrada", 404);
      }

      const currentItems = await sql`
        SELECT product_id, variant_id, quantity FROM sale_items
        WHERE sale_id = ${saleId} AND user_id = ${userId}
      `;

      const currentMap = new Map<number, number>();
      for (const i of currentItems) currentMap.set(Number(i.product_id), Number(i.quantity));

      const newMap = new Map<number, { quantity: number; unit_price: number; discount: number }>();
      for (const i of newItems) newMap.set(Number(i.product_id), {
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        discount: Number(i.discount ?? 0),
      });

      // Validar stock para aumentos
      for (const [productId, newData] of newMap.entries()) {
        const currentQty = currentMap.get(productId) ?? 0;
        const delta = newData.quantity - currentQty;
        if (delta > 0) {
          const batches = await sql`
            SELECT COALESCE(SUM(qty_available), 0)::int AS available
            FROM inventory_batches
            WHERE user_id = ${userId} AND product_id = ${productId}
          `;
          const available = Number(batches[0]?.available ?? 0);
          if (available < delta) {
            const [product] = await sql`SELECT name FROM products WHERE id = ${productId}`;
            return createErrorResponse(
              `Stock insuficiente para "${product?.name}". Disponible: ${available}`, 400
            );
          }
        }
      }

      // Recalcular costos FIFO
      const processedItems: any[] = [];
      for (const [productId, data] of newMap.entries()) {
        const currentQty = currentMap.get(productId) ?? 0;
        const delta = data.quantity - currentQty;

        let unitCost = 0;
        if (delta === 0) {
          const [existing] = await sql`
            SELECT unit_cost FROM sale_items
            WHERE sale_id = ${saleId} AND product_id = ${productId} AND user_id = ${userId}
          `;
          unitCost = Number(existing?.unit_cost ?? 0);
        } else {
          const batches = await sql`
            SELECT id, qty_available, unit_cost FROM inventory_batches
            WHERE user_id = ${userId} AND product_id = ${productId} AND qty_available > 0
            ORDER BY received_at ASC
          `;
          let remaining = data.quantity;
          let totalCost = 0;
          for (const batch of batches) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, Number(batch.qty_available));
            totalCost += take * Number(batch.unit_cost);
            remaining -= take;
          }
          unitCost = data.quantity > 0 ? totalCost / data.quantity : 0;
        }

        processedItems.push({
          product_id: productId,
          quantity: data.quantity,
          unit_price: data.unit_price,
          unit_cost: unitCost,
          discount: data.discount,
          line_total: data.unit_price * data.quantity - data.discount,
          delta,
        });
      }

      const newSubtotal = processedItems.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
      const globalDiscount = Number(discount ?? sale.discount) || 0;
      const itemDiscounts = processedItems.reduce((acc, i) => acc + i.discount, 0);
      const totalDiscount = globalDiscount + itemDiscounts;
      const shippingAmount = Number(shipping_cost ?? sale.shipping_cost) || 0;
      const taxableBase = newSubtotal - totalDiscount;
      const taxAmount = taxRateNum > 0 ? taxableBase * taxRateNum / (100 + taxRateNum) : 0;
      const grandTotal = taxableBase + shippingAmount;

      // Cuenta final a usar
      const finalAccountId = account_id ?? sale.account_id;

      await sql`BEGIN`;
      try {
        // Ajustar inventario
        for (const item of processedItems) {
          if (item.delta > 0) {
            const batches = await sql`
              SELECT id, qty_available FROM inventory_batches
              WHERE user_id = ${userId} AND product_id = ${item.product_id} AND qty_available > 0
              ORDER BY received_at ASC
            `;
            let remaining = item.delta;
            for (const batch of batches) {
              if (remaining <= 0) break;
              const take = Math.min(remaining, Number(batch.qty_available));
              await sql`
                UPDATE inventory_batches SET qty_available = qty_available - ${take}
                WHERE id = ${batch.id} AND user_id = ${userId}
              `;
              remaining -= take;
            }
            await sql`
              INSERT INTO inventory_movements (user_id, movement_type, product_id, quantity, reference_type, reference_id)
              VALUES (${userId}, 'OUT', ${item.product_id}, ${item.delta}, 'SALE', ${saleId})
            `;
          } else if (item.delta < 0) {
            const [lastBatch] = await sql`
              SELECT id FROM inventory_batches
              WHERE user_id = ${userId} AND product_id = ${item.product_id}
              ORDER BY received_at DESC LIMIT 1
            `;
            if (lastBatch) {
              await sql`
                UPDATE inventory_batches SET qty_available = qty_available + ${Math.abs(item.delta)}
                WHERE id = ${lastBatch.id} AND user_id = ${userId}
              `;
            }
            await sql`
              INSERT INTO inventory_movements (user_id, movement_type, product_id, quantity, reference_type, reference_id)
              VALUES (${userId}, 'IN', ${item.product_id}, ${Math.abs(item.delta)}, 'SALE_EDITED', ${saleId})
            `;
          }
        }

        // Devolver stock de productos eliminados
        for (const [productId, currentQty] of currentMap.entries()) {
          if (!newMap.has(productId)) {
            const [lastBatch] = await sql`
              SELECT id FROM inventory_batches
              WHERE user_id = ${userId} AND product_id = ${productId}
              ORDER BY received_at DESC LIMIT 1
            `;
            if (lastBatch) {
              await sql`
                UPDATE inventory_batches SET qty_available = qty_available + ${currentQty}
                WHERE id = ${lastBatch.id} AND user_id = ${userId}
              `;
            }
            await sql`
              INSERT INTO inventory_movements (user_id, movement_type, product_id, quantity, reference_type, reference_id)
              VALUES (${userId}, 'IN', ${productId}, ${currentQty}, 'SALE_EDITED', ${saleId})
            `;
          }
        }

        // Reemplazar items
        await sql`DELETE FROM sale_items WHERE sale_id = ${saleId} AND user_id = ${userId}`;
        for (const item of processedItems) {
          await sql`
            INSERT INTO sale_items (user_id, sale_id, product_id, quantity, unit_price, unit_cost, line_total)
            VALUES (${userId}, ${saleId}, ${item.product_id}, ${item.quantity}, ${item.unit_price}, ${item.unit_cost}, ${item.line_total})
          `;
        }

        // Actualizar cabecera — ahora incluye account_id
        await sql`
          UPDATE sales SET
            customer_id   = ${customer_id ?? sale.customer_id},
            payment_method = (
              SELECT CASE type
                WHEN 'CASH'   THEN 'CASH'
                WHEN 'BANK'   THEN 'TRANSFER'
                WHEN 'WALLET' THEN 'TRANSFER'
                ELSE 'OTHER'
              END
              FROM accounts WHERE id = ${finalAccountId} AND user_id = ${userId}),
            account_id    = ${finalAccountId},
            subtotal      = ${newSubtotal},
            discount      = ${totalDiscount},
            tax_rate      = ${taxRateNum},
            tax           = ${taxAmount},
            shipping_cost = ${shippingAmount},
            total         = ${grandTotal},
            notes         = ${notes ?? sale.notes},
            updated_at    = CURRENT_TIMESTAMP
          WHERE id = ${saleId} AND user_id = ${userId}
        `;

        await sql`COMMIT`;
        return Response.json({
          message: "Venta actualizada",
          data: {
            id: saleId, status: "PENDING",
            subtotal: newSubtotal, discount: totalDiscount,
            tax_rate: taxRateNum, tax: taxAmount,
            shipping_cost: shippingAmount, total: grandTotal,
            account_id: finalAccountId,
          },
        });
      } catch (e) {
        await sql`ROLLBACK`;
        throw e;
      }
    }

  } catch (error) {
    console.error("❌ PATCH /api/sales/[id]:", error);
    return createErrorResponse("Error al procesar la acción", 500);
  }
}