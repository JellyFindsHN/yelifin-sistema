// app/(dashboard)/finances/credit-cards/page.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CreditCard, Plus, ChevronRight, Trash2,
  CalendarDays, DollarSign, ArrowUpCircle, ArrowDownCircle,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import {
  useCreditCards, useDeleteCreditCard, useAllCreditCardTransactions,
  useCCTransactionPeriods,
  CreditCard as CreditCardType,
} from "@/hooks/swr/use-credit-cards";
import { useAccounts } from "@/hooks/swr/use-accounts";
import { useCurrency } from "@/hooks/swr/use-currency";
import { usePrivacyMode } from "@/context/privacy-mode-context";
import { CreateCreditCardDialog } from "@/components/credit-cards/create-credit-card-dialog";
import { PayCreditCardDialog } from "@/components/credit-cards/pay-credit-card-dialog";
import { Fab } from "@/components/ui/fab";

const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const PIE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#f97316", "#14b8a6"];

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-HN", {
    day: "numeric", month: "short", year: "numeric",
  });

export default function CreditCardsPage() {
  const now = new Date();

  const { creditCards, isLoading, mutate } = useCreditCards();
  const { accounts } = useAccounts();
  const { format, currency } = useCurrency();
  const { deleteCreditCard } = useDeleteCreditCard();
  const { isPrivate } = usePrivacyMode();

  const [createOpen, setCreateOpen] = useState(false);
  const [payCard, setPayCard] = useState<CreditCardType | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedCardId, setSelectedCardId] = useState<number | undefined>(undefined);

  const { periods } = useCCTransactionPeriods();

  const { transactions: ccTxs, isLoading: loadingTxs } = useAllCreditCardTransactions({
    month: selectedMonth,
    year: selectedYear,
    card_id: selectedCardId,
  });

  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  const availableYears = [...new Set([
    ...periods.map((p) => p.year),
    currentYear,
  ])].sort((a, b) => b - a);

  const monthsForYear = (y: number) => {
    const fromPeriods = periods.filter((p) => p.year === y).map((p) => p.month);
    const withCurrent = y === currentYear && !fromPeriods.includes(currentMonth)
      ? [...fromPeriods, currentMonth]
      : fromPeriods;
    return [...new Set(withCurrent)].sort((a, b) => b - a);
  };

  const totalDebtLocal = creditCards.reduce((a, c) => a + Number(c.balance), 0);
  const totalDebtUsd   = creditCards.reduce((a, c) => a + Number(c.balance_usd), 0);

  // Category breakdown — charges only
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of ccTxs) {
      if (t.type !== "CHARGE") continue;
      const label = t.category?.trim() || "Sin categoría";
      map.set(label, (map.get(label) ?? 0) + Number(t.amount_local ?? t.amount));
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [ccTxs]);

  // Recent transactions sorted newest first — last 10 charges + payments
  const recentTxs = useMemo(() =>
    [...ccTxs]
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .slice(0, 10),
    [ccTxs]
  );

  const totalCharges = ccTxs
    .filter((t) => t.type === "CHARGE")
    .reduce((a, t) => a + Number(t.amount_local ?? t.amount), 0);

  const totalPayments = ccTxs
    .filter((t) => t.type === "PAYMENT")
    .reduce((a, t) => a + Number(t.amount_local ?? t.amount), 0);

  const handleDelete = async (card: CreditCardType) => {
    if (Number(card.balance) !== 0 || Number(card.balance_usd) !== 0) {
      toast.error("No puedes eliminar una tarjeta con saldo pendiente");
      return;
    }
    try {
      await deleteCreditCard(card.id);
      toast.success("Tarjeta eliminada");
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar tarjeta");
    }
  };

  const yearOptions  = availableYears;
  const monthOptions = monthsForYear(selectedYear);

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarjetas de crédito</h1>
          <p className="text-muted-foreground text-sm">
            {creditCards.length} tarjeta{creditCards.length !== 1 ? "s" : ""} activa{creditCards.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {/* Card filter */}
          {creditCards.length > 1 && (
            <Select
              value={selectedCardId != null ? String(selectedCardId) : "all"}
              onValueChange={(v) => setSelectedCardId(v === "all" ? undefined : Number(v))}
            >
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todas las tarjetas</SelectItem>
                {creditCards.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                    {c.name}{c.last_four ? ` ···· ${c.last_four}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={String(m)} className="text-xs">{MONTH_NAMES[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => {
              const y = Number(v);
              setSelectedYear(y);
              const months = monthsForYear(y);
              if (months.length && !months.includes(selectedMonth)) {
                setSelectedMonth(months[0]);
              }
            }}
          >
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 60 / 40 grid */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4 w-full items-stretch">

        {/* ── Left column (60%) ── */}
        <div className="flex flex-col gap-3">

          {/* Stat mini-cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Cargos del mes", value: totalCharges, color: "text-destructive", icon: ArrowUpCircle },
              { label: "Pagos del mes",  value: totalPayments, color: "text-green-600",  icon: ArrowDownCircle },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pl-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
                    <s.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                  <div className={`text-sm font-bold ${s.color}`}>
                    {loadingTxs
                      ? <Skeleton className="h-4 w-16" />
                      : <span className={isPrivate ? "blur-sm select-none" : ""}>{format(s.value)}</span>
                    }
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Deuda total */}
          {(totalDebtLocal > 0 || totalDebtUsd > 0) && !isLoading && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 pt-0 pb-0">
                <p className="text-xs font-medium text-muted-foreground mb-2">Deuda total en tarjetas</p>
                <div className="flex flex-wrap gap-4">
                  {totalDebtLocal > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">{currency}</p>
                      <p className={`text-xl font-bold text-destructive ${isPrivate ? "blur-sm select-none" : ""}`}>
                        {format(totalDebtLocal)}
                      </p>
                    </div>
                  )}
                  {totalDebtUsd > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">USD</p>
                      <p className={`text-xl font-bold text-destructive ${isPrivate ? "blur-sm select-none" : ""}`}>
                        {new Intl.NumberFormat("es-HN", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(totalDebtUsd)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cards list */}
          <Card className="pt-1 pb-1">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="divide-y">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5">
                      <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : creditCards.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <CreditCard className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Sin tarjetas de crédito</p>
                  <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Agregar tarjeta
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {creditCards.map((card) => (
                    <div key={card.id} className="flex items-center gap-3 p-3.5">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium truncate">{card.name}</p>
                          {card.last_four && (
                            <Badge variant="outline" className="text-[10px] font-mono">···· {card.last_four}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {Number(card.balance) > 0 && (
                            <span className={`text-xs text-destructive font-medium ${isPrivate ? "blur-sm select-none" : ""}`}>
                              {format(Number(card.balance))}
                            </span>
                          )}
                          {Number(card.balance_usd) > 0 && (
                            <span className={`text-xs text-destructive font-medium flex items-center gap-0.5 ${isPrivate ? "blur-sm select-none" : ""}`}>
                              <DollarSign className="h-2.5 w-2.5" />
                              {Number(card.balance_usd).toFixed(2)} USD
                            </span>
                          )}
                          {Number(card.balance) === 0 && Number(card.balance_usd) === 0 && (
                            <span className="text-xs text-muted-foreground">Sin deuda</span>
                          )}
                          {card.payment_due_day && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <CalendarDays className="h-2.5 w-2.5" />
                              Pago día {card.payment_due_day}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="sm" className="h-8 text-xs gap-1"
                          onClick={() => setPayCard(card)}
                          disabled={Number(card.balance) === 0 && Number(card.balance_usd) === 0}
                        >
                          Pagar
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(card)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Link href={`/finances/credit-cards/${card.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent transactions */}
          <Card className="pt-1 pb-1">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b">
                <p className="text-sm font-semibold">Últimas transacciones</p>
                <p className="text-xs text-muted-foreground">{MONTH_NAMES[selectedMonth]} {selectedYear}</p>
              </div>
              {loadingTxs ? (
                <div className="divide-y">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5">
                      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-4 w-16 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : recentTxs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sin transacciones en {MONTH_NAMES[selectedMonth]}
                </p>
              ) : (
                <div className="divide-y">
                  {recentTxs.map((t) => {
                    const isCharge  = t.type === "CHARGE";
                    const isUsd     = t.currency === "USD";
                    const amountStr = isUsd
                      ? `$${Number(t.amount).toFixed(2)} USD`
                      : format(Number(t.amount_local ?? t.amount));
                    return (
                      <div key={t.id} className="flex items-start gap-3 p-3.5">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isCharge ? "bg-red-100 dark:bg-red-950/30" : "bg-green-100 dark:bg-green-950/30"
                        }`}>
                          {isCharge
                            ? <ArrowUpCircle className="h-4 w-4 text-destructive" />
                            : <ArrowDownCircle className="h-4 w-4 text-green-600" />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t.description || (isCharge ? "Cargo" : "Pago")}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {t.card_name}{t.last_four ? ` ···· ${t.last_four}` : ""}
                            </span>
                            {t.category && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {t.category}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(t.occurred_at)}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${isCharge ? "text-destructive" : "text-green-600"} ${isPrivate ? "blur-sm select-none" : ""}`}>
                            {isCharge ? "-" : "+"}{amountStr}
                          </p>
                          {isUsd && t.amount_local != null && (
                            <p className={`text-[10px] text-muted-foreground ${isPrivate ? "blur-sm select-none" : ""}`}>
                              ≈ {format(Number(t.amount_local))}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column (40%) ── */}
        <div className="h-full">
          <Card className="pt-1 pb-1 h-full">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Por categoría</p>
                <Badge variant="secondary" className="text-[10px]">Cargos</Badge>
              </div>

              {loadingTxs ? (
                <div className="flex items-center justify-center py-16">
                  <Skeleton className="h-32 w-32 rounded-full" />
                </div>
              ) : categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Sin cargos en {MONTH_NAMES[selectedMonth]}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="42%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => format(v)}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={(value) => (
                        <span style={{ color: "hsl(var(--foreground))", fontSize: 11 }}>
                          {value.length > 18 ? value.slice(0, 18) + "…" : value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Fab
        actions={[
          { label: "Nueva tarjeta", icon: CreditCard, onClick: () => setCreateOpen(true) },
        ]}
      />

      <CreateCreditCardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => mutate()}
      />

      <PayCreditCardDialog
        open={!!payCard}
        onOpenChange={(v) => !v && setPayCard(null)}
        card={payCard}
        accounts={accounts}
        onSuccess={() => { mutate(); setPayCard(null); }}
      />
    </div>
  );
}
