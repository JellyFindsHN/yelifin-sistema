// app/(dashboard)/dashboard/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign, TrendingUp, Package, Wallet, Users, AlertTriangle,
  ArrowUpRight, ArrowDownRight, ShoppingCart, Banknote, CreditCard,
  ArrowLeftRight, HelpCircle, ChevronDown, CalendarDays,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { useDashboard, useDashboardPeriods } from "@/hooks/swr/use-dashboard";

// ── Helpers ────────────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 0 }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("es-HN", { month: "short", day: "numeric" });

const formatDateFull = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("es-HN", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

function formatAxisMoney(v: number) {
  if (v >= 1_000_000) return `L${Math.round(v / 1_000_000)}M`;
  if (v >= 1_000)     return `L${Math.round(v / 1_000)}k`;
  return `L${v}`;
}

const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

const paymentLabel: Record<string, { label: string; icon: any }> = {
  CASH:     { label: "Efectivo",      icon: Banknote },
  CARD:     { label: "Tarjeta",       icon: CreditCard },
  TRANSFER: { label: "Transferencia", icon: ArrowLeftRight },
  MIXED:    { label: "Mixto",         icon: HelpCircle },
  OTHER:    { label: "Otro",          icon: HelpCircle },
};

function ChangeIndicator({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-muted-foreground text-xs">sin datos anteriores</span>;
  const isUp = value >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-green-600" : "text-destructive"}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}% vs anterior
    </span>
  );
}

// ── Componente ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();

  const [selectedMonth, setSelectedMonth] = useState<number | undefined>();
  const [selectedYear,  setSelectedYear]  = useState<number | undefined>();

  const { data, isLoading } = useDashboard({ month: selectedMonth, year: selectedYear });
  const { periods }         = useDashboardPeriods();

  const availableYears = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a);

  const periodLabel = () => {
    if (!selectedMonth && !selectedYear) return "Mes actual";
    if (selectedYear && !selectedMonth)  return `Año ${selectedYear}`;
    if (selectedYear && selectedMonth)   return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    return "Mes actual";
  };

  const clearFilter = () => { setSelectedMonth(undefined); setSelectedYear(undefined); };

  const m = data?.metrics;

  const salesChart = (data?.sales_chart ?? []).map((d: any) => ({
    ...d,
    label:   formatDate(d.date),
    revenue: Number(d.revenue ?? 0),
    profit:  Number(d.profit  ?? 0),
  }));

  const topProducts = (data?.top_products ?? []).map((p: any) => ({
    ...p,
    units_sold: Number(p.units_sold ?? 0),
  }));

  const paymentMethods = (data?.payment_methods ?? []).map((p: any, i: number) => ({
    name:  p.method ?? "Otro",
    value: Number(p.amount ?? 0),
    fill:  CHART_COLORS[i % CHART_COLORS.length],
  }));

  const lowStock    = data?.low_stock    ?? [];
  const recentSales = data?.recent_sales ?? [];

  // ── Métricas principales ──────────────────────────────────────────────
  const mainMetrics = [
    {
      title: "Ingresos",
      value: m ? formatCurrency(Number(m.revenue ?? 0)) : null,
      sub:   <ChangeIndicator value={m?.revenue_change ?? null} />,
      icon:  DollarSign,
    },
    {
      title: "Ganancia neta",
      value: m ? formatCurrency(Number(m.profit ?? 0)) : null,
      sub:   <ChangeIndicator value={m?.profit_change ?? null} />,
      icon:  TrendingUp,
      valueClass: "text-green-600",
    },
    {
      title: "Clientes",
      value: m ? Number(m.customers_total ?? 0) : null,
      sub:   <span className="text-xs text-muted-foreground">+{Number(m?.customers_new ?? 0)} nuevos</span>,
      icon:  Users,
    },
    {
      title: "Balance",
      value: m ? formatCurrency(Number(m.balance ?? 0)) : null,
      sub:   <span className="text-xs text-muted-foreground">todas las cuentas</span>,
      icon:  Wallet,
    },
  ];

  return (
    <div className="space-y-4 pb-8 md:space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Resumen de tu negocio</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="text-sm">{periodLabel()}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={clearFilter}>
              <span className={!selectedMonth && !selectedYear ? "font-medium text-primary" : ""}>
                Mes actual
              </span>
            </DropdownMenuItem>

            {availableYears.length > 0 && <DropdownMenuSeparator />}

            {availableYears.map((year) => (
              <div key={year}>
                <DropdownMenuLabel className="text-xs text-muted-foreground py-1">{year}</DropdownMenuLabel>

                <DropdownMenuItem onClick={() => { setSelectedYear(year); setSelectedMonth(undefined); }}>
                  <span className={selectedYear === year && !selectedMonth ? "font-medium text-primary" : ""}>
                    Todo {year}
                  </span>
                </DropdownMenuItem>

                {periods
                  .filter((p) => p.year === year)
                  .sort((a, b) => b.month - a.month)
                  .map((p) => (
                    <DropdownMenuItem
                      key={`${p.year}-${p.month}`}
                      className="pl-5"
                      onClick={() => { setSelectedYear(p.year); setSelectedMonth(p.month); }}
                    >
                      <span className={selectedYear === p.year && selectedMonth === p.month ? "font-medium text-primary" : ""}>
                        {MONTH_NAMES[p.month]}
                      </span>
                    </DropdownMenuItem>
                  ))
                }
              </div>
            ))}

            {periods.length === 0 && !isLoading && (
              <DropdownMenuItem disabled>Sin ventas registradas</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Métricas principales — compactas ── */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        {mainMetrics.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-3 lg:p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
              <div className={`text-lg font-bold lg:text-xl ${(stat as any).valueClass ?? ""}`}>
                {isLoading ? <Skeleton className="h-6 w-20" /> : stat.value}
              </div>
              <div className="mt-0.5 hidden sm:block">
                {isLoading ? <Skeleton className="h-3 w-24" /> : stat.sub}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Alertas + Últimas ventas — móvil only ── */}
      <div className="space-y-3 lg:hidden">

        {(isLoading || lowStock.length > 0) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Alertas de stock</span>
              </div>
              <div className="space-y-2">
                {isLoading
                  ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
                  : lowStock.slice(0, 4).map((p: any) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="relative h-7 w-7 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                        {p.image_url
                          ? <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                          : <Package className="h-3.5 w-3.5 text-muted-foreground/40" />
                        }
                      </div>
                      <p className="text-sm flex-1 truncate">{p.name}</p>
                      <Badge variant={Number(p.stock) === 0 ? "destructive" : "secondary"} className="shrink-0 text-xs">
                        {Number(p.stock) === 0 ? "Agotado" : `${p.stock} uds`}
                      </Badge>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Últimas ventas</p>
            <div className="space-y-2">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
                : !recentSales.length
                  ? <p className="text-sm text-muted-foreground text-center py-3">Sin ventas en este período</p>
                  : recentSales.slice(0, 4).map((sale: any) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border cursor-pointer active:scale-[0.99] transition-transform"
                      onClick={() => router.push(`/sales/${sale.id}`)}
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium">{sale.sale_number}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {sale.customer_name ?? "Anónimo"} · {formatDateFull(sale.sold_at)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="font-bold text-sm">{formatCurrency(Number(sale.total))}</p>
                        <p className="text-xs text-green-600">{formatCurrency(Number(sale.profit))}</p>
                      </div>
                    </div>
                  ))
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Stats secundarias — desktop ── */}
      <div className="hidden lg:grid grid-cols-3 gap-3">
        {[
          { label: "Órdenes del período", value: Number(m?.sales_count ?? 0),                                    icon: ShoppingCart },
          { label: "Unidades en stock",   value: Number(m?.inventory?.total_units ?? 0),                         icon: Package },
          { label: "Valor inventario",    value: m ? formatCurrency(Number(m?.inventory?.total_value ?? 0)) : "—", icon: DollarSign },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold truncate">
                  {isLoading ? <Skeleton className="h-6 w-16" /> : s.value}
                </div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Gráficas — desktop ── */}
      <div className="hidden lg:grid gap-4 grid-cols-7">
        <Card className="col-span-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">Ventas vs Ganancias</CardTitle>
            <CardDescription>{periodLabel()}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={salesChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatAxisMoney} />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={false} name="Ventas" />
                  <Line type="monotone" dataKey="profit"  stroke="#10B981" strokeWidth={2} dot={false} name="Ganancia" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">Métodos de pago</CardTitle>
            <CardDescription>Distribución del período</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? <Skeleton className="h-64 w-full" /> : !paymentMethods.length ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={paymentMethods} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                    paddingAngle={5} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentMethods.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Top productos + Stock bajo — desktop ── */}
      <div className="hidden lg:grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">Top productos</CardTitle>
            <CardDescription>Por unidades vendidas en el período</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? <Skeleton className="h-56 w-full" /> : !topProducts.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin ventas en el período</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="units_sold" radius={[0, 4, 4, 0]} name="Unidades">
                    {topProducts.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Alertas de stock
            </CardTitle>
            <CardDescription>Productos con stock bajo</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
            ) : !lowStock.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin alertas de stock</p>
            ) : (
              <div className="space-y-2">
                {lowStock.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border">
                    <div className="relative h-8 w-8 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                      {p.image_url
                        ? <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                        : <Package className="h-4 w-4 text-muted-foreground/40" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      {p.sku && <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>}
                    </div>
                    <Badge variant={Number(p.stock ?? 0) <= 5 ? "destructive" : "secondary"}>
                      {Number(p.stock ?? 0) === 0 ? "Agotado" : `${p.stock} uds`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Últimas ventas — desktop ── */}
      <Card className="hidden lg:block">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">Últimas ventas</CardTitle>
          <CardDescription>Las 5 más recientes del período</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ganancia</TableHead>
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
              ) : !recentSales.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Sin ventas en este período
                  </TableCell>
                </TableRow>
              ) : (
                recentSales.map((sale: any) => {
                  const pay = paymentLabel[sale.payment_method] ?? paymentLabel.OTHER;
                  const PayIcon = pay.icon;
                  return (
                    <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/sales/${sale.id}`)}>
                      <TableCell className="font-mono font-medium">{sale.sale_number}</TableCell>
                      <TableCell>{sale.customer_name ?? <span className="text-muted-foreground">Anónimo</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <PayIcon className="h-3 w-3" />{pay.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDateFull(sale.sold_at)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(sale.total))}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">{formatCurrency(Number(sale.profit))}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}