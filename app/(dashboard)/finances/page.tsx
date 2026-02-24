// app/(dashboard)/finances/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Wallet, Building, Banknote, CreditCard, TrendingUp, TrendingDown,
  ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, ExternalLink,
  Pencil, Trash2, Building2,
} from "lucide-react";
import { useFinances, useFinancePeriods } from "@/hooks/swr/use-finances";
import { useAccounts, Account } from "@/hooks/swr/use-accounts";
import { CreateTransactionModal } from "@/components/transactions/create-transaction-modal";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { EditAccountDialog } from "@/components/accounts/edit-account-dialog";
import { DeleteAccountDialog } from "@/components/accounts/delete-account-dialog";
import { Fab } from "@/components/ui/fab";

// ── Helpers ────────────────────────────────────────────────────────────
const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 0 }).format(v);

const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });

const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ACCOUNT_ICONS: Record<string, any> = {
  CASH:   Banknote,
  BANK:   Building2,
  WALLET: CreditCard,
  OTHER:  Wallet,
};

const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  CASH:   { label: "Efectivo",          color: "bg-green-100 text-green-700 border-green-200" },
  BANK:   { label: "Banco",             color: "bg-blue-100 text-blue-700 border-blue-200" },
  WALLET: { label: "Billetera digital", color: "bg-purple-100 text-purple-700 border-purple-200" },
  OTHER:  { label: "Otro",              color: "bg-gray-100 text-gray-700 border-gray-200" },
};

const TYPE_CONFIG = {
  INCOME:   { icon: ArrowDownCircle, color: "text-green-600",  sign: "+" },
  EXPENSE:  { icon: ArrowUpCircle,   color: "text-destructive", sign: "-" },
  TRANSFER: { icon: ArrowLeftRight,  color: "text-blue-600",   sign: "" },
};

const REF_LABELS: Record<string, string> = {
  SALE:            "Venta",
  PURCHASE:        "Compra inventario",
  SUPPLY_PURCHASE: "Compra suministros",
  OTHER:           "Manual",
};

