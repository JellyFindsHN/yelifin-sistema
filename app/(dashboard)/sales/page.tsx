"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Plus,
  Search,
  Eye,
  Receipt,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  TrendingUp,
  DollarSign,
  ShoppingCart,
} from "lucide-react"
import { mockSales, type Sale } from "@/lib/mock-data"
import Loading from "./loading"

export default function SalesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const searchParams = useSearchParams()

  const filteredSales = mockSales.filter((sale) => {
    const matchesSearch =
      sale.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesPayment =
      paymentFilter === "all" || sale.payment_method === paymentFilter
    return matchesSearch && matchesPayment
  })

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0)
  const totalProfit = filteredSales.reduce((acc, s) => acc + s.net_profit, 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-HN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <Banknote className="h-4 w-4" />
      case "CARD":
        return <CreditCard className="h-4 w-4" />
      case "TRANSFER":
        return <ArrowLeftRight className="h-4 w-4" />
      default:
        return null
    }
  }

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case "CASH":
        return "Efectivo"
      case "CARD":
        return "Tarjeta"
      case "TRANSFER":
        return "Transferencia"
      default:
        return method
    }
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
            <p className="text-muted-foreground">
              Historial y gestión de ventas
            </p>
          </div>
          <Button asChild>
            <Link href="/sales/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Venta (POS)
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredSales.length}</div>
              <p className="text-xs text-muted-foreground">ventas registradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">total facturado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(totalProfit)}</div>
              <p className="text-xs text-muted-foreground">utilidad generada</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número o cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los métodos</SelectItem>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="CARD">Tarjeta</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Ganancia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.sale_number}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(sale.sale_date)}
                    </TableCell>
                    <TableCell>{sale.customer_name || "Sin cliente"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {sale.items.length} {sale.items.length === 1 ? "producto" : "productos"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {getPaymentIcon(sale.payment_method)}
                        {getPaymentLabel(sale.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total)}
                    </TableCell>
                    <TableCell className="text-right text-success">
                      {formatCurrency(sale.net_profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedSale(sale)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {filteredSales.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No se encontraron ventas</p>
              <p className="text-sm text-muted-foreground">
                Intenta con otros filtros de búsqueda
              </p>
            </CardContent>
          </Card>
        )}

        {/* Sale Detail Dialog */}
        <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {selectedSale?.sale_number}
              </DialogTitle>
              <DialogDescription>
                {selectedSale && formatDate(selectedSale.sale_date)}
              </DialogDescription>
            </DialogHeader>

            {selectedSale && (
              <div className="space-y-4">
                {/* Customer */}
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedSale.customer_name || "Sin cliente"}</p>
                </div>

                {/* Items */}
                <div>
                  <p className="mb-2 text-sm font-medium">Productos</p>
                  <div className="space-y-2">
                    {selectedSale.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          {item.variant_name && (
                            <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} x {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                        <p className="font-medium">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Descuento</span>
                      <span>-{formatCurrency(selectedSale.discount)}</span>
                    </div>
                  )}
                  {selectedSale.shipping > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Envío</span>
                      <span>{formatCurrency(selectedSale.shipping)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(selectedSale.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Método de pago</span>
                    <Badge variant="outline" className="gap-1">
                      {getPaymentIcon(selectedSale.payment_method)}
                      {getPaymentLabel(selectedSale.payment_method)}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm text-success">
                    <span>Ganancia Neta</span>
                    <span className="font-medium">{formatCurrency(selectedSale.net_profit)}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}
