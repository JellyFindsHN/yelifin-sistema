// components/credit-cards/create-credit-card-dialog.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, PlusCircle } from "lucide-react";
import { toast } from "sonner";
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
    <ResponsiveModal
      open={open}
      onOpenChange={(v) => !v && handleClose()}
      title="Nueva tarjeta de crédito"
      icon={CreditCard}
      as="form"
      formProps={{ id: "create-cc-form", onSubmit: handleSubmit(onSubmit) }}
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating} className="flex-1 h-11">
            Cancelar
          </Button>
          <Button type="submit" form="create-cc-form" disabled={isCreating} className="flex-1 h-11 gap-2">
            {isCreating
              ? <><Loader2 className="size-4 animate-spin" />Creando…</>
              : <><PlusCircle className="size-4" />Crear tarjeta</>
            }
          </Button>
        </>
      }
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
    </ResponsiveModal>
  );
}
