-- ============================================================
-- MIGRACIÓN v4.4: HACER user_id NULLABLE EN TABLAS DE DATOS
-- Fecha: 2026-06-16
-- ============================================================
-- Después de v4.1 y v4.2, todas las tablas de datos tienen
-- org_id NOT NULL y created_by como reemplazo de user_id.
-- Los routes ya no incluyen user_id en los INSERTs, lo que
-- causaba violación de NOT NULL al crear cualquier registro.
-- Esta migración hace user_id nullable para permitir inserts
-- sin user_id (ahora reemplazado por org_id + created_by).
-- SEGURO: solo relaja una constraint, no elimina datos.
-- ============================================================

ALTER TABLE products               ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE product_variants       ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE suppliers              ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE purchase_batches       ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE purchase_batch_items   ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE inventory_batches      ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE inventory_movements    ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE accounts               ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE transactions           ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE transaction_categories ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE credit_cards           ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE credit_card_transactions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE customers              ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE loyalty_policies       ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sales                  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sale_items             ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sale_supplies          ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE supplies               ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE supply_purchases       ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE supply_purchase_items  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE supply_movements       ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE events                 ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE event_inventory        ALTER COLUMN user_id DROP NOT NULL;
