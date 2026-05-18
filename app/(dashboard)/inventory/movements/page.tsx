// app/(dashboard)/inventory/movements/page.tsx
"use client";

import { useState, useEffect } from "react";
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
  ArrowDownCircle, ArrowUpCircle, Package, Layers,
  SlidersHorizontal, X, TrendingUp, TrendingDown, BoxIcon,
  Plus, ShoppingCart, PackagePlus, RotateCcw, FilePen,
} from "lucide-react";
import { useMovements, Movement } from "@/hooks/swr/use-movements";
import { useProducts } from "@/hooks/swr/use-products";
import { useMovementPeriods } from "@/hooks/swr/use-movements";
import { useCurrency } from "@/hooks/swr/use-currency";
import { Fab } from "@/components/ui/fab";
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import { SearchBar } from "@/components/shared/search-bar";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { useDebounce } from "@/hooks/use-debounce";

// ── Helpers ────────────────────────────────────────────────────────────

const formatUSD = (value: number | null | undefined) => {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(Number(value));
};

const formatDateOnly = (dateString: string) =>
  new Date(dateString).toLocaleDateString("es-HN", {
    day: "numeric", month: "short", year: "numeric",
  });

const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

type FormatFn = (v: number | null | undefined) => string;

// ── TypeBadge ──────────────────────────────────────────────────────────

function TypeBadge({ m }: { m: Movement }) {
  if (m.reference_type === "ADJUSTMENT") {
    return m.movement_type === "IN" ? (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1" variant="outline">
        <TrendingUp className="size-3" /> Ajuste +
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-700 border-red-200 gap-1" variant="outline">
        <TrendingDown className="size-3" /> Ajuste −
      </Badge>
    );
  }
  if (m.reference_type === "INITIAL") {
    return (
      <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1" variant="outline">
        <BoxIcon className="size-3" /> Inicial
      </Badge>
    );
  }
  if (m.reference_type === "SALE_CANCELLED") {
    return (
      <Badge className="bg-gray-100 text-gray-600 border-gray-200 gap-1" variant="outline">
        <RotateCcw className="size-3" /> Cancelación
      </Badge>
    );
  }
  if (m.reference_type === "SALE_EDITED") {
    return m.movement_type === "OUT" ? (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1" variant="outline">
        <FilePen className="size-3" /> Edición +
      </Badge>
    ) : (
      <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1" variant="outline">
        <FilePen className="size-3" /> Edición −
      </Badge>
    );
  }
  if (m.movement_type === "IN") {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1" variant="outline">
        <ArrowDownCircle className="size-3" /> Entrada
      </Badge>
    );
  }
  return (
    <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1" variant="outline">
      <ArrowUpCircle className="size-3" /> Salida
    </Badge>
  );
}

// ── ProductCell — producto + variante ──────────────────────────────────

