// app/(dashboard)/inventory/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Package, Warehouse, AlertTriangle, DollarSign,
  Plus, MoreVertical, Pencil, Trash2, PackagePlus,
  ShoppingCart, SlidersHorizontal,
} from "lucide-react";
import Image from "next/image";

import { useInventory } from "@/hooks/swr/use-inventory";
import { useProducts }  from "@/hooks/swr/use-products";
import { Fab }          from "@/components/ui/fab";
import { Product }      from "@/types";

import { CreateProductDialog }     from "@/components/products/create-product-dialog";
import { EditProductDialog }       from "@/components/products/edit-product-dialog";
import { DeleteProductDialog }     from "@/components/products/delete-product-dialog";
import { AddInventoryDialog }      from "@/components/products/add-inventory-dialog";
import { AdjustInventoryDialog }   from "@/components/products/adjust-inventory-dialog";
import { useCurrency } from "@/hooks/swr/use-currency";

// ── Helpers ────────────────────────────────────────────────────────────
const getStockBadge = (stock: number) => {
  if (stock === 0) return <Badge variant="destructive">Agotado</Badge>;
  if (stock < 5)   return <Badge variant="destructive">{stock} uds</Badge>;
  if (stock < 10)  return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{stock} uds</Badge>;
  return                  <Badge className="bg-green-100 text-green-700 border-green-200">{stock} uds</Badge>;
};

// ── Page ───────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const router = useRouter();
  const { inventory, stats, isLoading: loadingInventory, mutate: mutateInventory } = useInventory();
  const { products, mutate: mutateProducts } = useProducts();

  const [search,      setSearch]      = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  // Diálogos
  const [createOpen,       setCreateOpen]       = useState(false);
  const [editProduct,      setEditProduct]      = useState<Product | null>(null);
  const [deleteProduct,    setDeleteProduct]    = useState<Product | null>(null);
  const [inventoryProduct, setInventoryProduct] = useState<Product | null>(null);
  const [adjustProduct,    setAdjustProduct]    = useState<Product | null>(null);

  const { format }  = useCurrency();
  const isLoading = loadingInventory;

  const findProduct = (productId: number): Product | null =>
    products.find((p) => p.id === productId) ?? null;

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

  const handleSuccess = () => {
    mutateProducts();
    mutateInventory();
  };

  // ── Actions menu ────────────────────────────────────────────────────
  const ActionsMenu = ({ item }: { item: typeof inventory[0] }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            const p = findProduct(item.product_id);
            if (p) setInventoryProduct(p);
          }}
        >
          <PackagePlus className="h-4 w-4 mr-2 text-primary" />
          Agregar stock
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const p = findProduct(item.product_id);
            if (p) setAdjustProduct(p);
          }}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
          Ajuste de inventario
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            const p = findProduct(item.product_id);
            if (p) setEditProduct(p);
          }}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Editar producto
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => {
            const p = findProduct(item.product_id);
            if (p) setDeleteProduct(p);
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4 pb-24">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground text-sm">
          {isLoading
            ? "Cargando..."
            : `${stats.total_products} producto${stats.total_products !== 1 ? "s" : ""} · ${stats.total_stock} unidades`
          }
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { title: "Unidades",   value: stats.total_stock,                sub: `${stats.total_products} productos`, icon: Warehouse },
          { title: "Valor",      value: format(stats.total_value), sub: "costo adquisición",               icon: DollarSign },
          { title: "Stock bajo", value: stats.low_stock,                  sub: "menos de 10 uds",                  icon: AlertTriangle, cls: "text-yellow-600" },
          { title: "Agotados",   value: stats.out_of_stock,               sub: "sin stock",                        icon: Package,       cls: "text-destructive" },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pl-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
              {isLoading
                ? <Skeleton className="h-5 w-16" />
                : <div className={`text-lg font-bold md:text-xl ${stat.cls ?? ""}`}>{stat.value}</div>
              }
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
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
          <SelectTrigger className="w-full sm:w-48">
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

      {/* Tabla — desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Costo prom.</TableHead>
                <TableHead>Precio venta</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Agrega productos para visualizarlos aqui
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {item.image_url
                            ? <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
                            : <Package className="h-5 w-5 text-muted-foreground/40" />
                          }
                        </div>
                        <span className="font-medium">{item.product_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {item.sku ?? "—"}
                    </TableCell>
                    <TableCell>{getStockBadge(item.stock)}</TableCell>
                    <TableCell>{format(item.avg_unit_cost)}</TableCell>
                    <TableCell>{format(item.price)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {format(item.total_value)}
                    </TableCell>
                    <TableCell>
                      <ActionsMenu item={item} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cards — móvil */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
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
              <CardContent className="pl-3 pr-2">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {item.image_url
                      ? <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
                      : <Package className="h-6 w-6 text-muted-foreground/40" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{item.product_name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {getStockBadge(item.stock)}
                        <ActionsMenu item={item} />
                      </div>
                    </div>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Costo prom.</p>
                    <p className="text-sm font-medium">{format(item.avg_unit_cost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Precio venta</p>
                    <p className="text-sm font-medium">{format(item.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor total</p>
                    <p className="text-sm font-bold text-primary">{format(item.total_value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* FAB */}
      <Fab
        actions={[
          { label: "Nuevo producto", icon: Plus,         onClick: () => setCreateOpen(true) },
          { label: "Nueva venta",    icon: ShoppingCart, onClick: () => router.push("/sales/new") },
        ]}
      />

      {/* Diálogos */}
      <CreateProductDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleSuccess}
      />
      <EditProductDialog
        product={editProduct}
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
        onSuccess={handleSuccess}
      />
      <DeleteProductDialog
        product={deleteProduct}
        open={!!deleteProduct}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
        onSuccess={handleSuccess}
      />
      <AddInventoryDialog
        product={inventoryProduct}
        open={!!inventoryProduct}
        onOpenChange={(open) => !open && setInventoryProduct(null)}
        onSuccess={handleSuccess}
      />
      <AdjustInventoryDialog
        product={adjustProduct}
        open={!!adjustProduct}
        onOpenChange={(open) => !open && setAdjustProduct(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}