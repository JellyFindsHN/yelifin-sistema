// Mock data store for JellyFinds demo

export interface Product {
  id: string
  name: string
  description: string
  sku: string
  category: string
  base_price: number
  image_url: string | null
  is_active: boolean
  created_at: string
  stock: number
  cost: number
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  sku: string
  price_adjustment: number
  stock: number
  cost: number
}

export interface Sale {
  id: string
  sale_number: string
  customer_id: string | null
  customer_name: string | null
  subtotal: number
  discount: number
  shipping: number
  total: number
  net_profit: number
  payment_method: 'CASH' | 'CARD' | 'TRANSFER'
  account_id: string
  sale_date: string
  items: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  variant_id: string | null
  variant_name: string | null
  quantity: number
  unit_price: number
  unit_cost: number
  total: number
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  total_purchases: number
  total_spent: number
  is_loyal: boolean
  loyalty_discount: number
  created_at: string
}

export interface Account {
  id: string
  name: string
  type: 'CASH' | 'BANK'
  balance: number
  is_active: boolean
  icon: string
}

export interface Transaction {
  id: string
  account_id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number
  description: string
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

export interface Event {
  id: string
  name: string
  location: string
  start_date: string
  end_date: string
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  fixed_costs: number
  total_sales: number
  total_expenses: number
  net_profit: number
}

export interface Supply {
  id: string
  name: string
  type: 'CONTABLE' | 'NO_CONTABLE'
  unit: string
  current_stock: number
  min_stock: number
  cost_per_unit: number
  estimated_usage_per_sale: number | null
}

// Mock Products
export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Camiseta Básica',
    description: 'Camiseta de algodón 100%',
    sku: 'CAM-001',
    category: 'Ropa',
    base_price: 299,
    image_url: null,
    is_active: true,
    created_at: '2024-01-15',
    stock: 45,
    cost: 120,
  },
  {
    id: '2',
    name: 'Pantalón Jeans',
    description: 'Jeans corte regular',
    sku: 'PAN-001',
    category: 'Ropa',
    base_price: 599,
    image_url: null,
    is_active: true,
    created_at: '2024-01-15',
    stock: 28,
    cost: 280,
  },
  {
    id: '3',
    name: 'Sudadera con Capucha',
    description: 'Sudadera de algodón con capucha',
    sku: 'SUD-001',
    category: 'Ropa',
    base_price: 450,
    image_url: null,
    is_active: true,
    created_at: '2024-01-20',
    stock: 15,
    cost: 200,
  },
  {
    id: '4',
    name: 'Gorra Bordada',
    description: 'Gorra con logo bordado',
    sku: 'GOR-001',
    category: 'Accesorios',
    base_price: 180,
    image_url: null,
    is_active: true,
    created_at: '2024-02-01',
    stock: 8,
    cost: 65,
  },
  {
    id: '5',
    name: 'Bolsa de Tela',
    description: 'Bolsa ecológica de tela',
    sku: 'BOL-001',
    category: 'Accesorios',
    base_price: 120,
    image_url: null,
    is_active: true,
    created_at: '2024-02-05',
    stock: 52,
    cost: 35,
  },
  {
    id: '6',
    name: 'Llavero Personalizado',
    description: 'Llavero con diseño personalizado',
    sku: 'LLA-001',
    category: 'Accesorios',
    base_price: 50,
    image_url: null,
    is_active: true,
    created_at: '2024-02-10',
    stock: 3,
    cost: 15,
  },
]

