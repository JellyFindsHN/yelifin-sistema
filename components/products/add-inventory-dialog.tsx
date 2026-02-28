// components/products/add-inventory-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Separator } from "@/components/ui/separator";
import { Loader2, PackagePlus, Calculator, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreatePurchase } from "@/hooks/swr/use-purchases";
import { useAccounts } from "@/hooks/swr/use-accounts";
import { useCurrency } from "@/hooks/swr/use-currency";
import { Product } from "@/types";

const TASA_DEFAULT = 24.89;

const schema = z.object({
  account_id:    z.coerce.number().min(1, "Selecciona una cuenta"),
  quantity:      z.coerce.number().int().min(1, "Mínimo 1 unidad"),
  unit_cost_usd: z.coerce.number().min(0, "El costo debe ser mayor o igual a 0"),
  currency:      z.enum(["USD", "HNL"]),
  exchange_rate: z.coerce.number().min(1, "La tasa de cambio debe ser mayor a 0"),
  shipping:      z.coerce.number().min(0).default(0),
  notes:         z.string().optional(),
  purchased_at:  z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Props = {
  product:      Product | null;
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
};

export function AddInventoryDialog({ product, open, onOpenChange, onSuccess }: Props) {
  const { createPurchase, isCreating } = useCreatePurchase();
  const { accounts }                   = useAccounts();
  const { format, symbol }             = useCurrency();

  const {
    register, handleSubmit, reset, control, setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency:      "USD",
      exchange_rate: TASA_DEFAULT,
      shipping:      0,
      quantity:      1,
      unit_cost_usd: 0,
    },
  });

  const quantity     = useWatch({ control, name: "quantity" });
  const unitCostUsd  = useWatch({ control, name: "unit_cost_usd" });
  const currency     = useWatch({ control, name: "currency" });
  const exchangeRate = useWatch({ control, name: "exchange_rate" });
  const shipping     = useWatch({ control, name: "shipping" });

  const qty  = Number(quantity)     || 0;
  const cost = Number(unitCostUsd)  || 0;
  const rate = Number(exchangeRate) || TASA_DEFAULT;
  const ship = Number(shipping)     || 0;
  const isUSD = currency === "USD";

  const unitCostHnl     = isUSD ? cost * rate : cost;
  const shippingPerUnit = qty > 0 ? ship / qty : 0;
  const finalUnitCost   = unitCostHnl + shippingPerUnit;
  const totalCost       = finalUnitCost * qty;

  useEffect(() => {
    if (open) {
      reset({
        currency:      "USD",
        exchange_rate: TASA_DEFAULT,
        shipping:      0,
        quantity:      1,
        unit_cost_usd: 0,
        purchased_at:  new Date().toISOString().split("T")[0],
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    if (!product) return;
    try {
      await createPurchase({
        account_id:    data.account_id,
        currency:      data.currency,
        exchange_rate: data.exchange_rate,
        shipping:      data.shipping,
        notes:         data.notes,
        purchased_at:  data.purchased_at
          ? new Date(data.purchased_at).toISOString()
          : new Date().toISOString(),
        items: [{ product_id: product.id, quantity: data.quantity, unit_cost_usd: data.unit_cost_usd }],
      });
      toast.success(`${data.quantity} unidades de ${product.name} registradas`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar el inventario");
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0",
          "w-full max-w-full rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0",
          "max-h-[92dvh] flex flex-col p-0",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-lg sm:rounded-2xl sm:border",
          "sm:max-h-[88vh]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-[48%]",
          "data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:slide-out-to-bottom-[48%]",
          "duration-300",
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        {/* Handle móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <DialogHeader className="shrink-0 px-5 pt-2 pb-3 sm:pt-5 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <PackagePlus className="h-5 w-5 text-primary" />
            Agregar stock
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">
            {product.name}
            {product.sku && <span className="font-mono ml-2 text-xs">({product.sku})</span>}
          </p>
        </DialogHeader>

        {/* Scroll */}
        <form
          id="add-inventory-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >

          {/* Cuenta */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              Cuenta <span className="text-destructive text-xs">*</span>
            </Label>
            <Select
              onValueChange={(val) => setValue("account_id", Number(val))}
              disabled={isCreating}
            >
              <SelectTrigger className={cn("h-11", errors.account_id && "border-destructive")}>
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
            {errors.account_id && (
              <p className="text-xs text-destructive">{errors.account_id.message}</p>
            )}
          </div>

          <Separator />

          {/* Cantidad */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Cantidad <span className="text-destructive text-xs">*</span>
            </Label>
            <Input
              type="number" min="1"
              {...register("quantity")}
              disabled={isCreating}
              className="h-11 text-base"
            />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
          </div>

          {/* Moneda + Tasa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Moneda <span className="text-destructive text-xs">*</span>
              </Label>
              <Select
                defaultValue="USD"
                onValueChange={(val) => setValue("currency", val as "USD" | "HNL")}
                disabled={isCreating}
              >
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD — Dólares</SelectItem>
                  <SelectItem value="HNL">HNL — Lempiras</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isUSD && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Tasa de cambio <span className="text-destructive text-xs">*</span>
                </Label>
                <Input
                  type="number" step="0.01"
                  placeholder={`${TASA_DEFAULT}`}
                  {...register("exchange_rate")}
                  disabled={isCreating}
                  className="h-11 text-base"
                />
                {errors.exchange_rate && (
                  <p className="text-xs text-destructive">{errors.exchange_rate.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Costo unitario */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Costo unitario ({isUSD ? "USD" : symbol}) <span className="text-destructive text-xs">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {isUSD ? "$" : symbol}
              </span>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                {...register("unit_cost_usd")}
                disabled={isCreating}
                className="h-11 pl-8 text-base"
              />
            </div>
            {errors.unit_cost_usd && (
              <p className="text-xs text-destructive">{errors.unit_cost_usd.message}</p>
            )}
          </div>

          {/* Envío */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Gastos de envío ({symbol})
              <span className="text-xs text-muted-foreground font-normal ml-1">· se distribuye entre unidades</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {symbol}
              </span>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                {...register("shipping")}
                disabled={isCreating}
                className="h-11 pl-8 text-base"
              />
            </div>
          </div>

          {/* Resumen */}
          {qty > 0 && cost > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
                <Calculator className="h-3.5 w-3.5" />
                Resumen
              </div>
              {isUSD && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Costo (USD → {symbol})</span>
                  <span>${cost.toFixed(2)} × {rate} = {format(unitCostHnl)}</span>
                </div>
              )}
              {ship > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Envío por unidad</span>
                  <span>{format(shippingPerUnit)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between text-xs font-medium">
                <span>Costo unitario final</span>
                <span>{format(finalUnitCost)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-primary">
                <span>Total ({qty} uds)</span>
                <span>{format(totalCost)}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Fecha de compra</Label>
            <Input
              type="date"
              {...register("purchased_at")}
              disabled={isCreating}
              className="h-11 text-base"
            />
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Notas
              <span className="text-xs text-muted-foreground font-normal ml-1">opcional</span>
            </Label>
            <Input
              placeholder="Ej: Reposición de stock, lote #2..."
              {...register("notes")}
              disabled={isCreating}
              className="h-11 text-base"
            />
          </div>

        </form>

        {/* Footer fijo */}
        <div className="shrink-0 px-5 py-4 border-t bg-background flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="add-inventory-form"
            disabled={isCreating}
            className="flex-1 h-11 gap-2"
          >
            {isCreating
              ? <><Loader2 className="h-4 w-4 animate-spin" />Registrando...</>
              : <><PackagePlus className="h-4 w-4" />Registrar compra</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}