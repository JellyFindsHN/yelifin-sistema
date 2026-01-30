"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Search,
  Package,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Download,
} from "lucide-react"
import { mockProducts, mockVariants } from "@/lib/mock-data"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const searchParams = useSearchParams()

  // Combine products with their variants for inventory view
  const inventoryItems = mockProducts.flatMap((product) => {
    const variants = mockVariants.filter((v) => v.product_id === product.id)
    if (variants.length > 0) {
      return variants.map((variant) => ({
        id: `${product.id}-${variant.id}`,
        product_id: product.id,
        product_name: product.name,
        variant_id: variant.id,
        variant_name: variant.name,
        sku: variant.sku,
        stock: variant.stock,
        cost: variant.cost,
        value: variant.stock * variant.cost,
        image_url: product.image_url,
      }))
    }
    return [
      {
        id: product.id,
        product_id: product.id,
        product_name: product.name,
        variant_id: null,
        variant_name: null,
        sku: product.sku,
        stock: product.stock,
        cost: product.cost,
        value: product.stock * product.cost,
        image_url: product.image_url,
      },
    ]
  })

  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.variant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

    let matchesStock = true
    if (stockFilter === "low") matchesStock = item.stock < 10
    else if (stockFilter === "out") matchesStock = item.stock === 0
    else if (stockFilter === "ok") matchesStock = item.stock >= 10

    return matchesSearch && matchesStock
  })

  const totalItems = inventoryItems.reduce((acc, i) => acc + i.stock, 0)
  const totalValue = inventoryItems.reduce((acc, i) => acc + i.value, 0)
  const lowStockCount = inventoryItems.filter((i) => i.stock < 10 && i.stock > 0).length
  const outOfStockCount = inventoryItems.filter((i) => i.stock === 0).length

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Agotado</Badge>
    } else if (stock < 5) {
      return <Badge variant="destructive">{stock} uds</Badge>
    } else if (stock < 10) {
      return <Badge className="bg-warning text-warning-foreground">{stock} uds</Badge>
    }
    return <Badge className="bg-success text-success-foreground">{stock} uds</Badge>
  }

  return (
    <Suspense fallback={null}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
            <p className="text-muted-foreground">
              Control y gestión de stock de productos
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
              <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">
                en {inventoryItems.length} productos/variantes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor del Inventario</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
              <p className="text-xs text-muted-foreground">a costo de adquisición</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{lowStockCount}</div>
              <p className="text-xs text-muted-foreground">productos con menos de 10 uds</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agotados</CardTitle>
              <Package className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{outOfStockCount}</div>
              <p className="text-xs text-muted-foreground">productos sin stock</p>
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
                  placeholder="Buscar por producto, variante o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Estado de stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el inventario</SelectItem>
                  <SelectItem value="ok">Stock suficiente</SelectItem>
                  <SelectItem value="low">Stock bajo</SelectItem>
                  <SelectItem value="out">Agotados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Variante</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Costo Unitario</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{item.product_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.variant_name ? (
                        <Badge variant="outline">{item.variant_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>{getStockBadge(item.stock)}</TableCell>
                    <TableCell>{formatCurrency(item.cost)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {filteredItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Warehouse className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No se encontraron productos</p>
              <p className="text-sm text-muted-foreground">
                Intenta con otros filtros de búsqueda
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Suspense>
  )
}
