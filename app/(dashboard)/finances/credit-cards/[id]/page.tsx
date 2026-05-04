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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CreditCard, ArrowLeft, Banknote, ShoppingBag,
  CalendarDays, TrendingUp, DollarSign, Tag,
  MoreVertical, Pencil, Trash2,
} from "lucide-react";
import {
  useCreditCard,
  useCreditCardTransactions,
  useUpdateCCTransactionCategory,
  useDeleteCCTransaction,
  CreditCardTransaction,
} from "@/hooks/swr/use-credit-cards";
import { useAccounts } from "@/hooks/swr/use-accounts";
import { useCurrency } from "@/hooks/swr/use-currency";
import { useTransactionCategories, TransactionCategory } from "@/hooks/swr/use-transaction-categories";
import { toast } from "sonner";
import { PayCreditCardDialog } from "@/components/credit-cards/pay-credit-card-dialog";
import { EditCCTransactionDialog } from "@/components/credit-cards/edit-cc-transaction-dialog";
import { Fab } from "@/components/ui/fab";

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
  const [editingTxn, setEditingTxn] = useState<CreditCardTransaction | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<CreditCardTransaction | null>(null);

  const { creditCard, isLoading: loadingCard, mutate: mutateCard } = useCreditCard(cardId);
  const { transactions, totals, isLoading: loadingTxns, mutate: mutateTxns } = useCreditCardTransactions(cardId, {
    month: selectedMonth,
    year: selectedYear,
  });
  const { accounts } = useAccounts();
  const { format, currency } = useCurrency();
  const { updateCategory } = useUpdateCCTransactionCategory();
  const { deleteTransaction, isDeleting } = useDeleteCCTransaction();
  const { categories: expenseCategories } = useTransactionCategories("EXPENSE");

  const handlePaySuccess = () => {
    mutateCard();
    mutateTxns();
    setPayOpen(false);
  };

  const handleCategoryChange = async (txId: number, category: string | null) => {
    try {
      await updateCategory(txId, category);
      mutateTxns();
      toast.success("Categoria actualizada");
    } catch {
      toast.error("Error al actualizar categoria");
    }
  };

  const handleDelete = async () => {
    if (!deletingTxn) return;
    try {
      await deleteTransaction(deletingTxn.id);
      toast.success("Cargo eliminado");
      setDeletingTxn(null);
      mutateCard();
      mutateTxns();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar");
    }
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
                <Badge variant="outline" className="font-mono text-xs">.... {creditCard.last_four}</Badge>
              )}
            </div>
          )}
          <p className="text-muted-foreground text-sm">Detalle de tarjeta de credito</p>
        </div>
      </div>

      {/* Card info */}
      {loadingCard ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : creditCard && (
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4 pt-0 pb-0">
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
                  Limite: {format(Number(creditCard.credit_limit))}
                </p>
              )}
              {creditCard.statement_closing_day && (
                <p className="text-xs opacity-60 flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Corte: dia {creditCard.statement_closing_day}
                </p>
              )}
              {creditCard.payment_due_day && (
                <p className="text-xs opacity-60 flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Pago: dia {creditCard.payment_due_day}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtro de periodo */}
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

      {/* Totales del periodo */}
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
          Movimientos - {MONTH_NAMES[selectedMonth]} {selectedYear}
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
                <p className="text-sm text-muted-foreground">Sin movimientos en este periodo</p>
              </div>
            ) : (
              <div className="divide-y">
                {transactions.map((txn) => (
                  <CreditCardTxnRow
                    key={txn.id}
                    txn={txn}
                    format={format}
                    currency={currency}
                    expenseCategories={expenseCategories}
                    onCategoryChange={handleCategoryChange}
                    onEdit={() => setEditingTxn(txn)}
                    onDelete={() => setDeletingTxn(txn)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(Number(creditCard?.balance ?? 0) > 0 || Number(creditCard?.balance_usd ?? 0) > 0) && (
        <Fab
          actions={[{
            label: "Pagar tarjeta",
            icon: Banknote,
            onClick: () => setPayOpen(true),
          }]}
        />
      )}

      <PayCreditCardDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        card={creditCard ?? null}
        accounts={accounts}
        onSuccess={handlePaySuccess}
      />

      <EditCCTransactionDialog
        txn={editingTxn}
        open={!!editingTxn}
        onOpenChange={(v) => { if (!v) setEditingTxn(null); }}
        onSuccess={() => { setEditingTxn(null); mutateCard(); mutateTxns(); }}
        nativeCurrency={currency}
        expenseCategories={expenseCategories}
      />

      <AlertDialog open={!!deletingTxn} onOpenChange={(v) => { if (!v) setDeletingTxn(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cargo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se revertira el saldo de la tarjeta. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreditCardTxnRow({
  txn,
  format,
  currency,
  expenseCategories,
  onCategoryChange,
  onEdit,
  onDelete,
}: {
  txn: CreditCardTransaction;
  format: (v: number) => string;
  currency: string;
  expenseCategories: TransactionCategory[];
  onCategoryChange: (id: number, category: string | null) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isCharge   = txn.type === "CHARGE";
  const isUsd      = txn.currency === "USD";
  const isEditable = txn.type === "CHARGE" && !txn.sale_id;

  return (
    <div className="flex items-start gap-3 p-3.5">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
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
            <span className="text-xs text-muted-foreground">{"<-"} {txn.account_name}</span>
          )}
          {isUsd && txn.exchange_rate && (
            <span className="text-xs text-muted-foreground">
              @{Number(txn.exchange_rate).toFixed(2)} = {format(Number(txn.amount_local ?? 0))}
            </span>
          )}
        </div>
        {isCharge && (
          <div className="mt-1">
            <Select
              value={txn.category ?? "__none__"}
              onValueChange={async (val) => {
                await onCategoryChange(txn.id, val === "__none__" ? null : val);
              }}
            >
              <SelectTrigger className="h-6 text-[10px] w-36 border-dashed px-2">
                <Tag className="h-2.5 w-2.5 mr-1 shrink-0" />
                <SelectValue placeholder="Sin categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin categoria</SelectItem>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-1">
        <div className="text-right">
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

        {isEditable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
