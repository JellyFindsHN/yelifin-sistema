// components/transactions/edit-transaction-modal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUpdateTransaction, Transaction } from "@/hooks/swr/use-transactions";
import { useCurrency } from "@/hooks/swr/use-currency";
import { useTransactionCategories } from "@/hooks/swr/use-transaction-categories";

type TxType = "INCOME" | "EXPENSE" | "TRANSFER";

const TYPE_CONFIG: Record<TxType, { label: string; icon: React.ElementType }> = {
  INCOME:   { label: "Ingreso",        icon: ArrowDownCircle },
  EXPENSE:  { label: "Egreso",         icon: ArrowUpCircle   },
  TRANSFER: { label: "Transferencia",  icon: ArrowLeftRight  },
};

type Props = {
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
  transaction:   Transaction;
  accounts:      { id: number; name: string; balance: number }[];
  onSuccess?:    () => void;
};

export function EditTransactionModal({
  open, onOpenChange, transaction, accounts, onSuccess,
}: Props) {
  const { updateTransaction, isUpdating } = useUpdateTransaction();
  const { format, symbol }                = useCurrency();

  // El tipo no es editable — solo se muestran los campos relevantes
  const type = transaction.type as TxType;

  const [accountId,   setAccountId]   = useState(String(transaction.account_id));
  const [toAccountId, setToAccountId] = useState(String(transaction.to_account_id ?? ""));
  const [amount,      setAmount]      = useState(String(transaction.amount));
  const [category,    setCategory]    = useState(transaction.category ?? "");
  const [description, setDescription] = useState(transaction.description ?? "");
  const [occurredAt,  setOccurredAt]  = useState(
    new Date(transaction.occurred_at).toISOString().split("T")[0]
  );

  // Sincronizar si cambia la transacción (ej: se abre con otra tx)
  useEffect(() => {
    setAccountId(String(transaction.account_id));
    setToAccountId(String(transaction.to_account_id ?? ""));
    setAmount(String(transaction.amount));
    setCategory(transaction.category ?? "");
    setDescription(transaction.description ?? "");
    setOccurredAt(new Date(transaction.occurred_at).toISOString().split("T")[0]);
  }, [transaction]);

  const { categories } = useTransactionCategories(type);
  const activeCategories = categories.filter((c) => c.is_active);

  const handleClose = () => onOpenChange(false);

  const onSubmit = async () => {
    if (!accountId) return toast.error("Selecciona una cuenta");
    if (!amount || Number(amount) <= 0) return toast.error("El monto debe ser mayor a 0");
    if (type === "TRANSFER" && !toAccountId) return toast.error("Selecciona cuenta destino");
    if (type === "TRANSFER" && accountId === toAccountId)
      return toast.error("Las cuentas deben ser diferentes");

    try {
      await updateTransaction(transaction.id, {
        amount:        Number(amount),
        account_id:    Number(accountId),
        to_account_id: type === "TRANSFER" ? Number(toAccountId) : undefined,
        category:      category    || undefined,
        description:   description || undefined,
        occurred_at:   new Date(occurredAt + "T00:00:00-06:00").toISOString(),
      });

      toast.success("Transacción actualizada");
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar");
    }
  };

  const { icon: Icon, label: typeLabel } = TYPE_CONFIG[type];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className={cn(
          "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0",
          "w-full max-w-full rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0",
          "max-h-[92dvh] flex flex-col p-0",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-md",
          "lg:max-w-xl",
          "xl:max-w-xl",
          "sm:rounded-2xl sm:border",
          "sm:max-h-[88vh]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-[48%]",
          "data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:slide-out-to-bottom-[48%]",
          "duration-300",
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={handleClose}
      >
         <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <DialogHeader className="shrink-0 px-5 pt-2 pb-3 sm:pt-5 border-b">
          <DialogTitle className="text-lg font-bold">
                Editar transacción
            </DialogTitle>
            
          <div className="flex items-center gap-1.5 mt-1">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{typeLabel} · No se puede cambiar el tipo</span>
          </div>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {/* Cuenta origen */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {type === "TRANSFER" ? "Cuenta origen" : "Cuenta"}{" "}
              <span className="text-destructive text-xs">*</span>
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-full h-11">
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span>{a.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(Number(a.balance))}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cuenta destino (solo TRANSFER) */}
          {type === "TRANSFER" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Cuenta destino <span className="text-destructive text-xs">*</span>
              </Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Selecciona cuenta destino" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => String(a.id) !== accountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Monto */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Monto ({symbol}) <span className="text-destructive text-xs">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {symbol}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 pl-8 text-base"
              />
            </div>
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Fecha <span className="text-destructive text-xs">*</span>
            </Label>
            <Input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="h-11 text-base"
            />
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Categoría{" "}
              <span className="text-xs text-muted-foreground font-normal">opcional</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Sin categoría</SelectItem>
                {activeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Descripción{" "}
              <span className="text-xs text-muted-foreground font-normal">opcional</span>
            </Label>
            <Textarea
              placeholder="Detalle de la transacción..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none text-base"
            />
          </div>
        </div>

        {/* Footer */}
       <div className="shrink-0 px-5 py-4 border-t bg-transparent xl:bg-transparent md:bg-transparent sm:bg-background flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUpdating}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isUpdating}
            className="flex-1 h-11 gap-2"
          >
            {isUpdating
              ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
              : "Guardar cambios"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}