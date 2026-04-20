// components/credit-cards/pay-credit-card-dialog.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Banknote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePayCreditCard, CreditCard } from "@/hooks/swr/use-credit-cards";
import { useCurrency } from "@/hooks/swr/use-currency";
import { Account } from "@/hooks/swr/use-accounts";

const schema = z.object({
  account_id:    z.coerce.number().min(1, "Selecciona una cuenta"),
  currency:      z.string().min(1, "Selecciona la moneda"),
  amount:        z.coerce.number().positive("El monto debe ser mayor a 0"),
  exchange_rate: z.coerce.number().positive().optional(),
  description:   z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  card:         CreditCard | null;
  accounts:     Account[];
  onSuccess:    () => void;
};

export function PayCreditCardDialog({ open, onOpenChange, card, accounts, onSuccess }: Props) {
  const { payCreditCard, isPaying } = usePayCreditCard();
  const { currency: nativeCurrency, symbol, format } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState<string>(nativeCurrency);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: nativeCurrency },
  });

  const watchCurrency = watch("currency", nativeCurrency);
  const watchAmount = watch("amount", 0);
  const watchRate = watch("exchange_rate", 0);
  const isUsd = watchCurrency === "USD";
  const localEquivalent = isUsd && watchAmount && watchRate ? watchAmount * watchRate : null;

  const handleClose = () => {
    reset({ currency: nativeCurrency });
    setSelectedCurrency(nativeCurrency);
    onOpenChange(false);
  };

  const onSubmit = async (data: FormData) => {
    if (!card) return;
    if (isUsd && (!data.exchange_rate || data.exchange_rate <= 0)) {
      toast.error("La tasa de cambio es requerida para pagos en USD");
      return;
    }
    try {
      await payCreditCard(card.id, {
        account_id:    data.account_id,
        amount:        data.amount,
        currency:      data.currency,
        exchange_rate: isUsd ? data.exchange_rate : undefined,
        description:   data.description?.trim() || undefined,
      });
      toast.success("Pago registrado exitosamente");
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar pago");
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
          "sm:w-full sm:max-w-md sm:rounded-2xl sm:border sm:max-h-[88vh]",
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
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Banknote className="h-4 w-4 text-primary" />
            Pagar tarjeta
          </DialogTitle>
          {card && (
            <p className="text-sm text-muted-foreground">
              {card.name}{card.last_four ? ` ···· ${card.last_four}` : ""}
            </p>
          )}
        </DialogHeader>

        {card && (
          <div className="shrink-0 px-5 pt-4 pb-0">
            <div className="bg-muted/50 rounded-xl p-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Deuda {nativeCurrency}</p>
                <p className="font-bold text-destructive">{format(Number(card.balance))}</p>
              </div>
              {Number(card.balance_usd) > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Deuda USD</p>
                  <p className="font-bold text-destructive">
                    {new Intl.NumberFormat("es-HN", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(card.balance_usd))}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <form
          id="pay-cc-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {/* Cuenta */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Cuenta <span className="text-destructive text-xs">*</span>
            </Label>
            <Select onValueChange={(v) => setValue("account_id", Number(v))}>
              <SelectTrigger className="w-full h-11">
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name} — {format(Number(a.balance))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && <p className="text-xs text-destructive">{errors.account_id.message}</p>}
          </div>

          {/* Moneda del pago */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Moneda del pago <span className="text-destructive text-xs">*</span>
            </Label>
            <Select
              defaultValue={nativeCurrency}
              onValueChange={(v) => {
                setValue("currency", v);
                setSelectedCurrency(v);
              }}
            >
              <SelectTrigger className="w-full h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={nativeCurrency}>{nativeCurrency} — Moneda local</SelectItem>
                <SelectItem value="USD">USD — Dólares</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Monto a pagar ({isUsd ? "USD" : nativeCurrency}) <span className="text-destructive text-xs">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {isUsd ? "$" : symbol}
              </span>
              <Input
                type="number" step="0.01" min="0.01" placeholder="0.00"
                {...register("amount")}
                disabled={isPaying}
                className="h-11 pl-8 text-base"
              />
            </div>
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Tasa de cambio — solo si USD */}
          {isUsd && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Tasa de cambio (1 USD = ? {nativeCurrency}) <span className="text-destructive text-xs">*</span>
              </Label>
              <Input
                type="number" step="0.0001" min="0.0001" placeholder="Ej: 24.89"
                {...register("exchange_rate")}
                disabled={isPaying}
                className="h-11 text-base"
              />
              {errors.exchange_rate && <p className="text-xs text-destructive">{errors.exchange_rate.message}</p>}
              {localEquivalent && localEquivalent > 0 && (
                <p className="text-xs text-muted-foreground">
                  Se deducirán {format(localEquivalent)} de la cuenta seleccionada
                </p>
              )}
            </div>
          )}

          {/* Descripción opcional */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Descripción
              <span className="text-xs text-muted-foreground font-normal ml-1">opcional</span>
            </Label>
            <Input
              placeholder="Pago de tarjeta de crédito"
              {...register("description")}
              disabled={isPaying}
              className="h-11 text-base"
            />
          </div>
        </form>

        <div className="shrink-0 px-5 py-4 border-t bg-transparent sm:bg-background flex gap-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPaying} className="flex-1 h-11">
            Cancelar
          </Button>
          <Button type="submit" form="pay-cc-form" disabled={isPaying} className="flex-1 h-11 gap-2">
            {isPaying
              ? <><Loader2 className="h-4 w-4 animate-spin" />Registrando...</>
              : <><Banknote className="h-4 w-4" />Registrar pago</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
