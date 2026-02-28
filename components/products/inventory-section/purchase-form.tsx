// components/products/inventory-section/purchase-form.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calculator, Wallet } from "lucide-react";
import { useAccounts } from "@/hooks/swr/use-accounts";
import { useCurrency } from "@/hooks/swr/use-currency";

const TASA_DEFAULT = 24.89;

// ── Tipos ──────────────────────────────────────────────────────────────
export type PurchaseFormValue = {
  account_id:    number | null;
  currency:      "USD" | "HNL";
  exchange_rate: number;
  quantity:      number | string;
  unit_cost:     number;
  shipping:      number;
  purchased_at:  string;
  notes:         string;
};

export const defaultPurchaseForm = (): PurchaseFormValue => ({
  account_id:    null,
  currency:      "USD",
  exchange_rate: TASA_DEFAULT,
  quantity:      "1",
  unit_cost:     0,
  shipping:      0,
  purchased_at:  new Date().toISOString().split("T")[0],
  notes:         "",
});

type Props = {
  value:     PurchaseFormValue;
  onChange:  (value: PurchaseFormValue) => void;
  disabled?: boolean;
};

// ── Componente ─────────────────────────────────────────────────────────
export function PurchaseForm({ value, onChange, disabled }: Props) {
  const { accounts }   = useAccounts();
  const { format, symbol } = useCurrency();

  const set = (patch: Partial<PurchaseFormValue>) =>
    onChange({ ...value, ...patch });

  // ── Cálculos ─────────────────────────────────────────────────────
  const qty       = Number(value.quantity)  || 0;
  const cost      = Number(value.unit_cost)     || 0;
  const rate      = Number(value.exchange_rate) || TASA_DEFAULT;
  const ship      = Number(value.shipping)      || 0;
  const isUSD     = value.currency === "USD";
  const costHnl   = isUSD ? cost * rate : cost;
  const shipUnit  = qty > 0 ? ship / qty : 0;
  const finalUnit = costHnl + shipUnit;
  const totalCost = finalUnit * qty;

  const showSummary = qty > 0 && cost > 0;

  return (
    <div className="space-y-4">

      {/* Cuenta */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          Cuenta <span className="text-destructive text-xs">*</span>
        </Label>
        <Select
          value={value.account_id?.toString() ?? ""}
          onValueChange={(v) => set({ account_id: Number(v) })}
          disabled={disabled}
        >
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

      <Separator />

      {/* Cantidad */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Cantidad <span className="text-destructive text-xs">*</span>
        </Label>
        <Input
          type="number"
          min="1"
          value={value.quantity}
          onChange={(e) => set({ quantity: e.target.value === "" ? "" : Number(e.target.value) })}
          className="h-11 text-base"
          disabled={disabled}
        />
      </div>

      {/* Moneda + Tasa */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Moneda <span className="text-destructive text-xs">*</span>
          </Label>
          <Select
            value={value.currency}
            onValueChange={(v) => set({ currency: v as "USD" | "HNL" })}
            disabled={disabled}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
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
              type="number"
              step="0.01"
              value={value.exchange_rate}
              onChange={(e) => set({ exchange_rate: Number(e.target.value) || TASA_DEFAULT })}
              className="h-11 text-base"
              disabled={disabled}
            />
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
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={value.unit_cost || ""}
            onChange={(e) => set({ unit_cost: Number(e.target.value) || 0 })}
            className="h-11 pl-8 text-base"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Envío */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Gastos de envío ({symbol})
          <span className="text-xs text-muted-foreground font-normal ml-1">
            · se distribuye entre unidades
          </span>
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
            value={value.shipping || ""}
            onChange={(e) => set({ shipping: Number(e.target.value) || 0 })}
            className="h-11 pl-8 text-base"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Resumen */}
      {showSummary && (
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
            <Calculator className="h-3.5 w-3.5" />
            Resumen
          </div>
          {isUSD && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Costo (USD → {symbol})</span>
              <span>${cost.toFixed(2)} × {rate} = {format(costHnl)}</span>
            </div>
          )}
          {ship > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Envío por unidad</span>
              <span>{format(shipUnit)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between text-xs font-medium">
            <span>Costo unitario final</span>
            <span>{format(finalUnit)}</span>
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
          value={value.purchased_at}
          onChange={(e) => set({ purchased_at: e.target.value })}
          className="h-11 text-base"
          disabled={disabled}
        />
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Notas
          <span className="text-xs text-muted-foreground font-normal ml-1">opcional</span>
        </Label>
        <Input
          placeholder="Ej: Lote inicial, compra de apertura..."
          value={value.notes}
          onChange={(e) => set({ notes: e.target.value })}
          className="h-11 text-base"
          disabled={disabled}
        />
      </div>

    </div>
  );
}