// components/products/add-inventory-dialog.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, PackagePlus, Calculator, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useCreatePurchase } from "@/hooks/swr/use-purchases";
import { useAccounts } from "@/hooks/swr/use-accounts";
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
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

const formatCurrency = (value: number, currency = "HNL") =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);

export function AddInventoryDialog({ product, open, onOpenChange, onSuccess }: Props) {
  const { createPurchase, isCreating } = useCreatePurchase();
  const { accounts } = useAccounts();

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

  const unitCostHnl     = currency === "USD" ? cost * rate : cost;
  const shippingPerUnit = qty > 0 ? ship / qty : 0;
  const finalUnitCost   = unitCostHnl + shippingPerUnit;
  const totalCost       = finalUnitCost * qty;

  const isUSD = currency === "USD";

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
        account_id:   data.account_id,
        currency:     data.currency,
        exchange_rate: data.exchange_rate,
        shipping:     data.shipping,
        notes:        data.notes,
        purchased_at: data.purchased_at
          ? new Date(data.purchased_at).toISOString()
          : new Date().toISOString(),
        items: [{ product_id: product.id, quantity: data.quantity, unit_cost_usd: data.unit_cost_usd }],
      });
      toast.success(`Inventario agregado: ${data.quantity} unidades de ${product.name}`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar el inventario");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Agregar inventario
          </DialogTitle>
          {product && (
            <p className="text-sm text-muted-foreground">
              {product.name}
              {product.sku && <span className="font-mono ml-2 text-xs">({product.sku})</span>}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Cuenta */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              Cuenta *
            </Label>
            <Select
              onValueChange={(val) => setValue("account_id", Number(val))}
              disabled={isCreating}
            >
              <SelectTrigger className={errors.account_id ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span>{a.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatCurrency(Number(a.balance))}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && (
              <p className="text-sm text-destructive">{errors.account_id.message}</p>
            )}
          </div>

          <Separator />

          {/* Cantidad */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad *</Label>
            <Input
              id="quantity" type="number" min="1" placeholder="0"
              {...register("quantity")} disabled={isCreating}
            />
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          </div>

          {/* Moneda y Tasa */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Moneda *</Label>
              <Select
                defaultValue="USD"
                onValueChange={(val) => setValue("currency", val as "USD" | "HNL")}
                disabled={isCreating}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD — Dólares</SelectItem>
                  <SelectItem value="HNL">HNL — Lempiras</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isUSD && (
              <div className="space-y-2">
                <Label htmlFor="exchange_rate">Tasa de cambio *</Label>
                <Input
                  id="exchange_rate" type="number" step="0.01"
                  placeholder={`${TASA_DEFAULT}`}
                  {...register("exchange_rate")} disabled={isCreating}
                />
                {errors.exchange_rate && <p className="text-sm text-destructive">{errors.exchange_rate.message}</p>}
              </div>
            )}
          </div>

          {/* Costo unitario */}
          <div className="space-y-2">
            <Label htmlFor="unit_cost_usd">Costo unitario ({isUSD ? "USD" : "L"}) *</Label>
            <Input
              id="unit_cost_usd" type="number" step="0.01" min="0" placeholder="0.00"
              {...register("unit_cost_usd")} disabled={isCreating}
            />
            {errors.unit_cost_usd && <p className="text-sm text-destructive">{errors.unit_cost_usd.message}</p>}
          </div>

          {/* Envío */}
          <div className="space-y-2">
            <Label htmlFor="shipping">
              Gastos de envío (L)
              <span className="text-xs text-muted-foreground ml-2">opcional · se distribuye entre unidades</span>
            </Label>
            <Input
              id="shipping" type="number" step="0.01" min="0" placeholder="0.00"
              {...register("shipping")} disabled={isCreating}
            />
          </div>

          {/* Resumen */}
          {qty > 0 && cost > 0 && (
            <div className="bg-muted/40 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Calculator className="h-4 w-4 text-primary" />
                Resumen de costos
              </div>
              <div className="space-y-1.5 text-sm">
                {isUSD && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Costo unitario (USD → L)</span>
                    <span>{formatCurrency(cost, "USD")} × {rate} = {formatCurrency(unitCostHnl)}</span>
                  </div>
                )}
                {ship > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Envío por unidad</span>
                    <span>{formatCurrency(shippingPerUnit)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Costo unitario final</span>
                  <span>{formatCurrency(finalUnitCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-primary">
                  <span>Total ({qty} uds)</span>
                  <span>{formatCurrency(totalCost)}</span>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="purchased_at">Fecha de compra</Label>
            <Input
              id="purchased_at" type="date"
              {...register("purchased_at")} disabled={isCreating}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notas
              <span className="text-xs text-muted-foreground ml-2">opcional</span>
            </Label>
            <Textarea
              id="notes" placeholder="Observaciones de la compra..." rows={2}
              {...register("notes")} disabled={isCreating}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando...</>
                : "Registrar compra"
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}