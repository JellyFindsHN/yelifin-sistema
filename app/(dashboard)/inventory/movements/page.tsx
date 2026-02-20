// app/(dashboard)/inventory/movements/page.tsx
"use client";

import { useState } from "react";
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
  ArrowDownCircle, ArrowUpCircle, Package, SlidersHorizontal, X,
} from "lucide-react";
import Image from "next/image";
import { useMovements } from "@/hooks/swr/use-movements";
import { useProducts } from "@/hooks/swr/use-products";

// ── Helpers ────────────────────────────────────────────────────────────
const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-HN", {
    style: "currency", currency: "HNL", minimumFractionDigits: 2,
  }).format(Number(value));
};

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
const YEARS = Array.from({ length: 4 }, (_, i) => currentYear - i);

// ── Componente ─────────────────────────────────────────────────────────
export default function MovementsPage() {
  const now = new Date();

  // Filtros — default: mes actual
  const [filterMode, setFilterMode]     = useState<"month" | "date">("month");
  const [selectedYear,  setSelectedYear]  = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [specificDate,  setSpecificDate]  = useState("");
  const [productId,     setProductId]     = useState<number | undefined>();
  const [typeFilter,    setTypeFilter]    = useState("all");

  const { movements, isLoading } = useMovements({
    date:       filterMode === "date"  ? specificDate || undefined : undefined,
    month:      filterMode === "month" ? selectedMonth : undefined,
    year:       filterMode === "month" ? selectedYear  : undefined,
    product_id: productId,
  });

  const { products } = useProducts();

  const filtered = movements.filter((m) =>
    typeFilter === "all" ? true : m.movement_type === typeFilter
  );

  const hasFilters = productId !== undefined || typeFilter !== "all" ||
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

  const periodLabel = filterMode === "date" && specificDate
    ? formatDateOnly(specificDate)
    : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Movimientos</h1>
        <p className="text-muted-foreground text-sm">Entradas y salidas · {periodLabel}</p>
      </div>

      {/* ── Filtros ── */}
      <div className="space-y-3">

        {/* Fila 1: modo + período */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

          {/* Toggle modo */}
          <div className="flex rounded-lg border overflow-hidden shrink-0">
            <button
              onClick={() => setFilterMode("month")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filterMode === "month"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Por mes
            </button>
            <button
              onClick={() => setFilterMode("date")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filterMode === "date"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Fecha exacta
            </button>
          </div>

          {/* Selectores de período */}
          {filterMode === "month" ? (
            <div className="flex gap-2 flex-1">
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(Number(v))}
              >
                <SelectTrigger className="flex-1 sm:w-40 sm:flex-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.slice(1).map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
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
              className="flex-1 sm:w-44 sm:flex-none"
            />
          )}
        </div>

        {/* Fila 2: producto + tipo + limpiar */}
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
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Entradas y salidas</SelectItem>
              <SelectItem value="IN">Solo entradas</SelectItem>
              <SelectItem value="OUT">Solo salidas</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground shrink-0" onClick={clearAll}>
              <X className="h-3.5 w-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabla — desktop ── */}
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

                    <TableCell>
                      {m.movement_type === "IN" ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1" variant="outline">
                          <ArrowDownCircle className="h-3 w-3" /> Entrada
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1" variant="outline">
                          <ArrowUpCircle className="h-3 w-3" /> Salida
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="font-medium">{m.quantity}</TableCell>

                    <TableCell>
                      {m.movement_type === "IN" ? (
                        <div className="text-xs space-y-0.5">
                          <p className="text-muted-foreground">USD: <span className="text-foreground font-medium">{formatUSD(m.unit_cost_usd)}</span></p>
                          <p className="text-muted-foreground">HNL: <span className="text-foreground font-medium">{formatCurrency(m.unit_cost_hnl)}</span></p>
                          {Number(m.shipping_per_unit) > 0 && (
                            <p className="text-muted-foreground">Envío/u: <span className="text-foreground font-medium">{formatCurrency(m.shipping_per_unit)}</span></p>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs space-y-0.5">
                          <p className="text-muted-foreground">Precio: <span className="text-foreground font-medium">{formatCurrency(m.unit_price)}</span></p>
                          <p className="text-muted-foreground">Costo: <span className="text-foreground font-medium">{formatCurrency(m.unit_cost)}</span></p>
                          {m.customer_name && <p className="text-muted-foreground">Cliente: <span className="text-foreground font-medium">{m.customer_name}</span></p>}
                          {m.sale_number && <p className="text-muted-foreground font-mono">{m.sale_number}</p>}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-medium">
                      {m.movement_type === "IN" ? formatCurrency(m.total_cost) : formatCurrency(m.line_total)}
                    </TableCell>

                    <TableCell className="text-right">
                      {m.movement_type === "OUT"
                        ? <span className="text-green-600 font-medium">{formatCurrency(m.profit)}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>

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

      {/* ── Cards — móvil ── */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
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
              <CardContent className="p-4">
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
                    {m.movement_type === "IN" ? (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1" variant="outline">
                        <ArrowDownCircle className="h-3 w-3" /> Entrada
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1" variant="outline">
                        <ArrowUpCircle className="h-3 w-3" /> Salida
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{m.quantity} uds</span>
                  </div>
                </div>

                {m.movement_type === "IN" ? (
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Costo USD</p>
                      <p className="font-medium">{formatUSD(m.unit_cost_usd)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costo HNL</p>
                      <p className="font-medium">{formatCurrency(m.unit_cost_hnl)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-bold text-primary">{formatCurrency(m.total_cost)}</p>
                    </div>
                    {Number(m.shipping_per_unit) > 0 && (
                      <div className="col-span-3 pt-1.5 border-t text-left">
                        <span className="text-muted-foreground">Envío/u: </span>
                        <span className="font-medium">{formatCurrency(m.shipping_per_unit)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-3 border-t space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-muted-foreground">Precio</p>
                        <p className="font-medium">{formatCurrency(m.unit_price)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-bold">{formatCurrency(m.line_total)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ganancia</p>
                        <p className="font-bold text-green-600">{formatCurrency(m.profit)}</p>
                      </div>
                    </div>
                    {(m.customer_name || m.sale_number) && (
                      <div className="flex justify-between text-xs pt-1.5 border-t text-muted-foreground">
                        {m.customer_name && <span>Cliente: <span className="text-foreground">{m.customer_name}</span></span>}
                        {m.sale_number && <span className="font-mono">{m.sale_number}</span>}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}