// ── Page ───────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const now = new Date();

  const [selectedMonth,     setSelectedMonth]     = useState<number | undefined>();
  const [selectedYear,      setSelectedYear]      = useState<number | undefined>();
  const [transactionOpen,   setTransactionOpen]   = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [editAccount,       setEditAccount]       = useState<Account | null>(null);
  const [deleteAccount,     setDeleteAccount]     = useState<Account | null>(null);

  const { summary, isLoading, mutate: mutateSummary } = useFinances({
    month: selectedMonth,
    year:  selectedYear,
  });
  const { periods }                                    = useFinancePeriods();
  const { accounts, mutate: mutateAccounts }           = useAccounts();

  const availableYears = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a);
  const monthsForYear  = (y: number) =>
    periods.filter((p) => p.year === y).map((p) => p.month).sort((a, b) => b - a);

  const totalBalance = (summary?.accounts ?? []).reduce((acc, a) => acc + Number(a.balance), 0);

  const periodLabel = selectedYear && selectedMonth
    ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
    : selectedYear ? `Año ${selectedYear}`
    : `${MONTH_NAMES[now.getMonth() + 1]} ${now.getFullYear()}`;

  const cashFlow = (summary?.cash_flow ?? []).map((d) => ({
    date:    new Date(d.date + "T00:00:00").toLocaleDateString("es-HN", { day: "numeric", month: "short" }),
    income:  Number(d.income),
    expense: Number(d.expense),
  }));

  const onAccountSuccess = () => { mutateAccounts(); mutateSummary(); };

  return (
    <div className="space-y-4 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cuentas</h1>
          <p className="text-muted-foreground text-sm">{periodLabel}</p>
        </div>
      </div>

      {/* Filtros período */}
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={selectedMonth ? String(selectedMonth) : "all"}
          onValueChange={(v) => setSelectedMonth(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo el año</SelectItem>
            {(selectedYear ? monthsForYear(selectedYear) : monthsForYear(now.getFullYear())).map((m) => (
              <SelectItem key={m} value={String(m)}>{MONTH_NAMES[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedYear ? String(selectedYear) : String(now.getFullYear())}
          onValueChange={(v) => {
            const y = Number(v);
            setSelectedYear(y);
            const months = periods.filter((p) => p.year === y).map((p) => p.month);
            if (selectedMonth && !months.includes(selectedMonth)) setSelectedMonth(undefined);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.length === 0 && (
              <SelectItem value={String(now.getFullYear())}>{now.getFullYear()}</SelectItem>
            )}
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Balance total */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium opacity-80">Balance total</span>
            <Wallet className="h-4 w-4 opacity-60" />
          </div>
          <div className="text-3xl font-bold">
            {isLoading
              ? <Skeleton className="h-8 w-32 bg-primary-foreground/20" />
              : formatCurrency(totalBalance)
            }
          </div>
          <p className="text-xs opacity-60 mt-1">
            {summary?.accounts.length ?? 0} cuentas activas
          </p>
        </CardContent>
      </Card>

      {/* Stats período */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Ingresos</span>
              <TrendingUp className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-base font-bold text-green-600">
              {isLoading ? <Skeleton className="h-5 w-20" /> : formatCurrency(summary?.period.income ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{periodLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Egresos</span>
              <TrendingDown className="h-3 w-3 text-destructive" />
            </div>
            <p className="text-base font-bold text-destructive">
              {isLoading ? <Skeleton className="h-5 w-20" /> : formatCurrency(summary?.period.expense ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{periodLabel}</p>
          </CardContent>
        </Card>
      </div>

{/* Cuentas — una card con lista */}
<div>
  <p className="text-sm font-semibold mb-2.5">Cuentas</p>
  <Card>
    <CardContent className="p-0">
      {isLoading ? (
        <div className="divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : (summary?.accounts ?? []).length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center">
          <Wallet className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-2">Sin cuentas creadas</p>
        </div>
      ) : (
        <div className="divide-y">
          {(summary?.accounts ?? []).map((account) => {
            const Icon       = ACCOUNT_ICONS[account.type] ?? Wallet;
            const typeConfig = ACCOUNT_TYPE_CONFIG[account.type] ?? ACCOUNT_TYPE_CONFIG.OTHER;
            const fullAccount = accounts.find((a) => a.id === account.id);
            return (
              <div key={account.id} className="flex items-center gap-3 p-3.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{account.name}</p>
                  <Badge className={`text-[10px] mt-0.5 ${typeConfig.color}`} variant="outline">
                    {typeConfig.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <p className="text-sm font-bold">{formatCurrency(Number(account.balance))}</p>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => fullAccount && setEditAccount(fullAccount)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => fullAccount && setDeleteAccount(fullAccount)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
</div>
      {/* ── Flujo de efectivo ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold">Flujo de efectivo</p>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : cashFlow.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sin datos en este período
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cashFlow}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => v >= 1000 ? `L${Math.round(v / 1000)}k` : `L${v}`}
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="income"  stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeWidth={2} name="Ingresos" />
                <Area type="monotone" dataKey="expense" stroke="#EF4444" fill="#EF4444" fillOpacity={0.15} strokeWidth={2} name="Egresos" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Movimientos de hoy ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <p className="text-sm font-semibold">Movimientos de hoy</p>
            <p className="text-xs text-muted-foreground">
              {summary?.today.count ?? 0} transacciones ·
              <span className="text-green-600 ml-1">+{formatCurrency(summary?.today.income ?? 0)}</span>
              <span className="text-destructive ml-1">-{formatCurrency(summary?.today.expense ?? 0)}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
            <Link href="/finances/transactions">
              Ver todas <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))
          ) : !summary?.today_transactions.length ? (
            <Card>
              <CardContent className="py-8 flex flex-col items-center justify-center">
                <ArrowLeftRight className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mt-2">Sin movimientos hoy</p>
              </CardContent>
            </Card>
          ) : (
            summary.today_transactions.map((t) => {
              const cfg  = TYPE_CONFIG[t.type];
              const Icon = cfg.icon;
              return (
                <Card key={t.id}>
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.description || REF_LABELS[t.reference_type ?? "OTHER"] || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.account_name}
                          {t.to_account_name && <span> → {t.to_account_name}</span>}
                          {" · "}{formatTime(t.occurred_at)}
                        </p>
                      </div>
                      <p className={`text-sm font-bold shrink-0 ${cfg.color}`}>
                        {cfg.sign}{formatCurrency(Number(t.amount))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* FAB */}
      <Fab
        actions={[
          {
            label:   "Nueva cuenta",
            icon:    Wallet,
            onClick: () => setCreateAccountOpen(true),
          },
          {
            label:   "Nueva transacción",
            icon:    ArrowLeftRight,
            onClick: () => setTransactionOpen(true),
          },
        ]}
      />

      {/* Modales */}
      <CreateTransactionModal
        open={transactionOpen}
        onOpenChange={setTransactionOpen}
        accounts={accounts}
        onSuccess={() => { mutateSummary(); setTransactionOpen(false); }}
      />
      <CreateAccountDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
        onSuccess={onAccountSuccess}
      />
      <EditAccountDialog
        account={editAccount}
        open={!!editAccount}
        onOpenChange={(open) => !open && setEditAccount(null)}
        onSuccess={onAccountSuccess}
      />
      <DeleteAccountDialog
        account={deleteAccount}
        open={!!deleteAccount}
        onOpenChange={(open) => !open && setDeleteAccount(null)}
        onSuccess={onAccountSuccess}
      />
    </div>
  );
}