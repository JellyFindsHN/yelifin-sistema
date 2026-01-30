-- ============================================
-- SISTEMA DE GESTIÓN DE INVENTARIO Y VENTAS
-- ============================================

-- ============================================
-- 1. MÓDULO DE USUARIOS Y ORGANIZACIONES
-- ============================================

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_members_org ON organization_members(organization_id);
CREATE INDEX idx_members_user ON organization_members(user_id);

-- ============================================
-- 2. MÓDULO DE PRODUCTOS
-- ============================================

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    price_lempiras DECIMAL(10, 2) NOT NULL CHECK (price_lempiras >= 0),
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_name ON products(name);

CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, name)
);

CREATE INDEX idx_variants_product ON product_variants(product_id);

-- ============================================
-- 3. MÓDULO DE COMPRAS
-- ============================================

CREATE TABLE purchase_batches (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    batch_date DATE NOT NULL,
    usd_to_lempiras_rate DECIMAL(10, 4) NOT NULL CHECK (usd_to_lempiras_rate > 0),
    total_cost DECIMAL(10, 2),
    payment_account_id INT,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_date DATE,
    notes TEXT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batches_org ON purchase_batches(organization_id);
CREATE INDEX idx_batches_date ON purchase_batches(batch_date);

CREATE TABLE batch_items (
    id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL REFERENCES purchase_batches(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id INT REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_usd DECIMAL(10, 2) NOT NULL CHECK (price_usd >= 0),
    price_lempiras DECIMAL(10, 2) NOT NULL CHECK (price_lempiras >= 0),
    supplier_shipping_cost DECIMAL(10, 2) DEFAULT 0 CHECK (supplier_shipping_cost >= 0),
    unit_cost DECIMAL(10, 2) GENERATED ALWAYS AS (price_lempiras + supplier_shipping_cost) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batch_items_batch ON batch_items(batch_id);
CREATE INDEX idx_batch_items_product ON batch_items(product_id);

-- ============================================
-- 4. MÓDULO DE INVENTARIO DE PRODUCTOS
-- ============================================

CREATE TABLE inventory_batches (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id INT REFERENCES product_variants(id) ON DELETE CASCADE,
    batch_item_id INT NOT NULL REFERENCES batch_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity >= 0),
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    purchase_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inv_batches_org ON inventory_batches(organization_id);
CREATE INDEX idx_inv_batches_product ON inventory_batches(product_id, variant_id);
CREATE INDEX idx_inv_batches_date ON inventory_batches(purchase_date);

-- Vista materializada para resumen de inventario
CREATE MATERIALIZED VIEW inventory AS
SELECT 
    ib.organization_id,
    ib.product_id,
    ib.variant_id,
    SUM(ib.quantity) as quantity,
    NOW() as last_updated
FROM inventory_batches ib
GROUP BY ib.organization_id, ib.product_id, ib.variant_id;

CREATE UNIQUE INDEX idx_inventory_unique 
    ON inventory(organization_id, product_id, COALESCE(variant_id, -1));

CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    variant_id INT REFERENCES product_variants(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('PURCHASE', 'SALE', 'ADJUSTMENT')),
    quantity INT NOT NULL,
    reference_id INT,
    notes TEXT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movements_org ON inventory_movements(organization_id);
CREATE INDEX idx_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_movements_date ON inventory_movements(created_at);

-- ============================================
-- 5. MÓDULO DE SUMINISTROS
-- ============================================

CREATE TABLE supplies (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('COUNTABLE', 'NON_COUNTABLE')),
    unit_type VARCHAR(50),
    stock INT,
    min_stock INT DEFAULT 0,
    estimated_usage_per_sale DECIMAL(10, 2),
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (type = 'COUNTABLE' AND stock IS NOT NULL) OR
        (type = 'NON_COUNTABLE' AND estimated_usage_per_sale IS NOT NULL)
    )
);

CREATE INDEX idx_supplies_org ON supplies(organization_id);
CREATE INDEX idx_supplies_type ON supplies(type);
CREATE INDEX idx_supplies_active ON supplies(is_active);

CREATE TABLE supply_purchases (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_date DATE NOT NULL,
    supplier_name VARCHAR(255),
    total_cost DECIMAL(10, 2) NOT NULL CHECK (total_cost >= 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'TRANSFER', 'CREDIT')),
    payment_account_id INT,
    is_paid BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supply_purchases_org ON supply_purchases(organization_id);
CREATE INDEX idx_supply_purchases_date ON supply_purchases(purchase_date);

CREATE TABLE supply_purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_id INT NOT NULL REFERENCES supply_purchases(id) ON DELETE CASCADE,
    supply_id INT NOT NULL REFERENCES supplies(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supply_purchase_items_purchase ON supply_purchase_items(purchase_id);
CREATE INDEX idx_supply_purchase_items_supply ON supply_purchase_items(supply_id);

CREATE TABLE supply_movements (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supply_id INT NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'WASTE')),
    quantity INT,
    cost DECIMAL(10, 2),
    reference_type VARCHAR(30),
    reference_id INT,
    notes TEXT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supply_movements_org ON supply_movements(organization_id);
CREATE INDEX idx_supply_movements_supply ON supply_movements(supply_id);
CREATE INDEX idx_supply_movements_type ON supply_movements(movement_type);
CREATE INDEX idx_supply_movements_date ON supply_movements(created_at);

-- ============================================
-- 6. MÓDULO FINANCIERO
-- ============================================

CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('CASH', 'BANK', 'CREDIT_CARD')),
    account_number VARCHAR(50),
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, name)
);

