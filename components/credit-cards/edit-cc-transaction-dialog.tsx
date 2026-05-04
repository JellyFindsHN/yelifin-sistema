// components/credit-cards/edit-cc-transaction-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CreditCardTransaction, useUpdateCCTransaction } from "@/hooks/swr/use-credit-cards";
import { TransactionCategory } from "@/hooks/swr/use-transaction-categories";

const schema = z.object({
  description:   z.string().optional(),
  category:      z.string().optional(),
  occurred_at:   z.string().min(1, "La fecha es requerida"),
  amount:        z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  currency:      z.string().min(1, "La moneda es requerida"),
  exchange_rate: z.coerce.number().optional(),
}).refine((d) => {
  if (d.currency === "USD" && (!d.exchange_rate || d.exchange_rate <= 0)) return false;
  return true;
}, { message: "La tasa de cambio es requerida para cargos en USD", path: ["exchange_rate"] });

type FormData = z.infer<typeof schema>;

const toDateInput = (iso: string) => iso.split("T")[0];

type Props = {
  txn:                CreditCardTransaction | null;
  open:               boolean;
  onOpenChange:       (v: boolean) => void;
  onSuccess:          () => void;
  nativeCurrency:     string;
  expenseCategories:  TransactionCategory[];
};

export function EditCCTransactionDialog({
  txn,
  open,
  onOpenChange,
  onSuccess,
  nativeCurrency,
  expenseCategories,
}: Props) {
  const { updateTransaction, isUpdating } = useUpdateCCTransaction();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const selectedCurrency = watch("currency");
  const isSubmittingOrUpdating = isSubmitting || isUpdating;

  useEffect(() => {
    if (txn && open) {
      reset({
        description:   txn.description ?? "",
        category:      txn.category ?? "",
        occurred_at:   toDateInput(txn.occurred_at),
        amount:        Number(txn.amount),
        currency:      txn.currency,
        exchange_rate: txn.exchange_rate ? Number(txn.exchange_rate) : undefined,
      });
    }
  }, [txn, open, reset]);

  const handleClose = () => onOpenChange(false);

  const onSubmit = async (data: FormData) => {
    if (!txn) return;
    try {
      await updateTransaction(txn.id, {
        description:   data.description || undefined,
        category:      data.category || null,
        occurred_at:   new Date(data.occurred_at).toISOString(),
        amount:        data.amount,
        currency:      data.currency,
        exchange_rate: data.currency === "USD" ? data.exchange_rate : undefined,
      });
      toast.success("Cargo actualizado");
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar cargo");
    }
  };

  if (!txn) return null;

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
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="h-4 w-4 text-primary" />
            Editar cargo
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">
            {txn.description || "Compra"}
          </p>
        </DialogHeader>

        <form
          id="edit-cc-txn-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {/* Descripcion */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Descripcion{" "}
              <span className="text-xs text-muted-foreground font-normal">opcional</span>
            </Label>
            <Input
              placeholder="Ej. Supermercado, gasolina..."
              {...register("description")}
              disabled={isSubmittingOrUpdating}
              className="h-11 text-base"
            />
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Fecha <span className="text-destructive text-xs">*</span>
            </Label>
            <Input
              type="date"
              {...register("occurred_at")}
              disabled={isSubmittingOrUpdating}
              className="h-11 text-base"
            />
            {errors.occurred_at && (
              <p className="text-xs text-destructive">{errors.occurred_at.message}</p>
            )}
          </div>

          {/* Moneda */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Moneda <span className="text-destructive text-xs">*</span>
            </Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmittingOrUpdating}
                >
                  <SelectTrigger className="h-11 text-base">
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={nativeCurrency}>{nativeCurrency}</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.currency && (
              <p className="text-xs text-destructive">{errors.currency.message}</p>
            )}
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Monto <span className="text-destructive text-xs">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {selectedCurrency === "USD" ? "$" : nativeCurrency}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register("amount")}
                disabled={isSubmittingOrUpdating}
                className="h-11 pl-12 text-base"
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Tasa de cambio (solo USD) */}
          {selectedCurrency === "USD" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Tasa de cambio <span className="text-destructive text-xs">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  {nativeCurrency}
                </span>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="25.00"
                  {...register("exchange_rate")}
                  disabled={isSubmittingOrUpdating}
                  className="h-11 pl-12 text-base"
                />
              </div>
              {errors.exchange_rate && (
                <p className="text-xs text-destructive">{errors.exchange_rate.message}</p>
              )}
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Categoria{" "}
              <span className="text-xs text-muted-foreground font-normal">opcional</span>
            </Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value ?? "__none__"}
                  onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                  disabled={isSubmittingOrUpdating}
                >
                  <SelectTrigger className="h-11 text-base">
                    <SelectValue placeholder="Sin categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoria</SelectItem>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </form>

        <div className="shrink-0 px-5 py-4 border-t bg-transparent xl:bg-transparent md:bg-transparent sm:bg-background flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmittingOrUpdating}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="edit-cc-txn-form"
            disabled={isSubmittingOrUpdating}
            className="flex-1 h-11 gap-2"
          >
            {isSubmittingOrUpdating
              ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
              : <><Pencil className="h-4 w-4" />Guardar cambios</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
