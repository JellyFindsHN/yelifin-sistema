// components/transactions/create-transaction-modal.tsx
"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  CreditCard,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateTransaction } from "@/hooks/swr/use-transactions";
import { useCurrency } from "@/hooks/swr/use-currency";
import { useTransactionCategories } from "@/hooks/swr/use-transaction-categories";
import { CreditCard as CreditCardType } from "@/hooks/swr/use-credit-cards";

type TxType = "INCOME" | "EXPENSE" | "TRANSFER";

const TYPE_CONFIG: Record<TxType, { label: string; icon: React.ElementType }> = {
  INCOME: { label: "Ingreso", icon: ArrowDownCircle },
  EXPENSE: { label: "Egreso", icon: ArrowUpCircle },
  TRANSFER: { label: "Transferencia", icon: ArrowLeftRight },
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: { id: number; name: string; balance: number }[];
  creditCards?: CreditCardType[];
  onSuccess?: () => void;
  defaultType?: TxType;
};

export function CreateTransactionModal({
  open,
  onOpenChange,
  accounts,
  creditCards = [],
  onSuccess,
  defaultType = "EXPENSE",
}: Props) {
  const { createTransaction, isCreating } = useCreateTransaction();
  const { format, symbol, currency: nativeCurrency } = useCurrency();
  const { mutate } = useSWRConfig();

  const [type, setType] = useState<TxType>(defaultType);
  const [sourceMode, setSourceMode] = useState<"account" | "credit_card">("account");
  const [accountId, setAccountId] = useState("");
  const [creditCardId, setCreditCardId] = useState("");
  const [ccCurrency, setCcCurrency] = useState(nativeCurrency);
  const [ccExchangeRate, setCcExchangeRate] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().split("T")[0],
  );

  const showCreditCardOption = type === "EXPENSE" && creditCards.length > 0;
  const isCreditCardMode = showCreditCardOption && sourceMode === "credit_card";
  const isCcUsd = isCreditCardMode && ccCurrency === "USD";

  // Obtener categorías dinámicas filtradas por tipo
  const { categories } = useTransactionCategories(type);
  const activeCategories = categories.filter((c) => c.is_active);

  const resetForm = () => {
    setType(defaultType);
    setSourceMode("account");
    setAccountId("");
    setCreditCardId("");
    setCcCurrency(nativeCurrency);
    setCcExchangeRate("");
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

  const mutateAll = () =>
    mutate(
      (key) =>
        typeof key === "string" &&
        (key.startsWith("/api/transactions") ||
          key.startsWith("/api/accounts") ||
          key.startsWith("/api/finances")),
      undefined,
      { revalidate: true },
    );

  const onSubmit = async () => {
    if (!amount || Number(amount) <= 0)
      return toast.error("El monto debe ser mayor a 0");

    if (isCreditCardMode) {
      if (!creditCardId) return toast.error("Selecciona una tarjeta de crédito");
      if (isCcUsd && (!ccExchangeRate || Number(ccExchangeRate) <= 0))
        return toast.error("Ingresa la tasa de cambio para cargos en USD");
    } else {
      if (!accountId) return toast.error("Selecciona una cuenta");
      if (type === "TRANSFER" && !toAccountId)
        return toast.error("Selecciona cuenta destino");
      if (type === "TRANSFER" && accountId === toAccountId)
        return toast.error("Las cuentas deben ser diferentes");
    }

    try {
      await createTransaction({
        type,
        account_id: isCreditCardMode ? undefined : Number(accountId),
        to_account_id: type === "TRANSFER" ? Number(toAccountId) : undefined,
        credit_card_id: isCreditCardMode ? Number(creditCardId) : undefined,
        currency: isCreditCardMode ? ccCurrency : undefined,
        exchange_rate: isCcUsd ? Number(ccExchangeRate) : undefined,
        amount: Number(amount),
        category: category || undefined,
        description: description || undefined,
        occurred_at: new Date(occurredAt).toISOString(),
      } as any);

      toast.success("Transacción registrada exitosamente");
      mutateAll();
      handleClose();
      onSuccess?.();
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
            Nueva transacción
          </DialogTitle>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
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

          <div className="grid-gap-4 flex flex-col ">
            {/* Toggle cuenta / tarjeta (solo para EXPENSE) */}
            {showCreditCardOption && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setSourceMode("account")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    sourceMode === "account" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Wallet className="h-3 w-3" /> Cuenta
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode("credit_card")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    sourceMode === "credit_card" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CreditCard className="h-3 w-3" /> Tarjeta
                </button>
              </div>
            )}

            {/* Selector de cuenta */}
            {!isCreditCardMode && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {type === "TRANSFER" ? "Cuenta origen" : "Cuenta"}{" "}
                <span className="text-destructive text-xs">*</span>
              </Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full h-11 text-left">
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
            )}

            {/* Selector de tarjeta de crédito */}
            {isCreditCardMode && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Tarjeta de crédito <span className="text-destructive text-xs">*</span>
                  </Label>
                  <Select value={creditCardId} onValueChange={setCreditCardId}>
                    <SelectTrigger className="w-full h-11 text-left">
                      <SelectValue placeholder="Selecciona una tarjeta" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCards.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}{c.last_four ? ` ···· ${c.last_four}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Moneda del cargo</Label>
                  <Select value={ccCurrency} onValueChange={setCcCurrency}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={nativeCurrency}>{nativeCurrency} — Moneda local</SelectItem>
                      <SelectItem value="USD">USD — Dólares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isCcUsd && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Tasa de cambio (1 USD = ? {nativeCurrency}) <span className="text-destructive text-xs">*</span>
                    </Label>
                    <Input
                      type="number" step="0.0001" min="0" placeholder="Ej: 24.89"
                      value={ccExchangeRate}
                      onChange={(e) => setCcExchangeRate(e.target.value)}
                      className="h-11 text-base"
                    />
                  </div>
                )}
              </div>
            )}

            {type === "TRANSFER" && (
              <div className="space-y-1.5 sm:mt-3">
                <Label className="text-sm font-medium">
                  Cuenta destino{" "}
                  <span className="text-destructive text-xs">*</span>
                </Label>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger className="w-full h-11 text-left sm:mt-2">
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Monto ({symbol}){" "}
              <span className="text-destructive text-xs">*</span>
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

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Categoría{" "}
              <span className="text-xs text-muted-foreground font-normal">
                opcional
              </span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                {activeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Descripción{" "}
              <span className="text-xs text-muted-foreground font-normal">
                opcional
              </span>
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

        <div className="shrink-0 px-5 py-4 border-t bg-transparent xl:bg-transparent md:bg-transparent sm:bg-background flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isCreating}
            className="flex-1 h-11 gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Registrar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}