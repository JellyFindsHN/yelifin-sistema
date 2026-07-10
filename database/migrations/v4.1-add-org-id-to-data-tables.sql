-- ============================================================
-- MIGRACIÓN v4.1: AGREGAR org_id A TODAS LAS TABLAS DE DATOS
-- Fecha: 2026-05-29
-- ============================================================
-- SEGURO DE EJECUTAR EN PRODUCCIÓN:
--   - Solo agrega columnas nuevas (nullable al inicio).
--   - UPDATE idempotente: si org_id ya tiene valor, no lo pisa.
--   - Las UNIQUE constraints antiguas se reemplazan al final.
-- PRERREQUISITO: haber ejecutado v4-multi-org-infrastructure.sql
-- ============================================================

-- ============================================================
-- SECCIÓN 1: AGREGAR org_id NULLABLE A LAS 24 TABLAS
-- Estas operaciones son instantáneas en PostgreSQL.
-- ============================================================

ALTER TABLE products               ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE product_variants       ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE suppliers              ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE purchase_batches       ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE purchase_batch_items   ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE inventory_batches      ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE inventory_movements    ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE accounts               ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE transactions           ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE transaction_categories ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE credit_cards           ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE credit_card_transactions ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE customers              ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE loyalty_policies       ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE sales                  ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE sale_items             ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE sale_supplies          ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE supplies               ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE supply_purchases       ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE supply_purchase_items  ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE supply_movements       ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE events                 ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);
ALTER TABLE event_inventory        ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organizations(id);

-- ============================================================
-- SECCIÓN 2: POBLAR org_id DESDE user_id
-- Para cada tabla: org_id = org donde owner_user_id = user_id del registro.
-- Solo actualiza filas donde org_id aún es NULL (idempotente).
-- ============================================================

UPDATE products t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE product_variants t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE suppliers t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE purchase_batches t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE purchase_batch_items t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE inventory_batches t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE inventory_movements t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE accounts t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE transactions t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE transaction_categories t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE credit_cards t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE credit_card_transactions t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE customers t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE loyalty_policies t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE sales t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE sale_items t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE sale_supplies t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE supplies t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE supply_purchases t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE supply_purchase_items t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE supply_movements t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE events t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

UPDATE event_inventory t
SET org_id = o.id
FROM organizations o
WHERE o.owner_user_id = t.user_id AND t.org_id IS NULL;

-- ============================================================
-- SECCIÓN 3: VERIFICACIÓN
-- Ejecutar estas queries antes de continuar a la Sección 4.
-- Todas deben devolver 0. Si alguna devuelve > 0, hay un
-- problema en la migración — NO ejecutar la Sección 4 aún.
-- ============================================================

SELECT 'products'               AS tabla, COUNT(*) AS sin_org FROM products               WHERE org_id IS NULL
UNION ALL
SELECT 'product_variants',       COUNT(*) FROM product_variants       WHERE org_id IS NULL
UNION ALL
SELECT 'suppliers',              COUNT(*) FROM suppliers              WHERE org_id IS NULL
UNION ALL
SELECT 'purchase_batches',       COUNT(*) FROM purchase_batches       WHERE org_id IS NULL
UNION ALL
SELECT 'purchase_batch_items',   COUNT(*) FROM purchase_batch_items   WHERE org_id IS NULL
UNION ALL
SELECT 'inventory_batches',      COUNT(*) FROM inventory_batches      WHERE org_id IS NULL
UNION ALL
SELECT 'inventory_movements',    COUNT(*) FROM inventory_movements    WHERE org_id IS NULL
UNION ALL
SELECT 'accounts',               COUNT(*) FROM accounts               WHERE org_id IS NULL
UNION ALL
SELECT 'transactions',           COUNT(*) FROM transactions           WHERE org_id IS NULL
UNION ALL
SELECT 'transaction_categories', COUNT(*) FROM transaction_categories WHERE org_id IS NULL
UNION ALL
SELECT 'credit_cards',           COUNT(*) FROM credit_cards           WHERE org_id IS NULL
UNION ALL
SELECT 'credit_card_transactions', COUNT(*) FROM credit_card_transactions WHERE org_id IS NULL
UNION ALL
SELECT 'customers',              COUNT(*) FROM customers              WHERE org_id IS NULL
UNION ALL
SELECT 'loyalty_policies',       COUNT(*) FROM loyalty_policies       WHERE org_id IS NULL
UNION ALL
SELECT 'sales',                  COUNT(*) FROM sales                  WHERE org_id IS NULL
UNION ALL
SELECT 'sale_items',             COUNT(*) FROM sale_items             WHERE org_id IS NULL
UNION ALL
SELECT 'sale_supplies',          COUNT(*) FROM sale_supplies          WHERE org_id IS NULL
UNION ALL
SELECT 'supplies',               COUNT(*) FROM supplies               WHERE org_id IS NULL
UNION ALL
SELECT 'supply_purchases',       COUNT(*) FROM supply_purchases       WHERE org_id IS NULL
UNION ALL
SELECT 'supply_purchase_items',  COUNT(*) FROM supply_purchase_items  WHERE org_id IS NULL
UNION ALL
SELECT 'supply_movements',       COUNT(*) FROM supply_movements       WHERE org_id IS NULL
UNION ALL
SELECT 'events',                 COUNT(*) FROM events                 WHERE org_id IS NULL
UNION ALL
SELECT 'event_inventory',        COUNT(*) FROM event_inventory        WHERE org_id IS NULL;