// Mock Product Variants
export const mockVariants: ProductVariant[] = [
  { id: 'v1', product_id: '1', name: 'S - Negro', sku: 'CAM-001-S-NEG', price_adjustment: 0, stock: 15, cost: 120 },
  { id: 'v2', product_id: '1', name: 'M - Negro', sku: 'CAM-001-M-NEG', price_adjustment: 0, stock: 20, cost: 120 },
  { id: 'v3', product_id: '1', name: 'L - Negro', sku: 'CAM-001-L-NEG', price_adjustment: 0, stock: 10, cost: 120 },
  { id: 'v4', product_id: '2', name: '30 - Azul', sku: 'PAN-001-30-AZU', price_adjustment: 0, stock: 12, cost: 280 },
  { id: 'v5', product_id: '2', name: '32 - Azul', sku: 'PAN-001-32-AZU', price_adjustment: 0, stock: 16, cost: 280 },
  { id: 'v6', product_id: '3', name: 'M - Gris', sku: 'SUD-001-M-GRI', price_adjustment: 0, stock: 8, cost: 200 },
  { id: 'v7', product_id: '3', name: 'L - Gris', sku: 'SUD-001-L-GRI', price_adjustment: 0, stock: 7, cost: 200 },
]

// Mock Sales
export const mockSales: Sale[] = [
  {
    id: 's1',
    sale_number: 'V-2024-001',
    customer_id: 'c1',
    customer_name: 'María García',
    subtotal: 749,
    discount: 0,
    shipping: 50,
    total: 799,
    net_profit: 364,
    payment_method: 'CARD',
    account_id: 'a2',
    sale_date: '2024-01-20T10:30:00',
    items: [
      { id: 'si1', sale_id: 's1', product_id: '1', product_name: 'Camiseta Básica', variant_id: 'v2', variant_name: 'M - Negro', quantity: 2, unit_price: 299, unit_cost: 120, total: 598 },
      { id: 'si2', sale_id: 's1', product_id: '5', product_name: 'Bolsa de Tela', variant_id: null, variant_name: null, quantity: 1, unit_price: 120, unit_cost: 35, total: 120 },
    ],
  },
  {
    id: 's2',
    sale_number: 'V-2024-002',
    customer_id: 'c2',
    customer_name: 'Carlos López',
    subtotal: 599,
    discount: 60,
    shipping: 0,
    total: 539,
    net_profit: 199,
    payment_method: 'CASH',
    account_id: 'a1',
    sale_date: '2024-01-21T14:15:00',
    items: [
      { id: 'si3', sale_id: 's2', product_id: '2', product_name: 'Pantalón Jeans', variant_id: 'v4', variant_name: '30 - Azul', quantity: 1, unit_price: 599, unit_cost: 280, total: 599 },
    ],
  },
  {
    id: 's3',
    sale_number: 'V-2024-003',
    customer_id: null,
    customer_name: null,
    subtotal: 450,
    discount: 0,
    shipping: 75,
    total: 525,
    net_profit: 250,
    payment_method: 'TRANSFER',
    account_id: 'a2',
    sale_date: '2024-01-22T09:45:00',
    items: [
      { id: 'si4', sale_id: 's3', product_id: '3', product_name: 'Sudadera con Capucha', variant_id: 'v6', variant_name: 'M - Gris', quantity: 1, unit_price: 450, unit_cost: 200, total: 450 },
    ],
  },
  {
    id: 's4',
    sale_number: 'V-2024-004',
    customer_id: 'c1',
    customer_name: 'María García',
    subtotal: 360,
    discount: 0,
    shipping: 0,
    total: 360,
    net_profit: 165,
    payment_method: 'CARD',
    account_id: 'a3',
    sale_date: '2024-01-23T16:20:00',
    items: [
      { id: 'si5', sale_id: 's4', product_id: '4', product_name: 'Gorra Bordada', variant_id: null, variant_name: null, quantity: 2, unit_price: 180, unit_cost: 65, total: 360 },
    ],
  },
  {
    id: 's5',
    sale_number: 'V-2024-005',
    customer_id: 'c3',
    customer_name: 'Ana Martínez',
    subtotal: 170,
    discount: 17,
    shipping: 50,
    total: 203,
    net_profit: 103,
    payment_method: 'CASH',
    account_id: 'a1',
    sale_date: '2024-01-24T11:00:00',
    items: [
      { id: 'si6', sale_id: 's5', product_id: '5', product_name: 'Bolsa de Tela', variant_id: null, variant_name: null, quantity: 1, unit_price: 120, unit_cost: 35, total: 120 },
      { id: 'si7', sale_id: 's5', product_id: '6', product_name: 'Llavero Personalizado', variant_id: null, variant_name: null, quantity: 1, unit_price: 50, unit_cost: 15, total: 50 },
    ],
  },
]

