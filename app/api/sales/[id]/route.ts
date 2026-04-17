// app/api/sales/[id]/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAuth, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

type Params = { params: Promise<{ id: string }> };

<<<<<<< Updated upstream
=======
// Clave compuesta para identificar un item único (producto + variante)
function itemKey(productId: number, variantId: number | null) {
  return `${productId}-${variantId ?? "null"}`;
}

>>>>>>> Stashed changes
// ── GET /api/sales/[id] ────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id }     = await params;
    const saleId     = Number(id);

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
      SELECT
        si.*,
        p.name       AS product_name,
        p.image_url,
        p.is_service,
        pv.variant_name
      FROM sale_items si
      JOIN  products         p  ON p.id  = si.product_id
      LEFT JOIN product_variants pv ON pv.id = si.variant_id
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
    console.error("GET /api/sales/[id]:", error);
    return createErrorResponse("Error al obtener venta", 500);
  }
}

// ── PATCH /api/sales/[id] ──────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id }     = await params;
    const saleId     = Number(id);

    if (isNaN(saleId)) return createErrorResponse("ID inválido", 400);

    const body   = await request.json();
    const action = body.action as "confirm" | "cancel" | "edit";

    if (!["confirm", "cancel", "edit"].includes(action))
      return createErrorResponse("Acción inválida. Usar: confirm | cancel | edit", 400);

    const [sale] = await sql`
      SELECT * FROM sales WHERE id = ${saleId} AND user_id = ${userId}
    `;
    if (!sale)                   return createErrorResponse("Venta no encontrada", 404);
    if (sale.status !== "PENDING")
      return createErrorResponse("Solo se pueden modificar ventas pendientes", 400);

    // ── CONFIRM ──────────────────────────────────────────────────────
    if (action === "confirm") {
      const txParts: string[] = [`Venta ${sale.sale_number}`];
      if (Number(sale.tax_rate)     > 0) txParts.push(`ISV ${sale.tax_rate}% incluido`);
      if (Number(sale.shipping_cost)> 0) txParts.push(`envío L ${Number(sale.shipping_cost).toFixed(2)}`);
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
                total_spent  = total_spent  + ${sale.total},
                updated_at   = CURRENT_TIMESTAMP
            WHERE id = ${sale.customer_id} AND user_id = ${userId}
          `;
        }
        await sql`COMMIT`;
        return Response.json({
          message: "Venta confirmada",
          data: { id: saleId, status: "COMPLETED" },
        });
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
<<<<<<< Updated upstream
          const [lastBatch] = await sql`
            SELECT id FROM inventory_batches
            WHERE user_id = ${userId} AND product_id = ${item.product_id}
            ORDER BY received_at DESC LIMIT 1
          `;
=======
          if (item.is_service) continue;

          const variantId = item.variant_id ? Number(item.variant_id) : null;

          // Restaurar al último batch de la variante correcta
          const [lastBatch] = variantId !== null
            ? await sql`
                SELECT id FROM inventory_batches
                WHERE user_id    = ${userId}
                  AND product_id = ${item.product_id}
                  AND variant_id = ${variantId}
                ORDER BY received_at DESC LIMIT 1
              `
            : await sql`
                SELECT id FROM inventory_batches
                WHERE user_id    = ${userId}
                  AND product_id = ${item.product_id}
                  AND variant_id IS NULL
                ORDER BY received_at DESC LIMIT 1
              `;

>>>>>>> Stashed changes
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
              ${userId}, 'IN', ${item.product_id}, ${variantId},
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
<<<<<<< Updated upstream
            INSERT INTO supply_movements (user_id, movement_type, supply_id, quantity, reference_type, reference_id)
            VALUES (${userId}, 'IN', ${s.supply_id}, ${s.quantity}, 'SALE_CANCELLED', ${saleId})
=======
            INSERT INTO supply_movements (
              user_id, movement_type, supply_id,
              quantity, reference_type, reference_id
            ) VALUES (
              ${userId}, 'IN', ${s.supply_id},
              ${s.quantity}, 'SALE_CANCELLED', ${saleId}
            )
>>>>>>> Stashed changes
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
        const [acc] = await sql`
          SELECT id FROM accounts
          WHERE id = ${account_id} AND user_id = ${userId} AND is_active = TRUE
        `;
        if (!acc) return createErrorResponse("Cuenta de destino no encontrada", 404);
      }

<<<<<<< Updated upstream
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
=======
      // Traer items actuales — clave compuesta producto+variante
      const currentItems = await sql`
        SELECT si.product_id, si.variant_id, si.quantity, si.unit_cost, p.is_service
        FROM sale_items si
        JOIN products p ON p.id = si.product_id
        WHERE si.sale_id = ${saleId} AND si.user_id = ${userId}
      `;

      type CurrentItem = {
        quantity:   number;
        unit_cost:  number;
        is_service: boolean;
        variant_id: number | null;
      };
      const currentMap = new Map<string, CurrentItem>();
      for (const i of currentItems) {
        const vid = i.variant_id ? Number(i.variant_id) : null;
        currentMap.set(itemKey(Number(i.product_id), vid), {
          quantity:   Number(i.quantity),
          unit_cost:  Number(i.unit_cost),
          is_service: Boolean(i.is_service),
          variant_id: vid,
        });
      }

      type NewItem = {
        product_id: number;
        variant_id: number | null;
        quantity:   number;
        unit_price: number;
        discount:   number;
      };
      const newMap = new Map<string, NewItem>();
      for (const i of newItems) {
        const vid = i.variant_id ? Number(i.variant_id) : null;
        newMap.set(itemKey(Number(i.product_id), vid), {
          product_id: Number(i.product_id),
          variant_id: vid,
          quantity:   Number(i.quantity),
          unit_price: Number(i.unit_price),
          discount:   Number(i.discount ?? 0),
        });
      }

      // Validar stock para aumentos de cantidad en productos físicos
      for (const [key, newData] of newMap.entries()) {
        const current    = currentMap.get(key);
        const currentQty = current?.quantity ?? 0;
        const isService  = current?.is_service ?? false;
        const delta      = newData.quantity - currentQty;

        if (delta <= 0) continue;

        // Verificar si es servicio (puede ser un producto nuevo en el edit)
        const [product] = await sql`
          SELECT name, is_service FROM products
          WHERE id = ${newData.product_id} AND user_id = ${userId}
        `;
        if (!product || product.is_service || isService) continue;

        // Verificar variante si aplica
        if (newData.variant_id !== null) {
          const [variant] = await sql`
            SELECT id FROM product_variants
            WHERE id         = ${newData.variant_id}
              AND product_id = ${newData.product_id}
              AND user_id    = ${userId}
              AND is_active  = TRUE
          `;
          if (!variant)
            return createErrorResponse(
              `Variante #${newData.variant_id} no válida para "${product.name}"`, 404
            );
        }

        const [batchesSum] = newData.variant_id !== null
          ? await sql`
              SELECT COALESCE(SUM(qty_available), 0)::numeric AS available
              FROM inventory_batches
              WHERE user_id    = ${userId}
                AND product_id = ${newData.product_id}
                AND variant_id = ${newData.variant_id}
            `
          : await sql`
              SELECT COALESCE(SUM(qty_available), 0)::numeric AS available
              FROM inventory_batches
              WHERE user_id    = ${userId}
                AND product_id = ${newData.product_id}
                AND variant_id IS NULL
            `;

        const available = Number(batchesSum?.available ?? 0);
        const label = newData.variant_id !== null
          ? `${product.name} (variante #${newData.variant_id})`
          : product.name;

        if (available < delta) {
          return createErrorResponse(
            `Stock insuficiente para "${label}". Disponible: ${available}`,
            400
          );
        }
      }

      // Recalcular costos FIFO por variante
      const processedItems: any[] = [];

      for (const [key, data] of newMap.entries()) {
        const current    = currentMap.get(key);
        const currentQty = current?.quantity ?? 0;
        const delta      = data.quantity - currentQty;
>>>>>>> Stashed changes

        const [product] = await sql`
          SELECT is_service FROM products
          WHERE id = ${data.product_id} AND user_id = ${userId}
        `;
        const isService = Boolean(product?.is_service);

        let unitCost = 0;
<<<<<<< Updated upstream
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
=======

        if (!isService) {
          if (delta === 0 && current) {
            // Sin cambio de cantidad → conservar costo original
            unitCost = current.unit_cost;
          } else {
            // Con cambio → recalcular FIFO completo por variante
            const batches = data.variant_id !== null
              ? await sql`
                  SELECT id, qty_available, unit_cost
                  FROM inventory_batches
                  WHERE user_id    = ${userId}
                    AND product_id = ${data.product_id}
                    AND variant_id = ${data.variant_id}
                    AND qty_available > 0
                  ORDER BY received_at ASC
                `
              : await sql`
                  SELECT id, qty_available, unit_cost
                  FROM inventory_batches
                  WHERE user_id    = ${userId}
                    AND product_id = ${data.product_id}
                    AND variant_id IS NULL
                    AND qty_available > 0
                  ORDER BY received_at ASC
                `;

            let remaining = data.quantity;
            let totalCost = 0;
            for (const batch of batches) {
              if (remaining <= 0) break;
              const take  = Math.min(remaining, Number(batch.qty_available));
              totalCost  += take * Number(batch.unit_cost);
              remaining  -= take;
            }
            unitCost = data.quantity > 0 ? totalCost / data.quantity : 0;
>>>>>>> Stashed changes
          }
          unitCost = data.quantity > 0 ? totalCost / data.quantity : 0;
        }

        processedItems.push({
<<<<<<< Updated upstream
          product_id: productId,
          quantity: data.quantity,
=======
          product_id: data.product_id,
          variant_id: data.variant_id,
          quantity:   data.quantity,
>>>>>>> Stashed changes
          unit_price: data.unit_price,
          unit_cost: unitCost,
          discount: data.discount,
          line_total: data.unit_price * data.quantity - data.discount,
          delta,
        });
      }

      const newSubtotal = processedItems.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
      const globalDiscount = Number(discount ?? sale.discount) || 0;
