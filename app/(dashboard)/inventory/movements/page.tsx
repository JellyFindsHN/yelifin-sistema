// app/(dashboard)/inventory/movements/page.tsx
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
  ArrowDownCircle, ArrowUpCircle, Package,
  SlidersHorizontal, X, TrendingUp, TrendingDown, BoxIcon,
  Plus, ShoppingCart, PackagePlus,
} from "lucide-react";
import Image from "next/image";
import { useMovements, Movement } from "@/hooks/swr/use-movements";
import { useProducts }            from "@/hooks/swr/use-products";
import { useMovementPeriods }     from "@/hooks/swr/use-movements";
import { useCurrency }            from "@/hooks/swr/use-currency";
import { Fab }                    from "@/components/ui/fab";

// ── Helpers ────────────────────────────────────────────────────────────
const formatUSD = (value: number | null) => {
  if (value === null || value === undefined) return "—";
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

// ── Tipo badge ─────────────────────────────────────────────────────────
function TypeBadge({ m }: { m: Movement }) {
  if (m.reference_type === "ADJUSTMENT") {
    return m.movement_type === "IN" ? (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1" variant="outline">
        <TrendingUp className="h-3 w-3" /> Ajuste +
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-700 border-red-200 gap-1" variant="outline">
        <TrendingDown className="h-3 w-3" /> Ajuste −
      </Badge>
    );
  }
  if (m.reference_type === "INITIAL") {
    return (
      <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1" variant="outline">
        <BoxIcon className="h-3 w-3" /> Inicial
      </Badge>
    );
  }
  if (m.movement_type === "IN") {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1" variant="outline">
        <ArrowDownCircle className="h-3 w-3" /> Entrada
      </Badge>
    );
  }
  return (
    <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1" variant="outline">
      <ArrowUpCircle className="h-3 w-3" /> Salida
    </Badge>
  );
}

// ── Sub-components — reciben format para evitar hook en render ─────────
type FormatFn = (v: number | null) => string;