function ProductCell({ m }: { m: Movement }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative size-8 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {m.image_url ? (
          <img
            src={m.image_url}
            alt={m.product_name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <Package className="size-4 text-muted-foreground/40" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate max-w-36">{m.product_name}</p>
        {/* Variante */}
        {m.variant_name && (
          <div className="flex items-center gap-1 mt-0.5">
            <Layers className="size-2.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{m.variant_name}</span>
          </div>
        )}
        {/* SKU — muestra variant_sku si existe, si no el del producto */}
        {(m.variant_sku ?? m.sku) && (
          <p className="text-xs text-muted-foreground font-mono">
            {m.variant_sku ?? m.sku}
          </p>
        )}
      </div>
    </div>
  );
}

// ── MovementDetail (tabla desktop) ────────────────────────────────────

function MovementDetail({ m, format }: { m: Movement; format: FormatFn }) {
  if (m.reference_type === "ADJUSTMENT" || m.reference_type === "INITIAL") {
    return (
      <p className="text-xs text-muted-foreground italic">
        {m.notes ?? "Sin comentario"}
      </p>
    );
  }
  if (m.reference_type === "SALE_CANCELLED" || m.reference_type === "SALE_EDITED") {
    return (
      <p className="text-xs text-muted-foreground italic">
        {m.sale_number ?? m.notes ?? "—"}
      </p>
    );
  }
  if (m.movement_type === "IN") {
    const isUSD = m.purchase_currency === "USD";
    return (
      <div className="text-xs space-y-0.5">
        {/* Solo mostrar USD si la compra fue en dólares */}
        {isUSD && (
          <p className="text-muted-foreground">
            USD: <span className="text-foreground font-medium">{formatUSD(m.unit_cost_usd)}</span>
            {m.exchange_rate && (
              <span className="text-muted-foreground ml-1">@ {m.exchange_rate}</span>
            )}
          </p>
        )}
        <p className="text-muted-foreground">
          {isUSD ? "HNL" : (m.purchase_currency ?? "Local")}:{" "}
          <span className="text-foreground font-medium">
            {isUSD ? format(m.unit_cost_hnl) : format(m.unit_cost_purchase)}
          </span>
        </p>
        {Number(m.shipping_per_unit) > 0 && (
          <p className="text-muted-foreground">
            Envío/u: <span className="text-foreground font-medium">{format(m.shipping_per_unit)}</span>
          </p>
        )}
      </div>
    );
  }
  // OUT — venta
  return (
    <div className="text-xs space-y-0.5">
      <p className="text-muted-foreground">
        Precio: <span className="text-foreground font-medium">{format(m.unit_price)}</span>
      </p>
      <p className="text-muted-foreground">
        Costo: <span className="text-foreground font-medium">{format(m.unit_cost)}</span>
      </p>
      {m.customer_name && (
        <p className="text-muted-foreground">
          Cliente: <span className="text-foreground font-medium">{m.customer_name}</span>
        </p>
      )}
      {m.sale_number && (
        <p className="text-muted-foreground font-mono">{m.sale_number}</p>
      )}
    </div>
  );
}

// ── MovementTotal / MovementProfit ─────────────────────────────────────

function MovementTotal({ m, format }: { m: Movement; format: FormatFn }) {
  if (
    m.reference_type === "ADJUSTMENT" ||
    m.reference_type === "INITIAL"    ||
    m.reference_type === "SALE_CANCELLED" ||
    m.reference_type === "SALE_EDITED"
  ) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  if (m.movement_type === "IN")  return <span className="font-medium">{format(m.total_cost)}</span>;
  return <span className="font-medium">{format(m.line_total)}</span>;
}

function MovementProfit({ m, format }: { m: Movement; format: FormatFn }) {
  if (m.reference_type === "SALE") {
    const profit = Number(m.profit);
    return (
      <span className={profit >= 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
        {format(m.profit)}
      </span>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

// ── MobileDetail ───────────────────────────────────────────────────────

function MobileDetail({ m, format }: { m: Movement; format: FormatFn }) {
  if (m.reference_type === "ADJUSTMENT" || m.reference_type === "INITIAL") {
    return (
      <div className="pt-3 border-t">
        <p className="text-xs text-muted-foreground italic">{m.notes ?? "Sin comentario"}</p>
      </div>
    );
  }
  if (m.reference_type === "SALE_CANCELLED" || m.reference_type === "SALE_EDITED") {
    return (
      <div className="pt-3 border-t">
        <p className="text-xs text-muted-foreground italic">{m.sale_number ?? m.notes ?? "—"}</p>
      </div>
    );
  }
  if (m.movement_type === "IN") {
    const isUSD = m.purchase_currency === "USD";
    return (
      <div className="pt-3 border-t">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {isUSD ? (
            <>
              <div>
                <p className="text-muted-foreground">Costo USD</p>
                <p className="font-medium">{formatUSD(m.unit_cost_usd)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Costo HNL</p>
                <p className="font-medium">{format(m.unit_cost_hnl)}</p>
              </div>
            </>
          ) : (
            <div className="col-span-2">
              <p className="text-muted-foreground">Costo ({m.purchase_currency ?? "Local"})</p>
              <p className="font-medium">{format(m.unit_cost_purchase)}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-bold text-primary">{format(m.total_cost)}</p>
          </div>
        </div>
        {Number(m.shipping_per_unit) > 0 && (
          <div className="col-span-3 pt-1.5 border-t text-xs mt-1.5">
            <span className="text-muted-foreground">Envío/u: </span>
            <span className="font-medium">{format(m.shipping_per_unit)}</span>
          </div>
        )}
      </div>
    );
  }
  // OUT — venta
  return (
    <div className="pt-3 border-t space-y-2">
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="text-muted-foreground">Precio</p>
          <p className="font-medium">{format(m.unit_price)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total</p>
          <p className="font-bold">{format(m.line_total)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Ganancia</p>
          <p className={`font-bold ${Number(m.profit) >= 0 ? "text-green-600" : "text-destructive"}`}>
            {format(m.profit)}
          </p>
        </div>
      </div>
      {(m.customer_name || m.sale_number) && (
        <div className="flex justify-between text-xs pt-1.5 border-t text-muted-foreground">
          {m.customer_name && (
            <span>Cliente: <span className="text-foreground">{m.customer_name}</span></span>
          )}
          {m.sale_number && <span className="font-mono">{m.sale_number}</span>}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function MovementsPage() {
  const now    = new Date();
  const { push } = useRouter();

  const [search,        setSearch]        = useState("");
  const [filterMode,    setFilterMode]    = useState<"month" | "date">("month");
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [specificDate,  setSpecificDate]  = useState("");
  const [productId,     setProductId]     = useState<number | undefined>();
  const [typeFilter,    setTypeFilter]    = useState("all");
  const [page,          setPage]          = useState(1);
  const pageLimit       = 10;

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { setPage(1); }, [
    debouncedSearch, typeFilter, productId,
    filterMode, selectedMonth, selectedYear, specificDate,
  ]);

  const { movements, isLoading, total, totalPages } = useMovements({
    date:       filterMode === "date"  ? specificDate || undefined : undefined,
    month:      filterMode === "month" ? selectedMonth             : undefined,
    year:       filterMode === "month" ? selectedYear              : undefined,
    product_id: productId,
    search:     debouncedSearch || undefined,
    type:       typeFilter !== "all" ? typeFilter : undefined,
    page,
    limit:      pageLimit,
  });

  const { products }              = useProducts();
  const { periods }               = useMovementPeriods();
  const { format: formatCurrency } = useCurrency();

  const format = (v: number | null | undefined): string => {
    if (v == null) return "—";
    return formatCurrency(Number(v));
  };

  const availableYears     = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a);
  const monthsForYear      = (year: number) =>
    periods.filter((p) => p.year === year).map((p) => p.month).sort((a, b) => b - a);

  const hasFilters =
    search ||
    productId !== undefined ||
    typeFilter !== "all" ||
    (filterMode === "date"  && specificDate) ||
    (filterMode === "month" && (selectedYear !== currentYear || selectedMonth !== currentMonth));

  const clearAll = () => {
    setSearch("");
    setFilterMode("month");
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
    setSpecificDate("");
    setProductId(undefined);
    setTypeFilter("all");
    setPage(1);
  };

  const periodLabel =
    filterMode === "date" && specificDate
      ? formatDateOnly(specificDate)
      : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
        <p className="text-muted-foreground text-sm">Entradas y salidas · {periodLabel}</p>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBar
            value={search}
            onChange={setSearch}
            size="full"
            placeholder="Buscar producto, variante, SKU, cliente..."
          />
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as "month" | "date")}>
            <SelectTrigger className="hidden sm:flex w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Por mes</SelectItem>
              <SelectItem value="date">Fecha exacta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle modo — móvil */}
        <div className="grid grid-cols-2 rounded-lg border overflow-hidden sm:hidden">
          {(["month", "date"] as const).map((mode, i) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`py-2 text-xs font-medium transition-colors ${i > 0 ? "border-l" : ""} ${
                filterMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {mode === "month" ? "Por mes" : "Fecha exacta"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {filterMode === "month" ? (
            <>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthsForYear(selectedYear).map((m) => (
                    <SelectItem key={m} value={String(m)}>{MONTH_NAMES[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => {
                  const y = Number(v);
                  setSelectedYear(y);
                  const months = periods.filter((p) => p.year === y).map((p) => p.month);
                  if (months.length && !months.includes(selectedMonth)) setSelectedMonth(months[0]);
                }}
              >
                <SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <Input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="w-full sm:w-44"
            />
          )}

          <SearchableSelect
            value={productId?.toString() ?? "all"}
            onValueChange={(v) => setProductId(v === "all" ? undefined : Number(v))}
            items={products.map((p) => ({ value: p.id.toString(), label: p.name }))}
            defaultOption={{ value: "all", label: "Todos los productos" }}
            className="w-full sm:w-64"
          />

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="IN">Entradas (compras)</SelectItem>
              <SelectItem value="OUT">Salidas (ventas)</SelectItem>
              <SelectItem value="ADJUSTMENT">Ajustes</SelectItem>
              <SelectItem value="INITIAL">Inventario inicial</SelectItem>
              <SelectItem value="CANCELLED">Cancelaciones</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-muted-foreground shrink-0"
              onClick={clearAll}
            >
              <X className="size-3.5" /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabla — desktop ──────────────────────────────────────── */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cant.</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ganancia</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                /* skeleton - index key ok */
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No hay movimientos en este período
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell><ProductCell m={m} /></TableCell>
                    <TableCell><TypeBadge m={m} /></TableCell>
                    <TableCell className="font-medium">{m.quantity}</TableCell>
                    <TableCell><MovementDetail m={m} format={format} /></TableCell>
                    <TableCell className="text-right"><MovementTotal m={m} format={format} /></TableCell>
                    <TableCell className="text-right"><MovementProfit m={m} format={format} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatDateOnly(m.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Cards — móvil ────────────────────────────────────────── */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          /* skeleton - index key ok */
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : movements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <SlidersHorizontal className="size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No hay movimientos</p>
            </CardContent>
          </Card>
        ) : (
          movements.map((m) => (
            <Card key={m.id}>
              <CardContent className="pl-3.5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative size-10 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {m.image_url ? (
                      <img
                        src={m.image_url}
                        alt={m.product_name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <Package className="size-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.product_name}</p>
                    {m.variant_name && (
                      <div className="flex items-center gap-1">
                        <Layers className="size-2.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{m.variant_name}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDateOnly(m.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <TypeBadge m={m} />
                    <span className="text-xs text-muted-foreground">{m.quantity} uds</span>
                  </div>
                </div>
                <MobileDetail m={m} format={format} />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            {total} movimiento{total !== 1 ? "s" : ""} · página {page} de {totalPages}
          </p>
          <Pagination className="order-1 sm:order-2 w-auto mx-0 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-disabled={page === 1}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) =>
                  p === 1 || p === totalPages ||
                  (p >= page - 1 && p <= page + 1)
                )
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => setPage(p as number)}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-disabled={page === totalPages}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* FAB */}
      <Fab
        actions={[
          { label: "Nuevo producto",  icon: Plus,        onClick: () => push("/inventory") },
          { label: "Registrar venta", icon: ShoppingCart, onClick: () => push("/sales/new") },
          { label: "Agregar stock",   icon: PackagePlus,  onClick: () => push("/inventory") },
        ]}
      />
    </div>
  );
}