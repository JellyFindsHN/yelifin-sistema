// ============================================
// USUARIO Y ORGANIZACIÓN
// ============================================

export interface User {
  id: number;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: number;
  organization_id: number;
  user_id: number;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joined_at: string;
}

// ============================================
// PRODUCTOS
// ============================================

export interface Product {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  price_lempiras: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  stock?: number; // Calculado desde inventory
}

export interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  sku: string | null;
  created_at: string;
}

// ============================================
// COMPRAS E INVENTARIO
// ============================================

export interface PurchaseBatch {
  id: number;
  organization_id: number;
  batch_date: string;
  usd_to_lempiras_rate: number;
  total_cost: number | null;
  payment_account_id: number | null;
  is_paid: boolean;
  payment_date: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export interface BatchItem {
  id: number;
  batch_id: number;
  product_id: number;
  variant_id: number | null;
  quantity: number;
  price_usd: number;
  price_lempiras: number;
  supplier_shipping_cost: number;
  unit_cost: number;
  created_at: string;
}

export interface Inventory {
  organization_id: number;
  product_id: number;
  variant_id: number | null;
  quantity: number;
  last_updated: string;
}

// ============================================
// SUMINISTROS
// ============================================

export interface Supply {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  type: 'COUNTABLE' | 'NON_COUNTABLE';
  unit_type: string | null;
  stock: number | null;
  min_stock: number;
  estimated_usage_per_sale: number | null;
  unit_cost: number;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// FINANZAS
// ============================================

export interface Account {
  id: number;
  organization_id: number;
  name: string;
  type: 'CASH' | 'BANK' | 'CREDIT_CARD';
  account_number: string | null;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  organization_id: number;
  transaction_date: string;
  type: 'SALE' | 'PURCHASE_PRODUCT' | 'PURCHASE_SUPPLY' | 'TRANSFER' | 'EXPENSE' | 'INCOME' | 'WITHDRAWAL' | 'DEPOSIT';
  category: string | null;
  from_account_id: number | null;
  to_account_id: number | null;
  amount: number;
  reference_type: string | null;
  reference_id: number | null;
  description: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

// ============================================
// CLIENTES
// ============================================

export interface Customer {
  id: number;
  organization_id: number;
  name: string;
  phone: string | null;
  address: string | null;
  is_loyal: boolean;
  total_purchases: number;
  total_spent: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// VENTAS
// ============================================

export interface Sale {
  id: number;
  organization_id: number;
  sale_date: string;
  customer_id: number | null;
  event_id: number | null;
  subtotal: number;
  discount_amount: number;
  discount_type: string | null;
  total: number;
  product_cost: number;
  supply_cost: number;
  total_cost: number;
  net_profit: number;
  shipping_type: 'LOCAL' | 'NATIONAL' | null;
  shipping_cost: number;
  payment_method: 'CASH' | 'TRANSFER';
  account_id: number;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  variant_id: number | null;
  inventory_batch_id: number | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  profit: number;
  created_at: string;
}

// ============================================
// EVENTOS
// ============================================

export interface Event {
  id: number;
  organization_id: number;
  name: string;
  event_type: 'FAIR' | 'MARKET' | 'POPUP' | 'EXHIBITION';
  location: string | null;
  address: string | null;
  start_date: string;
  end_date: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  booth_cost: number;
  transport_cost: number;
  setup_cost: number;
  other_costs: number;
  total_fixed_costs: number;
  cash_account_id: number | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}