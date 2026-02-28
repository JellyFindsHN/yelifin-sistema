// app/(dashboard)/sales/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useCurrency } from "@/hooks/swr/use-currency";
import { useRouter } from "next/navigation";

import { Fab } from "@/components/ui/fab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Receipt, Banknote, CreditCard, ArrowLeftRight,
  TrendingUp, DollarSign, ShoppingCart, HelpCircle, X,
} from "lucide-react";

import { useSales } from "@/hooks/swr/use-sales";
import { useAccounts } from "@/hooks/swr/use-accounts";

// ── Utils ──────────────────────────────────────────────────────────────
const formatDateOnly = (dateString: string) =>
  new Date(dateString).toLocaleDateString("es-HN", {
    year: "numeric", month: "short", day: "numeric",
  });

type Preset      = "today" | "7d" | "this_month" | "last_month" | "all";
type PaymentFilter = "all" | "CASH" | "CARD" | "TRANSFER" | "MIXED" | "OTHER";

const paymentConfig: Record<string, { label: string; icon: any }> = {
  CASH:     { label: "Efectivo",       icon: Banknote },
  CARD:     { label: "Tarjeta",        icon: CreditCard },
  TRANSFER: { label: "Transferencia",  icon: ArrowLeftRight },
  MIXED:    { label: "Mixto",          icon: HelpCircle },
  OTHER:    { label: "Otro",           icon: HelpCircle },
};

const PRESET_LABELS: Record<Preset, string> = {
  today:      "Hoy",
  "7d":       "Últimos 7 días",
  this_month: "Este mes",
  last_month: "Mes pasado",
  all:        "Todas",
};

