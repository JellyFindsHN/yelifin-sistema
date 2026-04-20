// components/credit-cards/create-credit-card-dialog.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateCreditCard } from "@/hooks/swr/use-credit-cards";
import { useCurrency } from "@/hooks/swr/use-currency";

const schema = z.object({
  name:                  z.string().min(1, "El nombre es requerido"),
  last_four:             z.string().length(4, "Debe tener 4 dígitos").optional().or(z.literal("")),
  credit_limit:          z.coerce.number().min(0).optional(),
  statement_closing_day: z.coerce.number().min(1).max(31).optional(),
  payment_due_day:       z.coerce.number().min(1).max(31).optional(),
  initial_balance:       z.coerce.number().min(0).optional(),
  initial_balance_usd:   z.coerce.number().min(0).optional(),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
};

export function CreateCreditCardDialog({ open, onOpenChange, onSuccess }: Props) {
  const { createCreditCard, isCreating } = useCreateCreditCard();
  const { symbol } = useCurrency();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleClose = () => { reset(); onOpenChange(false); };

  const onSubmit = async (data: FormData) => {
    try {
      await createCreditCard({
        name:                  data.name,
        last_four:             data.last_four || undefined,
        credit_limit:          data.credit_limit || undefined,
        statement_closing_day: data.statement_closing_day || undefined,
        payment_due_day:       data.payment_due_day || undefined,
        initial_balance:       data.initial_balance || undefined,
        initial_balance_usd:   data.initial_balance_usd || undefined,
      });
      toast.success("Tarjeta de crédito creada");
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al crear tarjeta");
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
            <CreditCard className="h-4 w-4 text-primary" />
            Nueva tarjeta de crédito
          </DialogTitle>
        </DialogHeader>

        <form
          id="create-cc-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Nombre <span className="text-destructive text-xs">*</span>
            </Label>
            <Input
              placeholder="Ej: Visa BAC, Mastercard Ficohsa..."
              {...register("name")}
              disabled={isCreating}
              className="h-11 text-base"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Últimos 4 dígitos
              <span className="text-xs text-muted-foreground font-normal ml-1">opcional</span>
            </Label>
            <Input
              placeholder="1234"
              maxLength={4}
              {...register("last_four")}
              disabled={isCreating}
              className="h-11 text-base"
            />
            {errors.last_four && <p className="text-xs text-destructive">{errors.last_four.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Límite de crédito ({symbol})
              <span className="text-xs text-muted-foreground font-normal ml-1">opcional</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {symbol}
              </span>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                {...register("credit_limit")}
                disabled={isCreating}
                className="h-11 pl-8 text-base"
              />
            </div>
          </div>

          {/* Deuda inicial */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Deuda actual ({symbol})
              <span className="text-xs text-muted-foreground font-normal ml-1">si ya debes algo</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {symbol}
              </span>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                {...register("initial_balance")}
                disabled={isCreating}
                className="h-11 pl-8 text-base"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Deuda actual (USD)
              <span className="text-xs text-muted-foreground font-normal ml-1">si ya debes en dólares</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                $
              </span>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                {...register("initial_balance_usd")}
                disabled={isCreating}
                className="h-11 pl-8 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Día de corte
                <span className="text-xs text-muted-foreground font-normal ml-1">opcional</span>
              </Label>
              <Input
                type="number" min="1" max="31" placeholder="Ej: 15"
                {...register("statement_closing_day")}
                disabled={isCreating}
                className="h-11 text-base"
              />
              {errors.statement_closing_day && (
                <p className="text-xs text-destructive">{errors.statement_closing_day.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Día de pago
                <span className="text-xs text-muted-foreground font-normal ml-1">opcional</span>
              </Label>
              <Input
                type="number" min="1" max="31" placeholder="Ej: 5"
                {...register("payment_due_day")}
                disabled={isCreating}
                className="h-11 text-base"
              />
              {errors.payment_due_day && (
                <p className="text-xs text-destructive">{errors.payment_due_day.message}</p>
              )}
            </div>
          </div>
        </form>

        <div className="shrink-0 px-5 py-4 border-t bg-transparent sm:bg-background flex gap-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating} className="flex-1 h-11">
            Cancelar
          </Button>
          <Button type="submit" form="create-cc-form" disabled={isCreating} className="flex-1 h-11 gap-2">
            {isCreating
              ? <><Loader2 className="h-4 w-4 animate-spin" />Creando...</>
              : <><PlusCircle className="h-4 w-4" />Crear tarjeta</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