<<<<<<< Updated upstream
      const itemDiscounts = processedItems.reduce((acc, i) => acc + i.discount, 0);
      const totalDiscount = globalDiscount + itemDiscounts;
      const shippingAmount = Number(shipping_cost ?? sale.shipping_cost) || 0;
      const taxableBase = newSubtotal - totalDiscount;
      const taxAmount = taxRateNum > 0 ? taxableBase * taxRateNum / (100 + taxRateNum) : 0;
      const grandTotal = taxableBase + shippingAmount;

      // Cuenta final a usar
=======
      const itemDiscounts  = processedItems.reduce((acc, i) => acc + i.discount, 0);
      const totalDiscount  = globalDiscount + itemDiscounts;
      const shippingAmount = (shipping_cost !== undefined && shipping_cost !== null)
        ? Number(shipping_cost)
        : Number(sale.shipping_cost);
      const taxableBase    = newSubtotal - totalDiscount;
      const taxAmount      = taxRateNum > 0 ? taxableBase * taxRateNum / (100 + taxRateNum) : 0;
      const grandTotal     = taxableBase + shippingAmount;
>>>>>>> Stashed changes
      const finalAccountId = account_id ?? sale.account_id;

      await sql`BEGIN`;
      try {
<<<<<<< Updated upstream
        // Ajustar inventario
=======
        // Ajustar inventario por variante (solo físicos)
>>>>>>> Stashed changes
        for (const item of processedItems) {
          if (item.delta > 0) {
            // Necesita más stock → descontar FIFO por variante
            const batches = item.variant_id !== null
              ? await sql`
                  SELECT id, qty_available FROM inventory_batches
                  WHERE user_id    = ${userId}
                    AND product_id = ${item.product_id}
                    AND variant_id = ${item.variant_id}
                    AND qty_available > 0
                  ORDER BY received_at ASC
                `
              : await sql`
                  SELECT id, qty_available FROM inventory_batches
                  WHERE user_id    = ${userId}
                    AND product_id = ${item.product_id}
                    AND variant_id IS NULL
                    AND qty_available > 0
                  ORDER BY received_at ASC
                `;

            let remaining = item.delta;
            for (const batch of batches) {
              if (remaining <= 0) break;
              const take = Math.min(remaining, Number(batch.qty_available));
              await sql`
                UPDATE inventory_batches
                SET qty_available = qty_available - ${take}
                WHERE id = ${batch.id} AND user_id = ${userId}
              `;
              remaining -= take;
            }

            await sql`
<<<<<<< Updated upstream
              INSERT INTO inventory_movements (user_id, movement_type, product_id, quantity, reference_type, reference_id)
              VALUES (${userId}, 'OUT', ${item.product_id}, ${item.delta}, 'SALE', ${saleId})
=======
              INSERT INTO inventory_movements (
                user_id, movement_type, product_id, variant_id,
                quantity, reference_type, reference_id
              ) VALUES (
                ${userId}, 'OUT', ${item.product_id}, ${item.variant_id},
                ${item.delta}, 'SALE_EDITED', ${saleId}
              )
>>>>>>> Stashed changes
            `;

          } else if (item.delta < 0) {
            // Se redujo cantidad → devolver al último batch de la variante
            const [lastBatch] = item.variant_id !== null
              ? await sql`
                  SELECT id FROM inventory_batches
                  WHERE user_id    = ${userId}
                    AND product_id = ${item.product_id}
                    AND variant_id = ${item.variant_id}
                  ORDER BY received_at DESC LIMIT 1
                `
              : await sql`
                  SELECT id FROM inventory_batches
                  WHERE user_id    = ${userId}
                    AND product_id = ${item.product_id}
                    AND variant_id IS NULL
                  ORDER BY received_at DESC LIMIT 1
                `;

            if (lastBatch) {
              await sql`
                UPDATE inventory_batches SET qty_available = qty_available + ${Math.abs(item.delta)}
                WHERE id = ${lastBatch.id} AND user_id = ${userId}
              `;
            }

            await sql`
<<<<<<< Updated upstream
              INSERT INTO inventory_movements (user_id, movement_type, product_id, quantity, reference_type, reference_id)
              VALUES (${userId}, 'IN', ${item.product_id}, ${Math.abs(item.delta)}, 'SALE_EDITED', ${saleId})
=======
              INSERT INTO inventory_movements (
                user_id, movement_type, product_id, variant_id,
                quantity, reference_type, reference_id
              ) VALUES (
                ${userId}, 'IN', ${item.product_id}, ${item.variant_id},
                ${Math.abs(item.delta)}, 'SALE_EDITED', ${saleId}
              )
>>>>>>> Stashed changes
            `;
          }
        }

<<<<<<< Updated upstream
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
=======
        // Devolver stock de items eliminados en el edit
        for (const [key, current] of currentMap.entries()) {
          if (newMap.has(key) || current.is_service) continue;

          const [productIdStr, variantIdStr] = key.split("-");
          const productId = Number(productIdStr);
          const variantId = variantIdStr === "null" ? null : Number(variantIdStr);

          const [lastBatch] = variantId !== null
            ? await sql`
                SELECT id FROM inventory_batches
                WHERE user_id    = ${userId}
                  AND product_id = ${productId}
                  AND variant_id = ${variantId}
                ORDER BY received_at DESC LIMIT 1
              `
            : await sql`
                SELECT id FROM inventory_batches
                WHERE user_id    = ${userId}
                  AND product_id = ${productId}
                  AND variant_id IS NULL
                ORDER BY received_at DESC LIMIT 1
>>>>>>> Stashed changes
              `;

          if (lastBatch) {
            await sql`
<<<<<<< Updated upstream
              INSERT INTO inventory_movements (user_id, movement_type, product_id, quantity, reference_type, reference_id)
              VALUES (${userId}, 'IN', ${productId}, ${currentQty}, 'SALE_EDITED', ${saleId})
=======
              UPDATE inventory_batches
              SET qty_available = qty_available + ${current.quantity}
              WHERE id = ${lastBatch.id} AND user_id = ${userId}
>>>>>>> Stashed changes
            `;
          }

          await sql`
            INSERT INTO inventory_movements (
              user_id, movement_type, product_id, variant_id,
              quantity, reference_type, reference_id
            ) VALUES (
              ${userId}, 'IN', ${productId}, ${variantId},
              ${current.quantity}, 'SALE_EDITED', ${saleId}
            )
          `;
        }

        // Reemplazar sale_items
        await sql`DELETE FROM sale_items WHERE sale_id = ${saleId} AND user_id = ${userId}`;
        for (const item of processedItems) {
          await sql`
<<<<<<< Updated upstream
            INSERT INTO sale_items (user_id, sale_id, product_id, quantity, unit_price, unit_cost, line_total)
            VALUES (${userId}, ${saleId}, ${item.product_id}, ${item.quantity}, ${item.unit_price}, ${item.unit_cost}, ${item.line_total})
=======
            INSERT INTO sale_items (
              user_id, sale_id, product_id, variant_id,
              quantity, unit_price, unit_cost, line_total
            ) VALUES (
              ${userId}, ${saleId},
              ${item.product_id}, ${item.variant_id},
              ${item.quantity}, ${item.unit_price},
              ${item.unit_cost}, ${item.line_total}
            )
>>>>>>> Stashed changes
          `;
        }

        // Actualizar cabecera — ahora incluye account_id
        await sql`
          UPDATE sales SET
<<<<<<< Updated upstream
            customer_id   = ${customer_id ?? sale.customer_id},
            payment_method = (
              SELECT CASE type
                WHEN 'CASH'   THEN 'CASH'
                WHEN 'BANK'   THEN 'TRANSFER'
                WHEN 'WALLET' THEN 'TRANSFER'
                ELSE 'OTHER'
              END
              FROM accounts WHERE id = ${finalAccountId} AND user_id = ${userId}),
=======
            customer_id   = ${customer_id   ?? sale.customer_id},
>>>>>>> Stashed changes
            account_id    = ${finalAccountId},
            subtotal      = ${newSubtotal},
            discount      = ${totalDiscount},
            tax_rate      = ${taxRateNum},
            tax           = ${taxAmount},
            shipping_cost = ${shippingAmount},
            total         = ${grandTotal},
            notes         = ${notes         ?? sale.notes},
            updated_at    = CURRENT_TIMESTAMP
          WHERE id = ${saleId} AND user_id = ${userId}
        `;

        await sql`COMMIT`;
        return Response.json({
          message: "Venta actualizada",
          data: {
            id:            saleId,
            status:        "PENDING",
            subtotal:      newSubtotal,
            discount:      totalDiscount,
            tax_rate:      taxRateNum,
            tax:           taxAmount,
            shipping_cost: shippingAmount,
            total:         grandTotal,
            account_id:    finalAccountId,
          },
        });
      } catch (e) {
        await sql`ROLLBACK`;
        throw e;
      }
    }

  } catch (error) {
    console.error("PATCH /api/sales/[id]:", error);
    return createErrorResponse("Error al procesar la acción", 500);
  }