-- ============================================================
-- SECCIÓN 4: HACER org_id NOT NULL + ÍNDICES + ACTUALIZAR UNIQUE
-- Ejecutar SOLO si la Sección 3 devolvió todos 0.
-- ============================================================

-- NOT NULL en todas las tablas
ALTER TABLE products               ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE product_variants       ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE suppliers              ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE purchase_batches       ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE purchase_batch_items   ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE inventory_batches      ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE inventory_movements    ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE accounts               ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE transactions           ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE transaction_categories ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE credit_cards           ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE credit_card_transactions ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE customers              ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE loyalty_policies       ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE sales                  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE sale_items             ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE sale_supplies          ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE supplies               ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE supply_purchases       ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE supply_purchase_items  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE supply_movements       ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE events                 ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE event_inventory        ALTER COLUMN org_id SET NOT NULL;

-- Índices de org_id para las tablas principales
CREATE INDEX IF NOT EXISTS idx_products_org               ON products(org_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_org       ON product_variants(org_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org              ON suppliers(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_batches_org       ON purchase_batches(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_batch_items_org   ON purchase_batch_items(org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_org      ON inventory_batches(org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_org    ON inventory_movements(org_id);
CREATE INDEX IF NOT EXISTS idx_accounts_org               ON accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org           ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transaction_categories_org ON transaction_categories(org_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_org           ON credit_cards(org_id);
CREATE INDEX IF NOT EXISTS idx_cc_transactions_org        ON credit_card_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_org              ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_policies_org       ON loyalty_policies(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_org                  ON sales(org_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_org             ON sale_items(org_id);
CREATE INDEX IF NOT EXISTS idx_sale_supplies_org          ON sale_supplies(org_id);
CREATE INDEX IF NOT EXISTS idx_supplies_org               ON supplies(org_id);
CREATE INDEX IF NOT EXISTS idx_supply_purchases_org       ON supply_purchases(org_id);
CREATE INDEX IF NOT EXISTS idx_supply_purchase_items_org  ON supply_purchase_items(org_id);
CREATE INDEX IF NOT EXISTS idx_supply_movements_org       ON supply_movements(org_id);
CREATE INDEX IF NOT EXISTS idx_events_org                 ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_event_inventory_org        ON event_inventory(org_id);

-- Actualizar UNIQUE constraints que usaban user_id como parte de la clave
-- (reemplazar user_id por org_id en las constraints de unicidad)

-- accounts: UNIQUE(user_id, name) → UNIQUE(org_id, name)
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_name_key;
ALTER TABLE accounts ADD CONSTRAINT accounts_org_id_name_key UNIQUE (org_id, name);

-- products: UNIQUE(user_id, sku)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_user_id_sku_key;
ALTER TABLE products ADD CONSTRAINT products_org_id_sku_key UNIQUE (org_id, sku);

-- product_variants: UNIQUE(user_id, sku)
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_user_id_sku_key;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_org_id_sku_key UNIQUE (org_id, sku);

-- suppliers: UNIQUE(user_id, name)
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_user_id_name_key;
ALTER TABLE suppliers ADD CONSTRAINT suppliers_org_id_name_key UNIQUE (org_id, name);

-- supplies: UNIQUE(user_id, name)
ALTER TABLE supplies DROP CONSTRAINT IF EXISTS supplies_user_id_name_key;
ALTER TABLE supplies ADD CONSTRAINT supplies_org_id_name_key UNIQUE (org_id, name);

-- sales: UNIQUE(user_id, sale_number)
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_user_id_sale_number_key;
ALTER TABLE sales ADD CONSTRAINT sales_org_id_sale_number_key UNIQUE (org_id, sale_number);

-- transaction_categories: UNIQUE(user_id, name, type)
ALTER TABLE transaction_categories DROP CONSTRAINT IF EXISTS transaction_categories_user_id_name_type_key;
ALTER TABLE transaction_categories ADD CONSTRAINT transaction_categories_org_id_name_type_key UNIQUE (org_id, name, type);

-- loyalty_policies: UNIQUE(user_id, tier_name)
ALTER TABLE loyalty_policies DROP CONSTRAINT IF EXISTS loyalty_policies_user_id_tier_name_key;
ALTER TABLE loyalty_policies ADD CONSTRAINT loyalty_policies_org_id_tier_name_key UNIQUE (org_id, tier_name);

-- credit_cards: UNIQUE(user_id, name)
ALTER TABLE credit_cards DROP CONSTRAINT IF EXISTS credit_cards_user_id_name_key;
ALTER TABLE credit_cards ADD CONSTRAINT credit_cards_org_id_name_key UNIQUE (org_id, name);

-- event_inventory: UNIQUE(user_id, event_id, product_id, variant_id)
ALTER TABLE event_inventory DROP CONSTRAINT IF EXISTS event_inventory_user_id_event_id_product_id_variant_id_key;
ALTER TABLE event_inventory ADD CONSTRAINT event_inventory_org_id_event_id_product_id_variant_id_key
  UNIQUE (org_id, event_id, product_id, variant_id);
