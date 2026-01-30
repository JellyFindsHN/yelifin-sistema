-- ============================================
-- NEXLY - SISTEMA DE GESTIÓN PARA EMPRENDEDORES
-- Base de datos: nexly_db
-- Versión: 1.0.0
-- Fecha: 2026-01-30
-- ============================================

-- Conectar a la base de datos por defecto para poder eliminar nexly_db
\c postgres

-- Terminar todas las conexiones activas a la base de datos
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'nexly_db'
AND pid <> pg_backend_pid();

-- Eliminar la base de datos si existe
DROP DATABASE IF EXISTS nexly_db;

-- Crear la base de datos
CREATE DATABASE nexly_db
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Conectar a la nueva base de datos
\c nexly_db

-- Configurar timezone
SET timezone = 'America/Tegucigalpa';

-- ============================================
-- EXTENSIONES
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. MÓDULO DE SUSCRIPCIONES Y PLANES
-- ============================================

CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price_usd DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (price_usd >= 0),
    billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('MONTHLY', 'YEARLY', 'LIFETIME')),
    
    -- Límites del plan
    max_users INT DEFAULT 1,
    max_products INT,
    max_sales_per_month INT,
    max_storage_mb INT,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Features disponibles en el sistema
CREATE TABLE system_features (
    id SERIAL PRIMARY KEY,
    feature_key VARCHAR(100) UNIQUE NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'PRODUCTS', 'INVENTORY', 'SALES', 'CUSTOMERS', 
        'FINANCES', 'EVENTS', 'REPORTS', 'INTEGRATIONS', 'ADMIN'
    )),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Features por plan
CREATE TABLE plan_features (
    id SERIAL PRIMARY KEY,
    plan_id INT NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    feature_id INT NOT NULL REFERENCES system_features(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    limit_value INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, feature_id)
);

CREATE INDEX idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX idx_plan_features_feature ON plan_features(feature_id);

-- ============================================
-- 2. MÓDULO DE ORGANIZACIONES Y USUARIOS
-- ============================================

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    timezone VARCHAR(50) DEFAULT 'America/Tegucigalpa',
    currency VARCHAR(3) DEFAULT 'HNL',
    locale VARCHAR(10) DEFAULT 'es-HN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

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

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);

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
-- 3. MÓDULO DE SUSCRIPCIONES DE ORGANIZACIONES
-- ============================================

CREATE TABLE organization_subscriptions (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id INT NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    
    status VARCHAR(20) NOT NULL DEFAULT 'TRIAL' 
        CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED')),
    
    trial_start_date TIMESTAMP,
    trial_end_date TIMESTAMP,
    subscription_start_date TIMESTAMP,
    subscription_end_date TIMESTAMP,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    payment_provider VARCHAR(50),
    payment_provider_subscription_id VARCHAR(255),
    payment_provider_customer_id VARCHAR(255),
    
    current_users_count INT DEFAULT 1,
    current_products_count INT DEFAULT 0,
    current_month_sales_count INT DEFAULT 0,
    last_usage_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id)
);

CREATE INDEX idx_org_subscriptions_org ON organization_subscriptions(organization_id);
CREATE INDEX idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX idx_org_subscriptions_dates ON organization_subscriptions(current_period_end);

CREATE TABLE subscription_payments (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id INT NOT NULL REFERENCES organization_subscriptions(id) ON DELETE CASCADE,
    
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    
    payment_date TIMESTAMP,
    payment_provider VARCHAR(50),
    payment_provider_payment_id VARCHAR(255),
    payment_method VARCHAR(50),
    
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    receipt_url TEXT,
    invoice_url TEXT,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscription_payments_org ON subscription_payments(organization_id);
CREATE INDEX idx_subscription_payments_date ON subscription_payments(payment_date);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(status);

CREATE TABLE subscription_history (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'TRIAL_STARTED', 'TRIAL_ENDED', 'SUBSCRIPTION_CREATED', 
        'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_CANCELLED', 
        'SUBSCRIPTION_EXPIRED', 'PLAN_UPGRADED', 'PLAN_DOWNGRADED',
        'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED'
    )),
    
    previous_plan_id INT REFERENCES subscription_plans(id),
    new_plan_id INT REFERENCES subscription_plans(id),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    
    description TEXT,
    metadata JSONB,
    
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscription_history_org ON subscription_history(organization_id);
CREATE INDEX idx_subscription_history_date ON subscription_history(created_at);