<<<<<<< Updated upstream
=======
}

// ── DELETE /api/sales/[id] ─────────────────────────────────────────────
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const { userId } = auth.data;
    const { id }     = await params;
    const saleId     = Number(id);

    if (isNaN(saleId)) return createErrorResponse("ID inválido", 400);

    const [sale] = await sql`
      SELECT * FROM sales WHERE id = ${saleId} AND user_id = ${userId}
    `;
    if (!sale) return createErrorResponse("Venta no encontrada", 404);
    if (sale.status === "CANCELLED")
      return createErrorResponse("Esta venta ya fue cancelada", 400);

    const items = await sql`
      SELECT si.product_id, si.variant_id, si.quantity, p.is_service
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = ${saleId} AND si.user_id = ${userId}
    `;

    const supplies = await sql`
      SELECT supply_id, quantity FROM sale_supplies
      WHERE sale_id = ${saleId} AND user_id = ${userId}
    `;

    await sql`BEGIN`;
    try {
      // 1. Devolver stock por variante (FIFO inverso → último batch)
      for (const item of items) {
        if (item.is_service) continue;

        const variantId = item.variant_id ? Number(item.variant_id) : null;

        const [lastBatch] = variantId !== null
          ? await sql`
              SELECT id FROM inventory_batches
              WHERE user_id    = ${userId}
                AND product_id = ${item.product_id}
                AND variant_id = ${variantId}
              ORDER BY received_at DESC LIMIT 1
            `
          : await sql`
              SELECT id FROM inventory_batches
              WHERE user_id    = ${userId}
                AND product_id = ${item.product_id}
                AND variant_id IS NULL
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
            ${userId}, 'IN', ${item.product_id}, ${variantId},
            ${item.quantity}, 'SALE_CANCELLED', ${saleId}
          )
        `;
      }

      // 2. Devolver stock de insumos
      for (const s of supplies) {
        await sql`
          UPDATE supplies SET stock = stock + ${s.quantity}
          WHERE id = ${s.supply_id} AND user_id = ${userId}
        `;
        await sql`
          INSERT INTO supply_movements (
            user_id, movement_type, supply_id,
            quantity, reference_type, reference_id
          ) VALUES (
            ${userId}, 'IN', ${s.supply_id},
            ${s.quantity}, 'SALE_CANCELLED', ${saleId}
          )
        `;
      }

      // 3. Si estaba COMPLETED: revertir transacción y balance
      if (sale.status === "COMPLETED") {
        const [linkedTx] = await sql`
          SELECT id, amount FROM transactions
          WHERE user_id        = ${userId}
            AND reference_type = 'SALE'
            AND reference_id   = ${saleId}
        `;
        if (linkedTx) {
          await sql`
            DELETE FROM transactions
            WHERE id = ${linkedTx.id} AND user_id = ${userId}
          `;
          await sql`
            UPDATE accounts
            SET balance = balance - ${linkedTx.amount}
            WHERE id = ${sale.account_id} AND user_id = ${userId}
          `;
        }

        if (sale.customer_id) {
          await sql`
            UPDATE customers
            SET total_orders = GREATEST(total_orders - 1, 0),
                total_spent  = GREATEST(total_spent  - ${sale.total}, 0),
                updated_at   = CURRENT_TIMESTAMP
            WHERE id = ${sale.customer_id} AND user_id = ${userId}
          `;
        }
      }

      // 4. Eliminar
      await sql`DELETE FROM sale_supplies WHERE sale_id = ${saleId} AND user_id = ${userId}`;
      await sql`DELETE FROM sale_items    WHERE sale_id = ${saleId} AND user_id = ${userId}`;
      await sql`DELETE FROM sales         WHERE id      = ${saleId} AND user_id = ${userId}`;

      await sql`COMMIT`;
      return Response.json({
        message: "Venta eliminada, inventario y balance revertidos",
        data: { id: saleId },
      });
    } catch (e) {
      await sql`ROLLBACK`;
      throw e;
    }

  } catch (error) {
    console.error("DELETE /api/sales/[id]:", error);
    return createErrorResponse("Error al cancelar la venta", 500);
  }
>>>>>>> Stashed changes
}