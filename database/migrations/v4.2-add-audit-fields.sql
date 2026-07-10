-- ============================================================
-- MIGRACIÓN v4.2: CAMPOS DE AUDITORÍA (created_by / updated_by)
-- Fecha: 2026-05-29
-- ============================================================
-- Agrega created_by y updated_by a las 24 tablas de datos.
--   created_by → quién creó el registro
--   updated_by → quién hizo la última modificación (NULL hasta primer UPDATE)
-- Ambas son nullable y referencian users(id) ON DELETE SET NULL.
-- Idempotente: usa IF NOT EXISTS en cada columna.
-- ============================================================

ALTER TABLE products               ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE products               ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE product_variants       ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE product_variants       ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE suppliers              ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE suppliers              ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE purchase_batches       ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE purchase_batches       ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE purchase_batch_items   ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE purchase_batch_items   ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE inventory_batches      ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE inventory_batches      ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE inventory_movements    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE inventory_movements    ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE accounts               ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE accounts               ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE transactions           ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE transactions           ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE transaction_categories ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE transaction_categories ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE credit_cards           ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE credit_cards           ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE credit_card_transactions ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE credit_card_transactions ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE customers              ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE customers              ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE loyalty_policies       ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE loyalty_policies       ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE sales                  ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sales                  ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE sale_items             ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sale_items             ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE sale_supplies          ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sale_supplies          ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE supplies               ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE supplies               ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE supply_purchases       ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE supply_purchases       ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE supply_purchase_items  ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE supply_purchase_items  ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE supply_movements       ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE supply_movements       ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE events                 ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE events                 ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE event_inventory        ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE event_inventory        ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- Poblar created_by con el user_id del registro para datos existentes
UPDATE products               SET created_by = user_id WHERE created_by IS NULL;
UPDATE product_variants       SET created_by = user_id WHERE created_by IS NULL;
UPDATE suppliers               SET created_by = user_id WHERE created_by IS NULL;
UPDATE purchase_batches        SET created_by = user_id WHERE created_by IS NULL;
UPDATE purchase_batch_items    SET created_by = user_id WHERE created_by IS NULL;
UPDATE inventory_batches       SET created_by = user_id WHERE created_by IS NULL;
UPDATE inventory_movements     SET created_by = user_id WHERE created_by IS NULL;
UPDATE accounts                SET created_by = user_id WHERE created_by IS NULL;
UPDATE transactions            SET created_by = user_id WHERE created_by IS NULL;
UPDATE transaction_categories  SET created_by = user_id WHERE created_by IS NULL;
UPDATE credit_cards            SET created_by = user_id WHERE created_by IS NULL;
UPDATE credit_card_transactions SET created_by = user_id WHERE created_by IS NULL;
UPDATE customers               SET created_by = user_id WHERE created_by IS NULL;
UPDATE loyalty_policies        SET created_by = user_id WHERE created_by IS NULL;
UPDATE sales                   SET created_by = user_id WHERE created_by IS NULL;
UPDATE sale_items              SET created_by = user_id WHERE created_by IS NULL;
UPDATE sale_supplies           SET created_by = user_id WHERE created_by IS NULL;
UPDATE supplies                SET created_by = user_id WHERE created_by IS NULL;
UPDATE supply_purchases        SET created_by = user_id WHERE created_by IS NULL;
UPDATE supply_purchase_items   SET created_by = user_id WHERE created_by IS NULL;
UPDATE supply_movements        SET created_by = user_id WHERE created_by IS NULL;
UPDATE events                  SET created_by = user_id WHERE created_by IS NULL;
UPDATE event_inventory         SET created_by = user_id WHERE created_by IS NULL;