-- ============================================
-- 4. MÓDULO DE PRODUCTOS
-- ============================================

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    price_lempiras DECIMAL(10, 2) NOT NULL CHECK (price_lempiras >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_active ON products(is_active);

CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, name)
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);

-- ============================================
-- 5. MÓDULO DE COMPRAS
-- ============================================

CREATE TABLE purchase_batches (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    batch_number VARCHAR(50),
    batch_date DATE NOT NULL,
    usd_to_lempiras_rate DECIMAL(10, 4) NOT NULL CHECK (usd_to_lempiras_rate > 0),
    total_cost DECIMAL(10, 2) DEFAULT 0,
    payment_account_id INT,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_date DATE,
    notes TEXT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batches_org ON purchase_batches(organization_id);
CREATE INDEX idx_batches_date ON purchase_batches(batch_date);
CREATE INDEX idx_batches_number ON purchase_batches(batch_number);

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
-- 6. MÓDULO DE INVENTARIO DE PRODUCTOS
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
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'EVENT_OUT', 'EVENT_RETURN')),
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
-- 7. MÓDULO DE SUMINISTROS
-- ============================================

CREATE TABLE supplies (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('COUNTABLE', 'NON_COUNTABLE')),
    unit_type VARCHAR(50),
    current_stock INT,
    min_stock INT DEFAULT 0,
    estimated_usage_per_sale DECIMAL(10, 2),
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (type = 'COUNTABLE' AND current_stock IS NOT NULL) OR
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
-- 8. MÓDULO FINANCIERO
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
CREATE INDEX idx_accounts_active ON accounts(is_active);

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
-- 9. MÓDULO DE CLIENTES Y LEALTAD
-- ============================================

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
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
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_loyal ON customers(is_loyal);

-- Configuración del programa de lealtad
CREATE TABLE loyalty_settings (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    loyalty_type VARCHAR(20) NOT NULL DEFAULT 'PURCHASES_AND_AMOUNT' 
        CHECK (loyalty_type IN ('PURCHASES_COUNT', 'TOTAL_SPENT', 'PURCHASES_AND_AMOUNT', 'CUSTOM')),
    
    required_purchases INT DEFAULT 3,
    minimum_purchase_amount DECIMAL(10, 2) DEFAULT 200.00,
    minimum_total_spent DECIMAL(10, 2) DEFAULT 600.00,
    
    discount_tiers JSONB DEFAULT '[
        {"purchase_number": 4, "discount_percentage": 10},
        {"purchase_number": 6, "discount_percentage": 15},
        {"purchase_number": 8, "discount_percentage": 20}
    ]'::jsonb,
    
    points_enabled BOOLEAN DEFAULT FALSE,
    points_per_lempira DECIMAL(5, 2) DEFAULT 1.00,
    points_to_lempiras_rate DECIMAL(10, 2) DEFAULT 0.10,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id)
);

CREATE TABLE customer_loyalty_points (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    points_balance INT DEFAULT 0 CHECK (points_balance >= 0),
    total_points_earned INT DEFAULT 0,
    total_points_redeemed INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id)
);

CREATE TABLE loyalty_points_history (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('EARN', 'REDEEM', 'EXPIRE', 'ADJUSTMENT')),
    points INT NOT NULL,
    reference_type VARCHAR(30),
    reference_id INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loyalty_points_customer ON customer_loyalty_points(customer_id);
CREATE INDEX idx_loyalty_history_customer ON loyalty_points_history(customer_id);

-- ============================================
-- 10. MÓDULO DE VENTAS
-- ============================================

CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sale_number VARCHAR(50) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    discount_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    discount_amount DECIMAL(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    shipping_cost DECIMAL(10, 2) DEFAULT 0 CHECK (shipping_cost >= 0),
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    
    total_cost DECIMAL(10, 2) DEFAULT 0,
    net_profit DECIMAL(10, 2) DEFAULT 0,
    
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER', 'MIXED')),
    payment_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
    
    event_id INT,
    notes TEXT,
    
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, sale_number)
);

