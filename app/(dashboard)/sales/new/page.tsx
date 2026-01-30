"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Truck,
  User,
  Receipt,
  CheckCircle,
} from "lucide-react"
import { mockProducts, mockCustomers, mockAccounts, type Product, type Customer } from "@/lib/mock-data"
import { Suspense } from "react"
import Loading from "@/components/ui/loading" // Assuming Loading is a component that needs to be imported

interface CartItem {
  product: Product
  quantity: number
}

export default function POSPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [discount, setDiscount] = useState(0)
  const [shippingType, setShippingType] = useState<"none" | "local" | "national">("none")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER">("CASH")
  const [selectedAccount, setSelectedAccount] = useState(mockAccounts[0].id)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)

  const filteredProducts = mockProducts.filter(
    (product) =>
      product.is_active &&
      product.stock > 0 &&
      (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        if (existing.quantity < product.stock) {
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
        return prev
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta
            if (newQty <= 0) return null
            if (newQty > item.product.stock) return item
            return { ...item, quantity: newQty }
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.base_price * item.quantity,
    0
  )

  const loyaltyDiscount = selectedCustomer?.loyalty_discount
    ? (subtotal * selectedCustomer.loyalty_discount) / 100
    : 0
  const manualDiscount = discount
  const totalDiscount = loyaltyDiscount + manualDiscount

  const shippingCost =
    shippingType === "local" ? 50 : shippingType === "national" ? 150 : 0

  const total = subtotal - totalDiscount + shippingCost

  const totalCost = cart.reduce(
    (acc, item) => acc + item.product.cost * item.quantity,
    0
  )
  const netProfit = total - totalCost

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleCheckout = () => {
    setIsCheckoutOpen(false)
    setIsSuccessOpen(true)
  }

  const handleFinish = () => {
    setIsSuccessOpen(false)
    setCart([])
    setSelectedCustomer(null)
    setDiscount(0)
    setShippingType("none")
    router.push("/sales")
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Products Grid */}
      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id)
              return (
                <Card
                  key={product.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    inCart ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-3">
                    <div className="mb-2 flex aspect-square items-center justify-center rounded-lg bg-muted">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-1">
                      <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-primary">
                          {formatCurrency(product.base_price)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {product.stock}
                        </Badge>
                      </div>
                      {inCart && (
                        <Badge className="w-full justify-center bg-primary">
                          {inCart.quantity} en carrito
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No hay productos disponibles</p>
              <p className="text-sm text-muted-foreground">
                Intenta buscar otro producto
              </p>
            </div>
          )}
        </div>

        {/* Cart */}
        <Card className="flex w-96 flex-col">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5" />
              Carrito de Venta
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-auto p-4">
            {/* Customer Selection */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select
                value={selectedCustomer?.id || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setSelectedCustomer(null)
                  } else {
                    setSelectedCustomer(
                      mockCustomers.find((c) => c.id === value) || null
                    )
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sin cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {mockCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {customer.name}
                        {customer.is_loyal && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            Leal
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer?.is_loyal && (
                <p className="mt-1 text-xs text-success">
                  Descuento de lealtad: {selectedCustomer.loyalty_discount}%
                </p>
              )}
            </div>

            <Separator className="mb-4" />

            {/* Cart Items */}
            <div className="space-y-3">
              {cart.length === 0 ? (
                <div className="py-8 text-center">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Agrega productos al carrito
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 rounded-lg border p-2"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.product.base_price)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation()
                          updateQuantity(item.product.id, -1)
                        }}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation()
                          updateQuantity(item.product.id, 1)
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFromCart(item.product.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>

          {/* Cart Footer */}
          <CardFooter className="flex-col gap-3 border-t p-4">
            {/* Shipping */}
            <div className="w-full">
              <Label className="text-xs text-muted-foreground">Envío</Label>
              <div className="mt-1 flex gap-2">
                <Button
                  variant={shippingType === "none" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setShippingType("none")}
                >
                  Sin envío
                </Button>
                <Button
                  variant={shippingType === "local" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setShippingType("local")}
                >
                  <Truck className="mr-1 h-3 w-3" />
                  L50
                </Button>
                <Button
                  variant={shippingType === "national" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setShippingType("national")}
                >
                  <Truck className="mr-1 h-3 w-3" />
                  L150
                </Button>
              </div>
            </div>

            {/* Discount */}
            <div className="w-full">
              <Label htmlFor="discount" className="text-xs text-muted-foreground">
                Descuento Manual (L)
              </Label>
              <Input
                id="discount"
                type="number"
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value))}
                placeholder="0"
                className="mt-1"
              />
            </div>

            <Separator />

            {/* Totals */}
            <div className="w-full space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Descuento</span>
                  <span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span>{formatCurrency(shippingCost)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Cobrar {formatCurrency(total)}
            </Button>
          </CardFooter>
        </Card>

        {/* Checkout Dialog */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Venta</DialogTitle>
              <DialogDescription>
                Selecciona el método de pago para completar la venta
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Payment Method */}
              <div>
                <Label className="text-sm">Método de Pago</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Button
                    variant={paymentMethod === "CASH" ? "default" : "outline"}
                    className="flex-col gap-1 py-4"
                    onClick={() => setPaymentMethod("CASH")}
                  >
                    <Banknote className="h-5 w-5" />
                    <span className="text-xs">Efectivo</span>
                  </Button>
                  <Button
                    variant={paymentMethod === "CARD" ? "default" : "outline"}
                    className="flex-col gap-1 py-4"
                    onClick={() => setPaymentMethod("CARD")}
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-xs">Tarjeta</span>
                  </Button>
                  <Button
                    variant={paymentMethod === "TRANSFER" ? "default" : "outline"}
                    className="flex-col gap-1 py-4"
                    onClick={() => setPaymentMethod("TRANSFER")}
                  >
                    <ArrowLeftRight className="h-5 w-5" />
                    <span className="text-xs">Transferencia</span>
                  </Button>
                </div>
              </div>

              {/* Account Selection */}
              <div>
                <Label className="text-sm">Cuenta de Destino</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(account.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Summary */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Productos</span>
                  <span>{cart.reduce((acc, i) => acc + i.quantity, 0)} items</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cliente</span>
                  <span>{selectedCustomer?.name || "Sin cliente"}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total a Cobrar</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-success">
                  <span>Ganancia Neta</span>
                  <span>{formatCurrency(netProfit)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCheckout}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Venta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle className="h-6 w-6" />
                Venta Registrada
              </DialogTitle>
              <DialogDescription>
                La venta se ha procesado exitosamente
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 text-center">
              <p className="text-3xl font-bold">{formatCurrency(total)}</p>
              <p className="text-sm text-muted-foreground">Total cobrado</p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleFinish}>
                Nueva Venta
              </Button>
              <Button onClick={() => router.push("/sales")}>
                Ver Ventas
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}