export default function SalesPage() {
  const router = useRouter();
  const { format } = useCurrency();

  const [preset,        setPreset]        = useState<Preset>("this_month");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [search,        setSearch]        = useState("");

  const { sales, isLoading } = useSales({
    preset,
    from:    dateFrom || undefined,
    to:      dateTo   || undefined,
    payment: paymentFilter,
  });

  const { accounts } = useAccounts();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      const matchSearch  = !q || s.sale_number.toLowerCase().includes(q) || (s.customer_name?.toLowerCase().includes(q) ?? false);
      const matchAccount = accountFilter === "all" || String(s.account_id) === accountFilter;
      return matchSearch && matchAccount;
    });
  }, [sales, search, accountFilter]);

  const totalRevenue = useMemo(() => filtered.reduce((acc, s) => acc + Number(s.total),      0), [filtered]);
  const totalProfit  = useMemo(() => filtered.reduce((acc, s) => acc + Number(s.net_profit), 0), [filtered]);

  const hasFilters = dateFrom || dateTo || paymentFilter !== "all" || accountFilter !== "all" || search;

  const clearAll = () => {
    setDateFrom(""); setDateTo(""); setSearch("");
    setPaymentFilter("all"); setAccountFilter("all"); setPreset("this_month");
  };

  const onChangePreset  = (v: Preset)  => { setPreset(v); setDateFrom(""); setDateTo(""); };
  const onManualFrom    = (v: string)  => { setDateFrom(v); setPreset("all"); };
  const onManualTo      = (v: string)  => { setDateTo(v);   setPreset("all"); };

  const activePeriodLabel = dateFrom || dateTo
    ? [dateFrom && `Desde ${formatDateOnly(dateFrom)}`, dateTo && `Hasta ${formatDateOnly(dateTo)}`]
        .filter(Boolean).join(" · ")
    : PRESET_LABELS[preset];

  return (
    <div className="space-y-4 pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground text-sm">{activePeriodLabel}</p>
        </div>
        {/* Total de ventas junto al título — solo móvil */}
        <div className="text-right shrink-0 sm:hidden">
          {isLoading
            ? <Skeleton className="h-8 w-10 ml-auto" />
            : <p className="text-3xl font-bold">{filtered.length}</p>
          }
          <p className="text-xs text-muted-foreground">registros</p>
        </div>
      </div>

      {/* ── Stats — móvil: 2 cards / desktop: 3 cards ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {/* Ventas — solo visible en desktop (en móvil va en el header) */}
        <Card className="hidden sm:block pt-1 pb-1">
          <CardContent className="pl-3.5 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Ventas</span>
              <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
            {isLoading
              ? <Skeleton className="h-6 w-12" />
              : <p className="text-lg font-bold">{filtered.length}</p>
            }
          </CardContent>
        </Card>
        <Card className="pt-2 pb-2">
          <CardContent className="pl-3.5 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Ingresos</span>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
            {isLoading
              ? <Skeleton className="h-6 w-20" />
              : <p className="text-base font-bold sm:text-lg truncate">{format(totalRevenue)}</p>
            }
          </CardContent>
        </Card>
        <Card className="pt-2 pb-2">
          <CardContent className="pl-3.5 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Ganancia</span>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
            {isLoading
              ? <Skeleton className="h-6 w-20" />
              : (
                <div className="flex items-baseline gap-1.5">
                  <p className="text-base font-bold text-green-600 sm:text-lg truncate">{format(totalProfit)}</p>
                  {totalRevenue > 0 && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {((totalProfit / totalRevenue) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              )
            }
          </CardContent>
        </Card>
      </div>

      {/* ── Filtros ── */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Número o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={preset} onValueChange={(v) => onChangePreset(v as Preset)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="this_month">Este mes</SelectItem>
              <SelectItem value="last_month">Mes pasado</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger><SelectValue placeholder="Cuenta" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las cuentas</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => onManualFrom(e.target.value)} className="text-sm" />
          <Input type="date" value={dateTo}   onChange={(e) => onManualTo(e.target.value)}   className="text-sm" />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground w-full" onClick={clearAll}>
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* ── Cards móvil ── */}
      <div className="space-y-2 lg:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No se encontraron ventas</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((sale) => {
            const payment = paymentConfig[sale.payment_method] ?? paymentConfig.OTHER;
            const PayIcon = payment.icon;
            return (
              <Card
                key={sale.id}
                className="pt-1 pb-1 cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => router.push(`/sales/${sale.id}`)}
              >
                <CardContent className="px-4 py-3">
                  {/* Top */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold">{sale.sale_number}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {sale.customer_name ?? "Anónimo"} · {formatDateOnly(sale.sold_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="gap-1 text-xs shrink-0">
                      <PayIcon className="h-3 w-3" />
                      {(sale as any).account_name}
                    </Badge>
                  </div>

                  {/* Bottom — 3 métricas */}
                  <div className="grid grid-cols-3 gap-1 pt-2.5 border-t text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Productos</p>
                      <p className="text-sm font-semibold">{sale.items_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Total</p>
                      <p className="text-sm font-bold truncate">{format(Number(sale.total))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Ganancia</p>
                      <p className="text-sm font-bold text-green-600 truncate">{format(Number(sale.net_profit))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Tabla desktop ── */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ganancia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Aún no se han registrado ventas en este período
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sale) => {
                  const payment = paymentConfig[sale.payment_method] ?? paymentConfig.OTHER;
                  const PayIcon = payment.icon;
                  return (
                    <TableRow
                      key={sale.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/sales/${sale.id}`)}
                    >
                      <TableCell className="font-medium font-mono">{sale.sale_number}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDateOnly(sale.sold_at)}</TableCell>
                      <TableCell>{sale.customer_name ?? <span className="text-muted-foreground">Anónimo</span>}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{sale.items_count} {sale.items_count === 1 ? "producto" : "productos"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <PayIcon className="h-3 w-3" />
                          {payment.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{(sale as any).account_name ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{format(Number(sale.total))}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">{format(Number(sale.net_profit))}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Fab
        actions={[
          { label: "Nueva venta", icon: ShoppingCart, onClick: () => router.push("/sales/new") },
        ]}
      />
    </div>
  );
}