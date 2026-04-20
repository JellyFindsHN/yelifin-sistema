// app/(dashboard)/inventory/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package, Warehouse, AlertTriangle, DollarSign,
  Plus, MoreVertical, Pencil, Trash2, PackagePlus,
  ShoppingCart, SlidersHorizontal, ArrowLeftRight,
  ChevronDown, Layers, Box, Clock,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { SearchBar } from "@/components/shared/search-bar"
import { cn } from "@/lib/utils";

import { useInventory, VariantStock } from "@/hooks/swr/use-inventory";
import { useProducts, useDeleteVariant } from "@/hooks/swr/use-products";
import { Fab } from "@/components/ui/fab";
import { Product, ProductVariant } from "@/types";

import { CreateProductDialog }        from "@/components/products/create-product-dialog";
import { CreateProductVariantDialog } from "@/components/products/create-product-variant-dialog";
import { EditProductDialog }          from "@/components/products/edit-product-dialog";
import { EditProductVariantDialog }   from "@/components/products/edit-product-variant-dialog";
import { DeleteProductDialog }        from "@/components/products/delete-product-dialog";
import { AddInventoryDialog }         from "@/components/products/add-inventory-dialog";
import { AdjustInventoryDialog }      from "@/components/products/adjust-inventory-dialog";
import { useCurrency }                from "@/hooks/swr/use-currency";
import { CreateTransactionModal }     from "@/components/transactions/create-transaction-modal";
import { useAccounts }                from "@/hooks/swr/use-accounts";
import { useCreditCards }             from "@/hooks/swr/use-credit-cards";
import { usePurchases }               from "@/hooks/swr/use-purchases";

// ── Helpers ────────────────────────────────────────────────────────────

const getStockBadge = (stock: number, is_service?: boolean) => {
  if (is_service) return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Servicio</Badge>;
  if (stock === 0) return <Badge variant="destructive">Agotado</Badge>;
  if (stock < 5)   return <Badge variant="destructive">{stock} uds</Badge>;
  if (stock < 10)  return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{stock} uds</Badge>;
  return <Badge className="bg-green-100 text-green-700 border-green-200">{stock} uds</Badge>;
};