// Mock Customers
export const mockCustomers: Customer[] = [
  {
    id: 'c1',
    name: 'María García',
    email: 'maria.garcia@email.com',
    phone: '+504 9876-5432',
    address: 'Col. Kennedy, Tegucigalpa',
    total_purchases: 5,
    total_spent: 2850,
    is_loyal: true,
    loyalty_discount: 10,
    created_at: '2024-01-10',
  },
  {
    id: 'c2',
    name: 'Carlos López',
    email: 'carlos.lopez@email.com',
    phone: '+504 8765-4321',
    address: 'Col. Palmira, Tegucigalpa',
    total_purchases: 3,
    total_spent: 1520,
    is_loyal: false,
    loyalty_discount: 0,
    created_at: '2024-01-12',
  },
  {
    id: 'c3',
    name: 'Ana Martínez',
    email: 'ana.martinez@email.com',
    phone: '+504 7654-3210',
    address: 'Col. Miraflores, Tegucigalpa',
    total_purchases: 8,
    total_spent: 4200,
    is_loyal: true,
    loyalty_discount: 15,
    created_at: '2024-01-05',
  },
  {
    id: 'c4',
    name: 'Roberto Hernández',
    email: 'roberto.h@email.com',
    phone: '+504 6543-2109',
    address: 'Col. Las Colinas, San Pedro Sula',
    total_purchases: 2,
    total_spent: 890,
    is_loyal: false,
    loyalty_discount: 0,
    created_at: '2024-01-18',
  },
]

// Mock Accounts
export const mockAccounts: Account[] = [
  { id: 'a1', name: 'Efectivo', type: 'CASH', balance: 15420, is_active: true, icon: 'banknote' },
  { id: 'a2', name: 'BAC', type: 'BANK', balance: 28750, is_active: true, icon: 'building' },
  { id: 'a3', name: 'Atlántida', type: 'BANK', balance: 12300, is_active: true, icon: 'building' },
]

// Mock Transactions
export const mockTransactions: Transaction[] = [
  { id: 't1', account_id: 'a1', type: 'INCOME', amount: 539, description: 'Venta V-2024-002', reference_type: 'sale', reference_id: 's2', created_at: '2024-01-21T14:15:00' },
  { id: 't2', account_id: 'a2', type: 'INCOME', amount: 799, description: 'Venta V-2024-001', reference_type: 'sale', reference_id: 's1', created_at: '2024-01-20T10:30:00' },
  { id: 't3', account_id: 'a1', type: 'EXPENSE', amount: 1500, description: 'Compra de inventario', reference_type: 'purchase', reference_id: 'p1', created_at: '2024-01-19T09:00:00' },
  { id: 't4', account_id: 'a2', type: 'INCOME', amount: 525, description: 'Venta V-2024-003', reference_type: 'sale', reference_id: 's3', created_at: '2024-01-22T09:45:00' },
  { id: 't5', account_id: 'a3', type: 'INCOME', amount: 360, description: 'Venta V-2024-004', reference_type: 'sale', reference_id: 's4', created_at: '2024-01-23T16:20:00' },
  { id: 't6', account_id: 'a1', type: 'EXPENSE', amount: 250, description: 'Gastos de envío', reference_type: null, reference_id: null, created_at: '2024-01-22T11:00:00' },
  { id: 't7', account_id: 'a2', type: 'TRANSFER', amount: 5000, description: 'Transferencia a Efectivo', reference_type: null, reference_id: null, created_at: '2024-01-20T08:00:00' },
]

