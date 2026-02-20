CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- USUARIOS (FIREBASE AUTH)
-- =========================

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE user_profile (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  business_logo_url TEXT,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Tegucigalpa',
  currency VARCHAR(3) NOT NULL DEFAULT 'HNL',
  locale VARCHAR(16) NOT NULL DEFAULT 'es-HN',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- PLANES / FEATURES (SaaS)
-- =========================

CREATE TABLE subscription_plans (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(60) UNIQUE NOT NULL,
  description TEXT,
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price_usd >= 0),
  billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('MONTHLY','YEARLY','LIFETIME')),
  max_products INT,
  max_sales_per_month INT,
  max_storage_mb INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_features (
  id BIGSERIAL PRIMARY KEY,
  feature_key VARCHAR(100) UNIQUE NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'PRODUCTS','INVENTORY','SALES','CUSTOMERS','FINANCES','EVENTS','REPORTS','INTEGRATIONS','ADMIN'
  )),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plan_features (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_id BIGINT NOT NULL REFERENCES system_features(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  limit_value INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_id, feature_id)
);

CREATE INDEX idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX idx_plan_features_feature ON plan_features(feature_id);

CREATE TABLE user_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('TRIAL','ACTIVE','PAST_DUE','CANCELLED','EXPIRED')),
  trial_start_date TIMESTAMP,
  trial_end_date TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMP,
  provider VARCHAR(30) CHECK (provider IN ('STRIPE','PAYPAL','MANUAL','NONE')),
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_plan ON user_subscriptions(plan_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

CREATE TABLE subscription_payments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id BIGINT REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  amount_usd NUMERIC(10,2) NOT NULL CHECK (amount_usd >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
  provider VARCHAR(30) CHECK (provider IN ('STRIPE','PAYPAL','MANUAL')),
  provider_payment_id TEXT,
  paid_at TIMESTAMP,
  receipt_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscription_payments_user ON subscription_payments(user_id);
CREATE INDEX idx_subscription_payments_subscription ON subscription_payments(subscription_id);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(status);

-- =========================
-- CLIENTES
-- =========================

CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(255),
  notes TEXT,
  total_orders INT NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_user_name ON customers(user_id, name);

-- =========================
-- PRODUCTOS
-- =========================

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(80),
  barcode VARCHAR(80),
  price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, sku)
);

CREATE INDEX idx_products_user ON products(user_id);
CREATE INDEX idx_products_user_name ON products(user_id, name);

CREATE TABLE product_variants (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name VARCHAR(255),
  sku VARCHAR(80),
  attributes JSONB,
  price_override NUMERIC(12,2) CHECK (price_override >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, sku)
);

CREATE INDEX idx_variants_user ON product_variants(user_id);
CREATE INDEX idx_variants_product ON product_variants(product_id);

-- =========================
-- PROVEEDORES (opcional, útil para compras)
-- =========================

CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE INDEX idx_suppliers_user ON suppliers(user_id);

-- =========================
-- COMPRAS (LOTES) + INVENTARIO POR CAPAS
-- =========================

CREATE TABLE purchase_batches (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name VARCHAR(255),
  currency VARCHAR(3) NOT NULL DEFAULT 'HNL',
  exchange_rate NUMERIC(12,6) DEFAULT 1 CHECK (exchange_rate >= 0),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  shipping NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping >= 0),
  tax NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_batches_user ON purchase_batches(user_id);
CREATE INDEX idx_purchase_batches_user_date ON purchase_batches(user_id, purchased_at);