CREATE INDEX idx_sales_org ON sales(organization_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_number ON sales(sale_number);
CREATE INDEX idx_sales_event ON sales(event_id);

CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id INT REFERENCES product_variants(id) ON DELETE RESTRICT,
    
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    total_cost DECIMAL(10, 2) NOT NULL CHECK (total_cost >= 0),
    profit DECIMAL(10, 2) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

CREATE TABLE sale_supplies (
    id SERIAL PRIMARY KEY,
    sale_id INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    supply_id INT NOT NULL REFERENCES supplies(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_supplies_sale ON sale_supplies(sale_id);
CREATE INDEX idx_sale_supplies_supply ON sale_supplies(supply_id);

-- ============================================
-- 11. MÓDULO DE EVENTOS/FERIAS
-- ============================================

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('FAIR', 'MARKET', 'POPUP', 'EXHIBITION', 'OTHER')),
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
    
    total_sales DECIMAL(10, 2) DEFAULT 0,
    total_profit DECIMAL(10, 2) DEFAULT 0,
    roi_percentage DECIMAL(10, 2),
    
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice único usando COALESCE para tratar NULL como -1
CREATE UNIQUE INDEX ux_event_inventory_event_product_variant
ON event_inventory (
    event_id,
    product_id,
    COALESCE(variant_id, -1)
);

-- Índices normales (si aún los quieres además del único)
CREATE INDEX idx_event_inventory_event 
    ON event_inventory(event_id);

CREATE INDEX idx_event_inventory_product 
    ON event_inventory(product_id);


-- ============================================
-- DATOS INICIALES
-- ============================================

-- Planes de suscripción
INSERT INTO subscription_plans (name, slug, price_usd, billing_interval, max_users, max_products, max_sales_per_month, description) VALUES
('Trial', 'trial', 0.00, 'MONTHLY', 1, 50, 100, 'Plan gratuito de prueba con funcionalidades básicas'),
('Professional', 'professional', 4.99, 'MONTHLY', 5, NULL, NULL, 'Plan profesional con todas las funcionalidades');

-- Features del sistema
INSERT INTO system_features (feature_key, feature_name, description, category) VALUES
-- PRODUCTOS
('product_variants', 'Variantes de Productos', 'Crear productos con múltiples variantes (tallas, colores)', 'PRODUCTS'),
('product_images', 'Imágenes de Productos', 'Subir imágenes para productos', 'PRODUCTS'),
('unlimited_products', 'Productos Ilimitados', 'Crear productos sin límite', 'PRODUCTS'),

-- INVENTARIO
('inventory_fifo', 'Inventario FIFO', 'Gestión de inventario con método FIFO', 'INVENTORY'),
('inventory_batches', 'Lotes de Compra', 'Registrar compras por lotes', 'INVENTORY'),
('inventory_adjustments', 'Ajustes de Inventario', 'Hacer ajustes manuales de inventario', 'INVENTORY'),
('inventory_movements', 'Historial de Movimientos', 'Ver historial completo de movimientos', 'INVENTORY'),

-- SUMINISTROS
('supplies_management', 'Gestión de Suministros', 'Gestionar suministros (bolsas, stickers, tarjetas)', 'INVENTORY'),
('supplies_tracking', 'Seguimiento de Suministros', 'Rastrear uso de suministros en ventas', 'INVENTORY'),
('supplies_purchases', 'Compras de Suministros', 'Registrar compras de suministros', 'INVENTORY'),

-- VENTAS
('unlimited_sales', 'Ventas Ilimitadas', 'Registrar ventas sin límite mensual', 'SALES'),
('pos_interface', 'Punto de Venta', 'Interfaz de punto de venta', 'SALES'),
('sales_discounts', 'Descuentos en Ventas', 'Aplicar descuentos personalizados', 'SALES'),
('shipping_tracking', 'Seguimiento de Envíos', 'Registrar costos de envío', 'SALES'),

-- CLIENTES
('customer_management', 'Gestión de Clientes', 'Base de datos de clientes', 'CUSTOMERS'),
('loyalty_program', 'Programa de Lealtad', 'Sistema de clientes leales con descuentos', 'CUSTOMERS'),
('loyalty_customization', 'Personalización de Lealtad', 'Configurar reglas de lealtad personalizadas', 'CUSTOMERS'),
('customer_points', 'Sistema de Puntos', 'Programa de puntos para clientes', 'CUSTOMERS'),

-- FINANZAS
('multi_accounts', 'Múltiples Cuentas', 'Gestionar múltiples cuentas bancarias', 'FINANCES'),
('expense_tracking', 'Control de Gastos', 'Registrar gastos operativos', 'FINANCES'),
('financial_reports', 'Reportes Financieros', 'Reportes de ingresos y gastos', 'FINANCES'),
('transactions_history', 'Historial de Transacciones', 'Ver todas las transacciones', 'FINANCES'),

-- EVENTOS
('events_management', 'Gestión de Eventos', 'Planificar y gestionar ferias/eventos', 'EVENTS'),
('event_inventory', 'Inventario por Evento', 'Asignar inventario específico a eventos', 'EVENTS'),
('event_expenses', 'Gastos de Eventos', 'Registrar gastos de eventos', 'EVENTS'),
('event_roi', 'ROI de Eventos', 'Calcular rentabilidad de eventos', 'EVENTS'),

-- REPORTES
('basic_reports', 'Reportes Básicos', 'Reportes de ventas e inventario', 'REPORTS'),
('advanced_reports', 'Reportes Avanzados', 'Reportes de rentabilidad y análisis', 'REPORTS'),
('export_reports', 'Exportar Reportes', 'Exportar reportes a Excel/PDF', 'REPORTS'),
('custom_reports', 'Reportes Personalizados', 'Crear reportes personalizados', 'REPORTS'),

-- ADMIN
('multi_users', 'Múltiples Usuarios', 'Agregar múltiples usuarios a la organización', 'ADMIN'),
('user_roles', 'Roles de Usuario', 'Asignar roles y permisos', 'ADMIN'),
('api_access', 'Acceso a API', 'Acceso a la API REST', 'INTEGRATIONS'),
('priority_support', 'Soporte Prioritario', 'Soporte prioritario vía email/chat', 'ADMIN');

-- Asignar features al plan TRIAL (Limitado)
INSERT INTO plan_features (plan_id, feature_id, is_enabled)
SELECT 
    (SELECT id FROM subscription_plans WHERE slug = 'trial'),
    id,
    true
FROM system_features
WHERE feature_key IN (
    'product_images',
    'inventory_adjustments',
    'pos_interface',
    'sales_discounts',
    'customer_management',
    'expense_tracking',
    'basic_reports'
);

-- Asignar features al plan PROFESSIONAL (Completo)
INSERT INTO plan_features (plan_id, feature_id, is_enabled)
SELECT 
    (SELECT id FROM subscription_plans WHERE slug = 'professional'),
    id,
    true
FROM system_features;

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para verificar acceso a features
CREATE OR REPLACE FUNCTION has_feature_access(
    p_organization_id INT,
    p_feature_key VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN;
BEGIN
    SELECT pf.is_enabled
    INTO v_has_access
    FROM organization_subscriptions os
    JOIN plan_features pf ON pf.plan_id = os.plan_id
    JOIN system_features sf ON sf.id = pf.feature_id
    WHERE os.organization_id = p_organization_id
    AND os.status IN ('TRIAL', 'ACTIVE')
    AND sf.feature_key = p_feature_key
    AND pf.is_enabled = true;
    
    RETURN COALESCE(v_has_access, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Función para verificar límites del plan
CREATE OR REPLACE FUNCTION check_plan_limits(
    p_organization_id INT,
    p_limit_type VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_subscription RECORD;
    v_current_count INT;
BEGIN
    SELECT os.*, sp.*
    INTO v_subscription
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE os.organization_id = p_organization_id
    AND os.status IN ('TRIAL', 'ACTIVE');
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    CASE p_limit_type
        WHEN 'users' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM organization_members
            WHERE organization_id = p_organization_id;
            
            RETURN (v_subscription.max_users IS NULL OR v_current_count < v_subscription.max_users);
            
        WHEN 'products' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM products
            WHERE organization_id = p_organization_id;
            
            RETURN (v_subscription.max_products IS NULL OR v_current_count < v_subscription.max_products);
            
        WHEN 'sales' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM sales
            WHERE organization_id = p_organization_id
            AND sale_date >= date_trunc('month', CURRENT_DATE);
            
            RETURN (v_subscription.max_sales_per_month IS NULL OR v_current_count < v_subscription.max_sales_per_month);
            
        ELSE
            RETURN TRUE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplies_updated_at BEFORE UPDATE ON supplies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_settings_updated_at BEFORE UPDATE ON loyalty_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_subscriptions_updated_at BEFORE UPDATE ON organization_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_batches_updated_at BEFORE UPDATE ON purchase_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_inventory_updated_at BEFORE UPDATE ON event_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar lealtad del cliente
CREATE OR REPLACE FUNCTION update_customer_loyalty()
RETURNS TRIGGER AS $$
DECLARE
    v_settings RECORD;
    v_eligible_purchases INT;
BEGIN
    SELECT * INTO v_settings
    FROM loyalty_settings
    WHERE organization_id = NEW.organization_id
    AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    CASE v_settings.loyalty_type
        WHEN 'PURCHASES_COUNT' THEN
            IF NEW.total_purchases >= v_settings.required_purchases THEN
                NEW.is_loyal := TRUE;
            END IF;
            
        WHEN 'TOTAL_SPENT' THEN
            IF NEW.total_spent >= v_settings.minimum_total_spent THEN
                NEW.is_loyal := TRUE;
            END IF;
            
        WHEN 'PURCHASES_AND_AMOUNT' THEN
            SELECT COUNT(*) INTO v_eligible_purchases
            FROM sales
            WHERE customer_id = NEW.id
            AND total >= v_settings.minimum_purchase_amount;
            
            IF v_eligible_purchases >= v_settings.required_purchases 
               OR NEW.total_spent >= v_settings.minimum_total_spent THEN
                NEW.is_loyal := TRUE;
            END IF;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_loyalty
    BEFORE UPDATE OF total_purchases, total_spent ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_loyalty();

-- Trigger para actualizar balance de cuentas
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type IN ('SALE', 'INCOME', 'DEPOSIT') THEN
        IF NEW.to_account_id IS NOT NULL THEN
            UPDATE accounts 
            SET balance = balance + NEW.amount
            WHERE id = NEW.to_account_id;
        END IF;
    ELSIF NEW.type IN ('PURCHASE_PRODUCT', 'PURCHASE_SUPPLY', 'EXPENSE', 'WITHDRAWAL') THEN
        IF NEW.from_account_id IS NOT NULL THEN
            UPDATE accounts 
            SET balance = balance - NEW.amount
            WHERE id = NEW.from_account_id;
        END IF;
    ELSIF NEW.type = 'TRANSFER' THEN
        IF NEW.from_account_id IS NOT NULL THEN
            UPDATE accounts 
            SET balance = balance - NEW.amount
            WHERE id = NEW.from_account_id;
        END IF;
        IF NEW.to_account_id IS NOT NULL THEN
            UPDATE accounts 
            SET balance = balance + NEW.amount
            WHERE id = NEW.to_account_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_balance
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

-- ============================================
-- VISTA CONSOLIDADA DE FEATURES POR ORGANIZACIÓN
-- ============================================

CREATE OR REPLACE VIEW organization_features AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    sf.feature_key,
    sf.feature_name,
    sf.category,
    sf.description,
    pf.is_enabled,
    pf.limit_value,
    sp.name as plan_name,
    sp.slug as plan_slug,
    os.status as subscription_status
FROM organizations o
JOIN organization_subscriptions os ON os.organization_id = o.id
JOIN subscription_plans sp ON sp.id = os.plan_id
JOIN plan_features pf ON pf.plan_id = sp.id
JOIN system_features sf ON sf.id = pf.feature_id
WHERE os.status IN ('TRIAL', 'ACTIVE')
AND pf.is_enabled = true;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- Verificar que todo se creó correctamente
SELECT 'Base de datos creada exitosamente!' as message;
SELECT 'Planes: ' || COUNT(*) as info FROM subscription_plans;
SELECT 'Features: ' || COUNT(*) as info FROM system_features;
SELECT 'Plan Features: ' || COUNT(*) as info FROM plan_features;