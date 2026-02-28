// app/(dashboard)/finances/transactions/page.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, SlidersHorizontal, TrendingUp, TrendingDown
} from "lucide-react";
import {
  useTransactions, useTransactionPeriods
} from "@/hooks/swr/use-transactions";
import { Fab } from "@/components/ui/fab";
import { useAccounts } from "@/hooks/swr/use-accounts";
import { useCurrency } from "@/hooks/swr/use-currency";
import { CreateTransactionModal } from "@/components/transactions/create-transaction-modal";

// ── Helpers ────────────────────────────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-HN", {
    day: "numeric", month: "short", year: "numeric",
  });

const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TYPE_CONFIG = {
  INCOME: {
    label: "Ingreso",
    icon: ArrowDownCircle,
    color: "text-green-600",
    badge: "bg-green-100 text-green-700 border-green-200",
    sign: "+",
  },
  EXPENSE: {
    label: "Egreso",
    icon: ArrowUpCircle,
    color: "text-destructive",
    badge: "bg-red-100 text-red-700 border-red-200",
    sign: "-",
  },
  TRANSFER: {
    label: "Transferencia",
    icon: ArrowLeftRight,
    color: "text-blue-600",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    sign: "",
  },
};

const REF_LABELS: Record<string, string> = {
  SALE:            "Venta",
  PURCHASE:        "Compra inventario",
  SUPPLY_PURCHASE: "Compra suministros",
  EVENT:           "Evento",
  OTHER:           "Manual",
};

// ── Page ───────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const now = new Date();

  const [filterMode,    setFilterMode]    = useState<"month" | "date">("month");
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [specificDate,  setSpecificDate]  = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [typeFilter,    setTypeFilter]    = useState("all");
  const [modalOpen,     setModalOpen]     = useState(false);

  const { transactions, totals, isLoading, mutate } = useTransactions({
    account_id: accountFilter !== "all" ? Number(accountFilter) : undefined,
    month:      filterMode === "month" ? selectedMonth : undefined,
    year:       filterMode === "month" ? selectedYear  : undefined,
    date:       filterMode === "date" && specificDate ? specificDate : undefined,
  });

  const { periods }  = useTransactionPeriods();
  const { accounts } = useAccounts();
  const { format }   = useCurrency();

  const availableYears = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a);
  const monthsForYear  = (y: number) =>
    periods.filter((p) => p.year === y).map((p) => p.month).sort((a, b) => b - a);

  const filtered = transactions.filter((t) =>
    typeFilter === "all" ? true : t.type === typeFilter
  );

  const neto = totals.income - totals.expense;

  const periodLabel = filterMode === "date" && specificDate
    ? formatDate(specificDate)
    : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transacciones</h1>
          <p className="text-muted-foreground text-sm">{periodLabel}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Ingresos", value: totals.income,  color: "text-green-600",    icon: TrendingUp },
          { label: "Egresos",  value: totals.expense, color: "text-destructive",   icon: TrendingDown },
          { label: "Neto",     value: neto,            color: neto >= 0 ? "text-green-600" : "text-destructive", icon: ArrowLeftRight },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pl-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
                <s.icon className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
              <div className={`text-sm font-bold ${s.color}`}>
                {isLoading ? <Skeleton className="h-4 w-16" /> : format(s.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="space-y-2.5">

        {/* Toggle modo */}
        <div className="grid grid-cols-2 rounded-lg border overflow-hidden">
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

        {/* Período */}
        {filterMode === "month" ? (
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
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
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
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

        {/* Cuenta + Tipo */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las cuentas</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="INCOME">Ingresos</SelectItem>
              <SelectItem value="EXPENSE">Egresos</SelectItem>
              <SelectItem value="TRANSFER">Transferencias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards — móvil */}
      <div className="space-y-2.5 lg:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <SlidersHorizontal className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                No hay transacciones en este período
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((t) => {
            const cfg  = TYPE_CONFIG[t.type];
            const Icon = cfg.icon;
            return (
              <Card className="pt-3 pb-2.5" key={t.id}>
                <CardContent className="pl-3.5">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t.description || REF_LABELS[t.reference_type ?? "OTHER"] || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t.account_name}
                            {t.to_account_name && (
                              <span> → {t.to_account_name}</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(t.occurred_at)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${cfg.color}`}>
                            {cfg.sign}{format(Number(t.amount))}
                          </p>
                          <Badge className={`text-[10px] mt-0.5 ${cfg.badge}`} variant="outline">
                            {cfg.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Tabla — desktop */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No hay transacciones en este período
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => {
                  const cfg  = TYPE_CONFIG[t.type];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge className={`gap-1 ${cfg.badge}`} variant="outline">
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-sm">
                        {t.description || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.account_name}
                        {t.to_account_name && (
                          <span className="text-muted-foreground"> → {t.to_account_name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {REF_LABELS[t.reference_type ?? "OTHER"] ?? "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(t.occurred_at)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${cfg.color}`}>
                        {cfg.sign}{format(Number(t.amount))}
                      </TableCell>
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
         
          {
            label: "Nueva transacción",
            icon: ArrowLeftRight,
            onClick: () => setModalOpen(true),
          },
        ]}
      />
      {/* Modal */}
      <CreateTransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        accounts={accounts}
        onSuccess={() => { mutate(); setModalOpen(false); }}
      />
    </div>
  );
}