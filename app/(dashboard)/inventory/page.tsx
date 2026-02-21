// app/(dashboard)/inventory/page.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Package,
  Warehouse,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { useInventory } from "@/hooks/swr/use-inventory";
import Image from "next/image";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 0,
  }).format(value);

const getStockBadge = (stock: number) => {
  if (stock === 0)
    return <Badge variant="destructive">Agotado</Badge>;
  if (stock < 5)
    return <Badge variant="destructive">{stock} uds</Badge>;
  if (stock < 10)
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{stock} uds</Badge>;
  return <Badge className="bg-green-100 text-green-700 border-green-200">{stock} uds</Badge>;
};

export default function InventoryPage() {
  const { inventory, stats, isLoading } = useInventory();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  const filtered = inventory.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku?.toLowerCase().includes(search.toLowerCase()) ?? false);

    const matchesStock =
      stockFilter === "all" ? true :
      stockFilter === "out" ? item.stock === 0 :
      stockFilter === "low" ? item.stock > 0 && item.stock < 10 :
      item.stock >= 10;

    return matchesSearch && matchesStock;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground">Control y gestión de stock</p>
      </div>

      {/* Stats — 2 columnas en móvil, 4 en desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[
          {
            title: "Unidades",
            value: isLoading ? "—" : stats.total_stock,
            sub: `${stats.total_products} productos`,
            icon: Warehouse,
          },
          {
            title: "Valor",
            value: isLoading ? "—" : formatCurrency(stats.total_value),
            sub: "costo adquisición",
            icon: DollarSign,
          },
          {
            title: "Stock bajo",
            value: isLoading ? "—" : stats.low_stock,
            sub: "menos de 10 uds",
            icon: AlertTriangle,
            valueClass: "text-yellow-600",
          },
          {
            title: "Agotados",
            value: isLoading ? "—" : stats.out_of_stock,
            sub: "sin stock",
            icon: Package,
            valueClass: "text-destructive",
          },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pl-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
              <div className={`text-lg font-bold md:text-xl ${stat.valueClass ?? ""}`}>
                {isLoading ? <Skeleton className="h-5 w-16" /> : stat.value}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-full sm:w-45">
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

      {/* Tabla — oculta en móvil */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Costo promedio</TableHead>
                <TableHead>Precio venta</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {item.image_url ? (
                            <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                        <span className="font-medium">{item.product_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {item.sku ?? "—"}
                    </TableCell>
                    <TableCell>{getStockBadge(item.stock)}</TableCell>
                    <TableCell>{formatCurrency(item.avg_unit_cost)}</TableCell>
                    <TableCell>{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total_value)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cards — solo en móvil */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No se encontraron productos</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((item) => (
            <Card key={item.product_id}>
              <CardContent className="pl-3">
                <div className="flex items-center gap-3">
                  {/* Imagen */}
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium truncate">{item.product_name}</p>
                      {getStockBadge(item.stock)}
                    </div>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                    )}
                  </div>
                </div>

                {/* Costos */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Costo prom.</p>
                    <p className="text-sm font-medium">{formatCurrency(item.avg_unit_cost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Precio venta</p>
                    <p className="text-sm font-medium">{formatCurrency(item.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor total</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(item.total_value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}