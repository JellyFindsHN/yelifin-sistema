// app/(dashboard)/finances/credit-cards/[id]/page.tsx
"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CreditCard, ArrowLeft, Banknote, ShoppingBag,
  CalendarDays, TrendingUp, TrendingDown, DollarSign,
} from "lucide-react";
import {
  useCreditCard,
  useCreditCardTransactions,
  CreditCardTransaction,
} from "@/hooks/swr/use-credit-cards";
import { useAccounts } from "@/hooks/swr/use-accounts";
import { useCurrency } from "@/hooks/swr/use-currency";
import { PayCreditCardDialog } from "@/components/credit-cards/pay-credit-card-dialog";

const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function CreditCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const cardId = Number(id);
  const router = useRouter();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [payOpen, setPayOpen] = useState(false);

  const { creditCard, isLoading: loadingCard, mutate: mutateCard } = useCreditCard(cardId);
  const { transactions, totals, isLoading: loadingTxns, mutate: mutateTxns } = useCreditCardTransactions(cardId, {
    month: selectedMonth,
    year: selectedYear,
  });
  const { accounts } = useAccounts();
  const { format, currency } = useCurrency();

  const handlePaySuccess = () => {
    mutateCard();
    mutateTxns();
    setPayOpen(false);
  };

  const years = [now.getFullYear(), now.getFullYear() - 1];

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          {loadingCard ? (
            <Skeleton className="h-6 w-40" />
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight">{creditCard?.name ?? "Tarjeta"}</h1>
              {creditCard?.last_four && (
                <Badge variant="outline" className="font-mono text-xs">···· {creditCard.last_four}</Badge>
              )}
            </div>
          )}
          <p className="text-muted-foreground text-sm">Detalle de tarjeta de crédito</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setPayOpen(true)}
          disabled={loadingCard || (Number(creditCard?.balance ?? 0) === 0 && Number(creditCard?.balance_usd ?? 0) === 0)}
        >
          <Banknote className="h-3.5 w-3.5" />
          Pagar
        </Button>
      </div>

      {/* Card info */}
      {loadingCard ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : creditCard && (
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium opacity-80">Saldo pendiente</p>
              <CreditCard className="h-5 w-5 opacity-60" />
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs opacity-60">{currency}</p>
                <p className="text-2xl font-bold">{format(Number(creditCard.balance))}</p>
              </div>
              {Number(creditCard.balance_usd) > 0 && (
                <div>
                  <p className="text-xs opacity-60">USD</p>
                  <p className="text-2xl font-bold flex items-center gap-0.5">
                    <DollarSign className="h-4 w-4" />
                    {Number(creditCard.balance_usd).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {creditCard.credit_limit && (
                <p className="text-xs opacity-60">
                  Límite: {format(Number(creditCard.credit_limit))}
                </p>
              )}
              {creditCard.statement_closing_day && (
                <p className="text-xs opacity-60 flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Corte: día {creditCard.statement_closing_day}
                </p>
              )}
              {creditCard.payment_due_day && (
                <p className="text-xs opacity-60 flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Pago: día {creditCard.payment_due_day}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtro de período */}
      <div className="grid grid-cols-2 gap-2">
        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.slice(1).map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Totales del período */}
      {!loadingTxns && (
        <div className="grid grid-cols-2 gap-2">
          <Card className="pt-1 pb-1">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-medium text-muted-foreground">Compras ({currency})</p>
                <TrendingUp className="h-3 w-3 text-destructive" />
              </div>
              <p className="text-base font-bold text-destructive">{format(totals.charges_local)}</p>
            </CardContent>
          </Card>
          <Card className="pt-1 pb-1">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-medium text-muted-foreground">Compras (USD)</p>
                <DollarSign className="h-3 w-3 text-destructive" />
              </div>
              <p className="text-base font-bold text-destructive">${totals.charges_usd.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Movimientos */}
      <div>
        <p className="text-sm font-semibold mb-2.5">
          Movimientos — {MONTH_NAMES[selectedMonth]} {selectedYear}
        </p>
        <Card className="pt-1 pb-1">
          <CardContent className="p-0">
            {loadingTxns ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center gap-1">
                <CreditCard className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Sin movimientos en este período</p>
              </div>
            ) : (
              <div className="divide-y">
                {transactions.map((txn) => (
                  <CreditCardTxnRow key={txn.id} txn={txn} format={format} currency={currency} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PayCreditCardDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        card={creditCard ?? null}
        accounts={accounts}
        onSuccess={handlePaySuccess}
      />
    </div>
  );
}

function CreditCardTxnRow({
  txn,
  format,
  currency,
}: {
  txn: CreditCardTransaction;
  format: (v: number) => string;
  currency: string;
}) {
  const isCharge = txn.type === "CHARGE";
  const isUsd = txn.currency === "USD";

  return (
    <div className="flex items-center gap-3 p-3.5">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
        isCharge ? "bg-destructive/10" : "bg-green-100"
      }`}>
        {isCharge
          ? <ShoppingBag className="h-4 w-4 text-destructive" />
          : <Banknote className="h-4 w-4 text-green-600" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {txn.description || (isCharge ? "Compra" : "Pago de tarjeta")}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {new Date(txn.occurred_at).toLocaleDateString("es-HN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
          {txn.sale_number && (
            <Link href={`/sales/${txn.sale_id}`} className="text-xs text-primary hover:underline">
              {txn.sale_number}
            </Link>
          )}
          {txn.account_name && (
            <span className="text-xs text-muted-foreground">← {txn.account_name}</span>
          )}
          {isUsd && txn.exchange_rate && (
            <span className="text-xs text-muted-foreground">
              @{Number(txn.exchange_rate).toFixed(2)} = {format(Number(txn.amount_local ?? 0))}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className={`text-sm font-bold ${isCharge ? "text-destructive" : "text-green-600"}`}>
          {isCharge ? "+" : "-"}
          {isUsd
            ? `$${Number(txn.amount).toFixed(2)}`
            : format(Number(txn.amount))
          }
        </p>
        {isUsd && (
          <Badge variant="outline" className="text-[9px] mt-0.5">USD</Badge>
        )}
      </div>
    </div>
  );
}