// Mock Events
export const mockEvents: Event[] = [
  {
    id: 'e1',
    name: 'Feria del Emprendedor 2024',
    location: 'Mall Multiplaza, Tegucigalpa',
    start_date: '2024-02-15',
    end_date: '2024-02-17',
    status: 'COMPLETED',
    fixed_costs: 2500,
    total_sales: 8500,
    total_expenses: 3200,
    net_profit: 5300,
  },
  {
    id: 'e2',
    name: 'Expo Artesanal',
    location: 'Centro Cultural, San Pedro Sula',
    start_date: '2024-03-01',
    end_date: '2024-03-03',
    status: 'PLANNED',
    fixed_costs: 1800,
    total_sales: 0,
    total_expenses: 1800,
    net_profit: -1800,
  },
  {
    id: 'e3',
    name: 'Mercadito Navideño',
    location: 'Parque Central, Tegucigalpa',
    start_date: '2023-12-15',
    end_date: '2023-12-24',
    status: 'COMPLETED',
    fixed_costs: 3000,
    total_sales: 15200,
    total_expenses: 5500,
    net_profit: 9700,
  },
]

// Mock Supplies
export const mockSupplies: Supply[] = [
  { id: 'sup1', name: 'Bolsas de empaque', type: 'CONTABLE', unit: 'unidad', current_stock: 150, min_stock: 50, cost_per_unit: 2, estimated_usage_per_sale: null },
  { id: 'sup2', name: 'Etiquetas de precio', type: 'CONTABLE', unit: 'unidad', current_stock: 45, min_stock: 100, cost_per_unit: 0.5, estimated_usage_per_sale: null },
  { id: 'sup3', name: 'Cinta adhesiva', type: 'CONTABLE', unit: 'rollo', current_stock: 8, min_stock: 5, cost_per_unit: 25, estimated_usage_per_sale: null },
  { id: 'sup4', name: 'Electricidad', type: 'NO_CONTABLE', unit: 'mes', current_stock: 0, min_stock: 0, cost_per_unit: 500, estimated_usage_per_sale: 2 },
  { id: 'sup5', name: 'Internet', type: 'NO_CONTABLE', unit: 'mes', current_stock: 0, min_stock: 0, cost_per_unit: 350, estimated_usage_per_sale: 1 },
]

// Dashboard metrics calculations
export function getDashboardMetrics() {
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const monthlySales = mockSales.filter(s => {
    const saleDate = new Date(s.sale_date)
    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear
  })

  const totalRevenue = mockSales.reduce((acc, s) => acc + s.total, 0)
  const totalProfit = mockSales.reduce((acc, s) => acc + s.net_profit, 0)
  const totalInventory = mockProducts.reduce((acc, p) => acc + p.stock, 0)
  const totalCash = mockAccounts.reduce((acc, a) => acc + a.balance, 0)

  return {
    totalSales: mockSales.length,
    totalRevenue,
    totalProfit,
    totalInventory,
    totalCash,
    averageTicket: totalRevenue / mockSales.length,
  }
}

// Chart data
export function getSalesChartData() {
  const last30Days = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    // Generate realistic mock data
    const sales = Math.floor(Math.random() * 3000) + 500
    const profit = Math.floor(sales * (0.3 + Math.random() * 0.2))
    
    last30Days.push({
      date: dateStr,
      label: date.toLocaleDateString('es-HN', { day: '2-digit', month: 'short' }),
      ventas: sales,
      ganancias: profit,
    })
  }
  return last30Days
}

export function getTopProductsData() {
  return mockProducts
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 5)
    .map(p => ({
      name: p.name,
      ventas: Math.floor(Math.random() * 50) + 10,
      ingresos: (Math.floor(Math.random() * 50) + 10) * p.base_price,
    }))
}

export function getPaymentMethodsData() {
  const methods = { CASH: 0, CARD: 0, TRANSFER: 0 }
  mockSales.forEach(s => {
    methods[s.payment_method] += s.total
  })
  return [
    { name: 'Efectivo', value: methods.CASH, fill: '#10B981' },
    { name: 'Tarjeta', value: methods.CARD, fill: '#3B82F6' },
    { name: 'Transferencia', value: methods.TRANSFER, fill: '#8B5CF6' },
  ]
}

export function getLowStockProducts() {
  return mockProducts.filter(p => p.stock < 10)
}

export function getLowStockSupplies() {
  return mockSupplies.filter(s => s.type === 'CONTABLE' && s.current_stock < s.min_stock)
}