CREATE INDEX idx_accounts_org ON accounts(organization_id);
CREATE INDEX idx_accounts_type ON accounts(type);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(30) NOT NULL CHECK (type IN ('SALE', 'PURCHASE_PRODUCT', 'PURCHASE_SUPPLY', 'TRANSFER', 'EXPENSE', 'INCOME', 'WITHDRAWAL', 'DEPOSIT')),
    category VARCHAR(50),
    from_account_id INT REFERENCES accounts(id) ON DELETE RESTRICT,
    to_account_id INT REFERENCES accounts(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    reference_type VARCHAR(30),
    reference_id INT,
    description TEXT,
    notes TEXT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_org ON transactions(organization_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_from_account ON transactions(from_account_id);
CREATE INDEX idx_transactions_to_account ON transactions(to_account_id);
CREATE INDEX idx_transactions_reference ON transactions(reference_type, reference_id);

-- ============================================
-- 7. MÓDULO DE CLIENTES
-- ============================================

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    is_loyal BOOLEAN DEFAULT FALSE,
    total_purchases INT DEFAULT 0 CHECK (total_purchases >= 0),
    total_spent DECIMAL(10, 2) DEFAULT 0 CHECK (total_spent >= 0),
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ============================================
-- 8. MÓDULO DE EVENTOS/FERIAS
-- ============================================

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('FAIR', 'MARKET', 'POPUP', 'EXHIBITION')),
    location VARCHAR(255),
    address TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    booth_cost DECIMAL(10, 2) DEFAULT 0 CHECK (booth_cost >= 0),
    transport_cost DECIMAL(10, 2) DEFAULT 0 CHECK (transport_cost >= 0),
    setup_cost DECIMAL(10, 2) DEFAULT 0 CHECK (setup_cost >= 0),
    other_costs DECIMAL(10, 2) DEFAULT 0 CHECK (other_costs >= 0),
    total_fixed_costs DECIMAL(10, 2) GENERATED ALWAYS AS (booth_cost + transport_cost + setup_cost + other_costs) STORED,
    cash_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
    notes TEXT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date >= start_date)
);

CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_events_status ON events(status);

CREATE TABLE event_inventory (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id INT REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity_planned INT NOT NULL CHECK (quantity_planned >= 0),
    quantity_actual INT CHECK (quantity_actual >= 0),
    quantity_sold INT DEFAULT 0 CHECK (quantity_sold >= 0),
    quantity_returned INT CHECK (quantity_returned >= 0),
    avg_unit_cost DECIMAL(10, 2) NOT NULL CHECK (avg_unit_cost >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, product_id, variant_id)
);