CREATE TABLE purchase_batch_items (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purchase_batch_id BIGINT NOT NULL REFERENCES purchase_batches(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12,4) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(12,2) NOT NULL CHECK (total_cost >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batch_items_user ON purchase_batch_items(user_id);
CREATE INDEX idx_batch_items_batch ON purchase_batch_items(purchase_batch_id);
CREATE INDEX idx_batch_items_product ON purchase_batch_items(product_id);

CREATE TABLE inventory_batches (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE RESTRICT,
  purchase_batch_item_id BIGINT REFERENCES purchase_batch_items(id) ON DELETE SET NULL,
  qty_in INT NOT NULL CHECK (qty_in >= 0),
  qty_available INT NOT NULL CHECK (qty_available >= 0),
  unit_cost NUMERIC(12,4) NOT NULL CHECK (unit_cost >= 0),
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_batches_user ON inventory_batches(user_id);
CREATE INDEX idx_inventory_batches_product ON inventory_batches(user_id, product_id);
CREATE INDEX idx_inventory_batches_available ON inventory_batches(user_id, qty_available);

CREATE TABLE inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUST')),
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  reference_type VARCHAR(20) CHECK (reference_type IN ('PURCHASE','SALE','ADJUSTMENT')),
  reference_id BIGINT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_movements_user ON inventory_movements(user_id);
CREATE INDEX idx_inventory_movements_user_date ON inventory_movements(user_id, created_at);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(user_id, product_id);

-- =========================
-- FINANZAS (CUENTAS / TRANSACCIONES)
-- =========================

CREATE TABLE accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('CASH','BANK','WALLET','OTHER')),
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE INDEX idx_accounts_user ON accounts(user_id);

CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(15) NOT NULL CHECK (type IN ('INCOME','EXPENSE','TRANSFER')),
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id BIGINT REFERENCES accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  category VARCHAR(80),
  description TEXT,
  reference_type VARCHAR(20) CHECK (reference_type IN ('SALE','PURCHASE','SUPPLY_PURCHASE','EVENT','OTHER')),
  reference_id BIGINT,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, occurred_at);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);

-- =========================
-- VENTAS
-- =========================

CREATE TABLE sales (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sale_number VARCHAR(60) NOT NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method VARCHAR(20) CHECK (payment_method IN ('CASH','CARD','TRANSFER','MIXED','OTHER')),
  account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  sold_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, sale_number)
);

CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sales_user_date ON sales(user_id, sold_at);
CREATE INDEX idx_sales_customer ON sales(user_id, customer_id);

CREATE TABLE sale_items (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_items_user ON sale_items(user_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- =========================
-- INSUMOS (opcional)
-- =========================

CREATE TABLE supplies (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(30) DEFAULT 'unit',
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INT NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE INDEX idx_supplies_user ON supplies(user_id);

CREATE TABLE supply_purchases (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supply_purchases_user ON supply_purchases(user_id);

CREATE TABLE supply_purchase_items (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supply_purchase_id BIGINT NOT NULL REFERENCES supply_purchases(id) ON DELETE CASCADE,
  supply_id BIGINT NOT NULL REFERENCES supplies(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12,4) NOT NULL CHECK (unit_cost >= 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supply_purchase_items_user ON supply_purchase_items(user_id);
CREATE INDEX idx_supply_purchase_items_purchase ON supply_purchase_items(supply_purchase_id);

CREATE TABLE supply_movements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUST')),
  supply_id BIGINT NOT NULL REFERENCES supplies(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  reference_type VARCHAR(20) CHECK (reference_type IN ('SUPPLY_PURCHASE','SALE','ADJUSTMENT')),
  reference_id BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supply_movements_user ON supply_movements(user_id);

CREATE TABLE sale_supplies (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  supply_id BIGINT NOT NULL REFERENCES supplies(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_supplies_user ON sale_supplies(user_id);
CREATE INDEX idx_sale_supplies_sale ON sale_supplies(sale_id);

-- =========================
-- EVENTOS (opcional)
-- =========================

CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  fixed_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fixed_cost >= 0),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_user ON events(user_id);

CREATE TABLE event_inventory (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE RESTRICT,
  planned_qty INT NOT NULL DEFAULT 0 CHECK (planned_qty >= 0),
  actual_qty INT NOT NULL DEFAULT 0 CHECK (actual_qty >= 0),
  sold_qty INT NOT NULL DEFAULT 0 CHECK (sold_qty >= 0),
  returned_qty INT NOT NULL DEFAULT 0 CHECK (returned_qty >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, event_id, product_id, variant_id)
);

CREATE INDEX idx_event_inventory_user ON event_inventory(user_id);
CREATE INDEX idx_event_inventory_event ON event_inventory(event_id);
ALTER TABLE products ADD COLUMN image_url TEXT;
ALTER TABLE purchase_batch_items ADD COLUMN unit_cost_usd NUMERIC(10,4) DEFAULT 0;
ALTER TABLE purchase_batches ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES accounts(id);
-- Opcional pero recomendado:
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_type VARCHAR(20) 
  CHECK (reference_type IN ('SALE','PURCHASE','SUPPLY_PURCHASE','EVENT','OTHER'));