// ── Page ───────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter();
  const { inventory, stats, isLoading: loadingInventory, mutate: mutateInventory } = useInventory();
  const { products, mutate: mutateProducts } = useProducts();
  const { deleteVariant, isDeleting: isDeletingVariant } = useDeleteVariant();

  const [search,      setSearch]      = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [expanded,    setExpanded]    = useState<Set<number>>(new Set());

  // Diálogos de producto
  const [createOpen,       setCreateOpen]       = useState(false);
  const [transactionOpen,  setTransactionOpen]  = useState(false);
  const [editProduct,      setEditProduct]      = useState<Product | null>(null);
  const [deleteProduct,    setDeleteProduct]    = useState<Product | null>(null);
  const [inventoryProduct, setInventoryProduct] = useState<Product | null>(null);
  const [adjustProduct,    setAdjustProduct]    = useState<Product | null>(null);

  // Diálogos de variante
  const [variantProduct,      setVariantProduct]      = useState<Product | null>(null);
  const [editVariant,         setEditVariant]         = useState<{ product: Product; variant: ProductVariant } | null>(null);
  const [deleteVariantTarget, setDeleteVariantTarget] = useState<{ product: Product; variant: ProductVariant } | null>(null);

  const { accounts, mutate: mutateAccounts } = useAccounts();
  const { creditCards } = useCreditCards();
  const { format }     = useCurrency();
  const { purchases, mutate: mutatePurchases } = usePurchases();

  const pendingPurchases = purchases.filter((p) => p.status === "PENDING");


  const findProduct = (productId: number): Product | null =>
    products.find((p) => p.id === productId) ?? null;

  const findVariant = (product: Product, variantId: number): ProductVariant | null =>
    product.variants.find((v) => v.id === variantId) ?? null;

  const toggleExpand = (productId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  };

  const filtered = inventory.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku?.toLowerCase().includes(search.toLowerCase()) ?? false);

    const stock = Number(item.stock);
    const matchesStock =
      stockFilter === "all"      ? true :
      stockFilter === "in_stock" ? stock > 0 || item.is_service :
      stockFilter === "out"      ? stock == 0 && !item.is_service :
      stockFilter === "low"      ? stock > 0 && stock < 10 :
      stockFilter === "ok"       ? stock >= 10 || item.is_service :
      stockFilter === "services" ? item.is_service :
      true;

    return matchesSearch && matchesStock;
  });

  console.log("InventoryPage render", { inventory, filtered, pendingPurchases });
  const handleSuccess = () => {
    mutateProducts();
    mutateInventory();
    mutatePurchases();
    mutateAccounts();
  };

  const handleDeleteVariant = async () => {
    if (!deleteVariantTarget) return;
    try {
      await deleteVariant(deleteVariantTarget.product.id, deleteVariantTarget.variant.id);
      toast.success("Variante eliminada");
      setDeleteVariantTarget(null);
      handleSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar variante");
    }
  };

  // ── Actions menus ────────────────────────────────────────────────

  const ProductActionsMenu = ({ item }: { item: typeof inventory[0] }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!item.is_service && (
          <>
            <DropdownMenuItem onClick={() => { const p = findProduct(item.product_id); if (p) setInventoryProduct(p); }}>
              <PackagePlus className="h-4 w-4 mr-2 text-primary" />
              Agregar stock
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const p = findProduct(item.product_id); if (p) setAdjustProduct(p); }}>
              <SlidersHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
              Ajuste de inventario
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const p = findProduct(item.product_id); if (p) setVariantProduct(p); }}>
              <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
              Agregar variante
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => { const p = findProduct(item.product_id); if (p) setEditProduct(p); }}>
          <Pencil className="h-4 w-4 mr-2" />
          {item.is_service ? "Editar servicio" : "Editar producto"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => { const p = findProduct(item.product_id); if (p) setDeleteProduct(p); }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const VariantActionsMenu = ({ product, variant }: { product: Product; variant: ProductVariant }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setEditVariant({ product, variant })}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar variante
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setDeleteVariantTarget({ product, variant })}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar variante
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ── Fila base (tabla desktop) ────────────────────────────────────

  const BaseTableRow = ({ item }: { item: typeof inventory[0] }) => (
    <TableRow className="bg-muted/20 hover:bg-muted/30">
      <TableCell>
        <div className="flex items-center gap-3 pl-10">
          <div className="relative h-8 w-8 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {item.image_url
              ? <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
              : <Box className="h-3.5 w-3.5 text-muted-foreground/40" />
            }
          </div>
          <div>
            <p className="text-sm font-medium">{item.product_name}</p>
            <p className="text-xs text-muted-foreground">Producto base</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {item.sku ?? "—"}
      </TableCell>
      <TableCell>{getStockBadge(Number(item.base_stock))}</TableCell>
      <TableCell className="text-sm">
        {Number(item.base_stock) > 0 ? format(item.base_avg_unit_cost) : "—"}
      </TableCell>
      <TableCell className="text-sm">{format(item.price)}</TableCell>
      <TableCell className="text-right text-sm font-medium">
        {Number(item.base_stock) > 0 ? format(item.base_total_value) : "—"}
      </TableCell>
      <TableCell />
    </TableRow>
  );

  // ── Fila variante (tabla desktop) ────────────────────────────────

  const VariantTableRow = ({
    variantStock, product,
  }: {
    variantStock: VariantStock;
    product:      Product;
  }) => {
    const pv = findVariant(product, variantStock.variant_id);

    return (
      <TableRow className="bg-muted/30 hover:bg-muted/50">
        <TableCell>
          <div className="flex items-center gap-3 pl-10">
            <div className="relative h-8 w-8 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {variantStock.image_url ?? product.image_url
                ? <Image
                    src={variantStock.image_url ?? product.image_url!}
                    alt={variantStock.variant_name}
                    fill
                    className="object-cover"
                  />
                : <Layers className="h-3.5 w-3.5 text-muted-foreground/40" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{variantStock.variant_name}</p>
              {variantStock.attributes && Object.keys(variantStock.attributes).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {Object.entries(variantStock.attributes).map(([k, v]) => (
                    <span key={k} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                      {k}: {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {variantStock.sku ?? "—"}
        </TableCell>
        <TableCell>{getStockBadge(Number(variantStock.stock))}</TableCell>
        <TableCell className="text-sm">
          {Number(variantStock.stock) > 0 ? format(variantStock.avg_unit_cost) : "—"}
        </TableCell>
        <TableCell className="text-sm">
          {variantStock.price_override != null
            ? format(variantStock.price_override)
            : <span className="text-xs text-muted-foreground">Base: {format(product.price)}</span>
          }
        </TableCell>
        <TableCell className="text-right text-sm font-medium">
          {Number(variantStock.stock) > 0 ? format(variantStock.total_value) : "—"}
        </TableCell>
        <TableCell>
          {pv && <VariantActionsMenu product={product} variant={pv} />}
        </TableCell>
      </TableRow>
    );
  };

  // ── Card base (móvil) ────────────────────────────────────────────

  const BaseCard = ({ item }: { item: typeof inventory[0] }) => (
    <div className="rounded-lg border bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="relative h-9 w-9 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
          {item.image_url
            ? <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
            : <Box className="h-3.5 w-3.5 text-muted-foreground/40" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{item.product_name}</p>
              <p className="text-xs text-muted-foreground">Producto base</p>
            </div>
            {getStockBadge(Number(item.base_stock))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-3 pb-2.5 text-center border-t">
        <div className="pt-2">
          <p className="text-xs text-muted-foreground">Costo prom.</p>
          <p className="text-sm font-medium">
            {Number(item.base_stock) > 0 ? format(item.base_avg_unit_cost) : "—"}
          </p>
        </div>
        <div className="pt-2">
          <p className="text-xs text-muted-foreground">Precio venta</p>
          <p className="text-sm font-medium">{format(item.price)}</p>
        </div>
        <div className="pt-2">
          <p className="text-xs text-muted-foreground">Valor total</p>
          <p className="text-sm font-bold text-primary">
            {Number(item.base_stock) > 0 ? format(item.base_total_value) : "—"}
          </p>
        </div>
      </div>
    </div>
  );

  // ── Card variante (móvil) ────────────────────────────────────────

  const VariantCard = ({
    variantStock, product,
  }: {
    variantStock: VariantStock;
    product:      Product;
  }) => {
    const pv = findVariant(product, variantStock.variant_id);
    const salePrice = variantStock.price_override != null
      ? variantStock.price_override
      : product.price;

    return (
      <div className="rounded-lg border bg-muted/30 overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="relative h-9 w-9 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {variantStock.image_url ?? product.image_url
              ? <Image
                  src={variantStock.image_url ?? product.image_url!}
                  alt={variantStock.variant_name}
                  fill
                  className="object-cover"
                />
              : <Layers className="h-3.5 w-3.5 text-muted-foreground/40" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{variantStock.variant_name}</p>
                {variantStock.attributes && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {Object.entries(variantStock.attributes).map(([k, v]) => (
                      <span key={k} className="text-xs bg-background text-muted-foreground px-1.5 py-0.5 rounded border">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {getStockBadge(Number(variantStock.stock))}
                {pv && <VariantActionsMenu product={product} variant={pv} />}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 px-3 pb-2.5 text-center border-t">
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">Costo prom.</p>
            <p className="text-sm font-medium">
              {Number(variantStock.stock) > 0 ? format(variantStock.avg_unit_cost) : "—"}
            </p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">Precio venta</p>
            <p className="text-sm font-medium">{format(salePrice)}</p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">Valor total</p>
            <p className="text-sm font-bold text-primary">
              {Number(variantStock.stock) > 0 ? format(variantStock.total_value) : "—"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-24">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground text-sm">
          {loadingInventory
            ? "Cargando..."
            : `${stats.total_products} producto${stats.total_products !== 1 ? "s" : ""} · ${stats.total_stock} unidades`
          }
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { title: "Unidades",   value: stats.total_stock,         sub: `${stats.total_products} productos`, icon: Warehouse },
          { title: "Valor",      value: format(stats.total_value), sub: "costo adquisición",                 icon: DollarSign },
          { title: "Stock bajo", value: stats.low_stock,           sub: "menos de 10 uds",                   icon: AlertTriangle, cls: "text-yellow-600" },
          { title: "Agotados",   value: stats.out_of_stock,        sub: "sin stock",                         icon: Package,       cls: "text-destructive" },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pl-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
              {loadingInventory
                ? <Skeleton className="h-5 w-16" />
                : <div className={`text-lg font-bold md:text-xl ${stat.cls ?? ""}`}>{stat.value}</div>
              }
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Banner compras pendientes ─────────────────────────────── */}
      {pendingPurchases.length > 0 && (
        <button
          type="button"
          onClick={() => router.push("/purchases/pending")}
          className="w-full flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/40 px-4 py-3 text-left hover:bg-amber-100/60 dark:hover:bg-amber-950/40 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300 truncate">
              {pendingPurchases.length} compra{pendingPurchases.length !== 1 ? "s" : ""} pendiente{pendingPurchases.length !== 1 ? "s" : ""} de llegada — inventario no acreditado
            </p>
          </div>
          <Badge className="shrink-0 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300">
            Ver →
          </Badge>
        </button>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <SearchBar value={search} onChange={setSearch} size="full" placeholder="Buscar por nombre o SKU..." />
        </div>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Estado de stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo el inventario</SelectItem>
            <SelectItem value="services">Servicios</SelectItem>
            <SelectItem value="ok">Stock suficiente</SelectItem>
            <SelectItem value="low">Stock bajo</SelectItem>
            <SelectItem value="out">Agotados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Tabla — desktop ──────────────────────────────────────── */}
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
              {loadingInventory ? (
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
                    Agrega productos para visualizarlos aquí
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const product     = findProduct(item.product_id);
                  const hasVariants = item.variants_stock.length > 0 && !item.is_service;
                  const isExpanded  = expanded.has(item.product_id);

                  return (
                    <>
                      {/* Fila del producto */}
                      <TableRow
                        key={item.product_id}
                        className={cn(
                          hasVariants && "cursor-pointer select-none",
                          isExpanded  && "bg-muted/20"
                        )}
                        onClick={() => hasVariants && toggleExpand(item.product_id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {hasVariants ? (
                              <ChevronDown className={cn(
                                "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
                                isExpanded && "rotate-180"
                              )} />
                            ) : (
                              <div className="w-3.5 shrink-0" />
                            )}
                            <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                              {item.image_url
                                ? <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
                                : <Package className="h-5 w-5 text-muted-foreground/40" />
                              }
                            </div>
                            <div>
                              <span className="font-medium">{item.product_name}</span>
                              {hasVariants && (
                                <p className="text-xs text-muted-foreground">
                                  {item.variants_stock.length} variante{item.variants_stock.length !== 1 ? "s" : ""}
                                  {" · "}{item.stock} uds total
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {item.sku ?? "—"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {getStockBadge(Number(item.stock), item.is_service)}
                        </TableCell>
                        <TableCell>{item.is_service ? "—" : format(item.avg_unit_cost)}</TableCell>
                        <TableCell>{format(item.price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {item.is_service ? format(item.price) : format(item.total_value)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <ProductActionsMenu item={item} />
                        </TableCell>
                      </TableRow>

                      {/* Acordeón: base + variantes */}
                      {hasVariants && isExpanded && product && (
                        <>
                          <BaseTableRow item={item} />
                          {item.variants_stock.map((vs) => (
                            <VariantTableRow
                              key={`vs-${vs.variant_id}`}
                              variantStock={vs}
                              product={product}
                            />
                          ))}
                        </>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Cards — móvil ────────────────────────────────────────── */}
      <div className="space-y-3 md:hidden">
        {loadingInventory ? (
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
          filtered.map((item) => {
            const product     = findProduct(item.product_id);
            const hasVariants = item.variants_stock.length > 0 && !item.is_service;
            const isExpanded  = expanded.has(item.product_id);

            return (
              <Card key={item.product_id}>
                <CardContent className="pl-3 pr-2">
                  {/* Cabecera del producto */}
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      {item.image_url
                        ? <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
                        : <Package className="h-6 w-6 text-muted-foreground/40" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.product_name}</p>
                          {hasVariants && (
                            <p className="text-xs text-muted-foreground">
                              {item.variants_stock.length} variante{item.variants_stock.length !== 1 ? "s" : ""}
                              {" · "}{item.stock} uds total
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {getStockBadge(Number(item.stock), item.is_service)}
                          <ProductActionsMenu item={item} />
                        </div>
                      </div>
                      {item.sku && (
                        <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                      )}
                    </div>
                  </div>

                  {/* Resumen general del producto */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Costo prom.</p>
                      <p className="text-sm font-medium">{item.is_service ? "—" : format(item.avg_unit_cost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Precio venta</p>
                      <p className="text-sm font-medium">{format(item.price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor total</p>
                      <p className="text-sm font-bold text-primary">
                        {item.is_service ? format(item.price) : format(item.total_value)}
                      </p>
                    </div>
                  </div>

                  {/* Acordeón de variantes */}
                  {hasVariants && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.product_id)}
                        className="w-full flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="font-medium">
                          Ver desglose — base + {item.variants_stock.length} variante{item.variants_stock.length !== 1 ? "s" : ""}
                        </span>
                        <ChevronDown className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )} />
                      </button>

                      {isExpanded && product && (
                        <div className="mt-2 space-y-2">
                          <BaseCard item={item} />
                          {item.variants_stock.map((vs) => (
                            <VariantCard
                              key={vs.variant_id}
                              variantStock={vs}
                              product={product}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* FAB */}
      <Fab
        actions={[
          { label: "Nueva transacción", icon: ArrowLeftRight, onClick: () => setTransactionOpen(true) },
          { label: "Nueva venta",       icon: ShoppingCart,   onClick: () => router.push("/sales/new") },
          { label: "Nuevo producto",    icon: Plus,           onClick: () => setCreateOpen(true) },
        ]}
      />

      {/* ── Diálogos de producto ──────────────────────────────────── */}
      <CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={handleSuccess} />
      <EditProductDialog
        product={editProduct}
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
        onSuccess={handleSuccess}
        is_service={editProduct?.is_service ?? false}
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

      {/* ── Diálogos de variante ─────────────────────────────────── */}
      <CreateProductVariantDialog
        open={!!variantProduct}
        onOpenChange={(open) => !open && setVariantProduct(null)}
        productId={variantProduct?.id ?? 0}
        productName={variantProduct?.name ?? ""}
        basePrice={variantProduct?.price ?? 0}
        onSuccess={handleSuccess}
      />
      <EditProductVariantDialog
        open={!!editVariant}
        onOpenChange={(open) => !open && setEditVariant(null)}
        productId={editVariant?.product.id ?? 0}
        productName={editVariant?.product.name ?? ""}
        basePrice={editVariant?.product.price ?? 0}
        variant={editVariant?.variant ?? null}
        onSuccess={handleSuccess}
      />

      {/* Confirmar eliminación de variante */}
      <AlertDialog open={!!deleteVariantTarget} onOpenChange={(open) => !open && setDeleteVariantTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar variante?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará{" "}
              <span className="font-medium text-foreground">"{deleteVariantTarget?.variant.variant_name}"</span>
              {" "}de{" "}
              <span className="font-medium text-foreground">{deleteVariantTarget?.product.name}</span>.
              {" "}Si tiene historial, solo se desactivará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingVariant}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVariant}
              disabled={isDeletingVariant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingVariant ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateTransactionModal
        open={transactionOpen}
        onOpenChange={setTransactionOpen}
        accounts={accounts}
        creditCards={creditCards}
        onSuccess={() => setTransactionOpen(false)}
      />
    </div>
  );
}