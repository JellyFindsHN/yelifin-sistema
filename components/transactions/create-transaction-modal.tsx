// components/transactions/create-transaction-modal.tsx
"use client";

import { useState } from "react";
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
import { useCreateTransaction } from "@/hooks/swr/use-transactions";
import { useCurrency } from "@/hooks/swr/use-currency";

type TxType = "INCOME" | "EXPENSE" | "TRANSFER";

const TYPE_CONFIG: Record<TxType, { label: string; icon: React.ElementType }> = {
  INCOME:   { label: "Ingreso",        icon: ArrowDownCircle },
  EXPENSE:  { label: "Egreso",         icon: ArrowUpCircle },
  TRANSFER: { label: "Transferencia",  icon: ArrowLeftRight },
};

type Props = {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  accounts:     { id: number; name: string; balance: number }[];
  onSuccess:    () => void;
  defaultType?: TxType;
};

export function CreateTransactionModal({
  open, onOpenChange, accounts, onSuccess, defaultType = "EXPENSE",
}: Props) {
  const { createTransaction, isCreating } = useCreateTransaction();
  const { format, symbol }                = useCurrency();

  const [type,        setType]        = useState<TxType>(defaultType);
  const [accountId,   setAccountId]   = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount,      setAmount]      = useState("");
  const [category,    setCategory]    = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt,  setOccurredAt]  = useState(new Date().toISOString().split("T")[0]);

  const resetForm = () => {
    setType(defaultType);
    setAccountId("");
    setToAccountId("");
    setAmount("");
    setCategory("");
    setDescription("");
    setOccurredAt(new Date().toISOString().split("T")[0]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const onSubmit = async () => {
    if (!accountId)                                                return toast.error("Selecciona una cuenta");
    if (!amount || Number(amount) <= 0)                           return toast.error("El monto debe ser mayor a 0");
    if (type === "TRANSFER" && !toAccountId)                      return toast.error("Selecciona cuenta destino");
    if (type === "TRANSFER" && accountId === toAccountId)         return toast.error("Las cuentas deben ser diferentes");

    try {
      await createTransaction({
        type,
        account_id:    Number(accountId),
        to_account_id: type === "TRANSFER" ? Number(toAccountId) : undefined,
        amount:        Number(amount),
        category:      category    || undefined,
        description:   description || undefined,
        occurred_at:   new Date(occurredAt).toISOString(),
      });
      toast.success("Transacción registrada exitosamente");
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className={cn(
          "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0",
          "w-full max-w-full rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0",
          "max-h-[92dvh] flex flex-col p-0",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-md sm:rounded-2xl sm:border",
          "sm:max-h-[88vh]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-[48%]",
          "data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:slide-out-to-bottom-[48%]",
          "duration-300",
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={handleClose}
      >
        {/* Handle móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <DialogHeader className="shrink-0 px-5 pt-2 pb-3 sm:pt-5 border-b">
          <DialogTitle className="text-lg font-bold">Nueva transacción</DialogTitle>
        </DialogHeader>

        {/* Scroll */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >

          {/* Tipo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo</Label>
            <div className="grid grid-cols-3 rounded-xl border overflow-hidden">
              {(["INCOME", "EXPENSE", "TRANSFER"] as const).map((t, i) => {
                const { label, icon: Icon } = TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "py-2.5 flex flex-col items-center gap-1 text-xs font-medium transition-colors",
                      i > 0 && "border-l",
                      type === t
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cuenta origen */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {type === "TRANSFER" ? "Cuenta origen" : "Cuenta"}{" "}
              <span className="text-destructive text-xs">*</span>
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-11">
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

          {/* Cuenta destino — solo transferencias */}
          {type === "TRANSFER" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Cuenta destino <span className="text-destructive text-xs">*</span>
              </Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="h-11">
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
                type="number" step="0.01" min="0" placeholder="0.00"
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
            <Input
              placeholder="Ej: Servicios, Nómina, Ventas..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 text-base"
            />
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

        {/* Footer fijo */}
        <div className="shrink-0 px-5 py-4 border-t bg-background flex gap-3">
          <Button
            type="button" variant="outline"
            onClick={handleClose} disabled={isCreating}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onSubmit} disabled={isCreating}
            className="flex-1 h-11 gap-2"
          >
            {isCreating
              ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
              : "Registrar"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}