function MovementDetail({ m, format }: { m: Movement; format: FormatFn }) {
  if (m.reference_type === "ADJUSTMENT" || m.reference_type === "INITIAL") {
    return (
      <p className="text-xs text-muted-foreground italic">
        {m.notes ?? "Sin comentario"}
      </p>
    );
  }
  if (m.movement_type === "IN") {
    return (
      <div className="text-xs space-y-0.5">
        <p className="text-muted-foreground">
          USD: <span className="text-foreground font-medium">{formatUSD(m.unit_cost_usd)}</span>
        </p>
        <p className="text-muted-foreground">
          HNL: <span className="text-foreground font-medium">{format(m.unit_cost_hnl)}</span>
        </p>
        {Number(m.shipping_per_unit) > 0 && (
          <p className="text-muted-foreground">
            Envío/u: <span className="text-foreground font-medium">{format(m.shipping_per_unit)}</span>
          </p>
        )}
      </div>
    );
  }
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

function MovementTotal({ m, format }: { m: Movement; format: FormatFn }) {
  if (m.reference_type === "ADJUSTMENT" || m.reference_type === "INITIAL") {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  if (m.movement_type === "IN") return <span className="font-medium">{format(m.total_cost)}</span>;
  return <span className="font-medium">{format(m.line_total)}</span>;
}

function MovementProfit({ m, format }: { m: Movement; format: FormatFn }) {
  if (m.reference_type === "SALE") {
    return <span className="text-green-600 font-medium">{format(m.profit)}</span>;
  }
  return <span className="text-muted-foreground">—</span>;
}

function MobileDetail({ m, format }: { m: Movement; format: FormatFn }) {
  if (m.reference_type === "ADJUSTMENT" || m.reference_type === "INITIAL") {
    return (
      <div className="pt-3 border-t">
        <p className="text-xs text-muted-foreground italic">{m.notes ?? "Sin comentario"}</p>
      </div>
    );
  }
  if (m.movement_type === "IN") {
    return (
      <div className="grid grid-cols-3 gap-2 pt-3 border-t text-center text-xs">
        <div>
          <p className="text-muted-foreground">Costo USD</p>
          <p className="font-medium">{formatUSD(m.unit_cost_usd)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Costo HNL</p>
          <p className="font-medium">{format(m.unit_cost_hnl)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total</p>
          <p className="font-bold text-primary">{format(m.total_cost)}</p>
        </div>
        {Number(m.shipping_per_unit) > 0 && (
          <div className="col-span-3 pt-1.5 border-t text-left">
            <span className="text-muted-foreground">Envío/u: </span>
            <span className="font-medium">{format(m.shipping_per_unit)}</span>
          </div>
        )}
      </div>
    );
  }
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
          <p className="font-bold text-green-600">{format(m.profit)}</p>
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
  const router = useRouter();

  const [filterMode,    setFilterMode]    = useState<"month" | "date">("month");
  const [selectedYear,  setSelectedYear]  = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [specificDate,  setSpecificDate]  = useState("");
  const [productId,     setProductId]     = useState<number | undefined>();
  const [typeFilter,    setTypeFilter]    = useState("all");

  const { movements, isLoading } = useMovements({
    date:       filterMode === "date" ? specificDate || undefined : undefined,
    month:      filterMode === "month" ? selectedMonth : undefined,
    year:       filterMode === "month" ? selectedYear : undefined,
    product_id: productId,
  });

  const { products } = useProducts();
  const { periods }  = useMovementPeriods();
  const { format: formatCurrency } = useCurrency();

  // Wrapper para aceptar null igual que el helper original
  const format = (v: number | null | undefined): string => {
    if (v === null || v === undefined) return "—";
    return formatCurrency(Number(v));
  };

  const filtered = movements.filter((m) => {
    if (typeFilter === "all")        return true;
    if (typeFilter === "IN")         return m.movement_type === "IN";
    if (typeFilter === "OUT")        return m.movement_type === "OUT";
    if (typeFilter === "ADJUSTMENT") return m.reference_type === "ADJUSTMENT";
    if (typeFilter === "INITIAL")    return m.reference_type === "INITIAL";
    return true;
  });

  const availableYears = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a);

  const monthsForYear = (year: number) =>
    periods.filter((p) => p.year === year).map((p) => p.month).sort((a, b) => b - a);

  const hasFilters =
    productId !== undefined ||
    typeFilter !== "all" ||
    (filterMode === "date" && specificDate) ||
    (filterMode === "month" && (selectedYear !== currentYear || selectedMonth !== currentMonth));

  const clearAll = () => {
    setFilterMode("month");
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
    setSpecificDate("");
    setProductId(undefined);
    setTypeFilter("all");
  };

  const periodLabel =
    filterMode === "date" && specificDate
      ? formatDateOnly(specificDate)
      : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Movimientos</h1>
        <p className="text-muted-foreground text-sm">Entradas y salidas · {periodLabel}</p>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="grid grid-cols-2 rounded-lg border overflow-hidden">
            <button
              onClick={() => setFilterMode("month")}
              className={`py-2 text-xs font-medium transition-colors ${
                filterMode === "month"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Por mes
            </button>
            <button
              onClick={() => setFilterMode("date")}
              className={`py-2 text-xs font-medium transition-colors border-l ${
                filterMode === "date"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Fecha exacta
            </button>
          </div>

          {filterMode === "month" ? (
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(Number(v))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="w-full"
            />
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={productId?.toString() ?? "all"}
            onValueChange={(v) => setProductId(v === "all" ? undefined : Number(v))}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Todos los productos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los productos</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="IN">Entradas</SelectItem>
              <SelectItem value="OUT">Salidas</SelectItem>
              <SelectItem value="ADJUSTMENT">Ajustes</SelectItem>
              <SelectItem value="INITIAL">Inventario inicial</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-muted-foreground shrink-0"
              onClick={clearAll}
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Tabla — desktop */}
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
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No hay movimientos en este período
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                          {m.image_url
                            ? <Image src={m.image_url} alt={m.product_name} fill className="object-cover" />
                            : <Package className="h-4 w-4 text-muted-foreground/40" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-36">{m.product_name}</p>
                          {m.sku && <p className="text-xs text-muted-foreground font-mono">{m.sku}</p>}
                        </div>
                      </div>
                    </TableCell>
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

      {/* Cards — móvil */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <SlidersHorizontal className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No hay movimientos en este período</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((m) => (
            <Card key={m.id}>
              <CardContent className="pl-3.5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {m.image_url
                      ? <Image src={m.image_url} alt={m.product_name} fill className="object-cover" />
                      : <Package className="h-5 w-5 text-muted-foreground/40" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.product_name}</p>
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

      {/* FAB */}
      <Fab
        actions={[
          { label: "Nuevo producto",    icon: Plus,         onClick: () => router.push("/inventory") },
          { label: "Registrar venta",   icon: ShoppingCart, onClick: () => router.push("/sales/new") },
          { label: "Agregar stock",     icon: PackagePlus,  onClick: () => router.push("/inventory") },
        ]}
      />
    </div>
  );
}