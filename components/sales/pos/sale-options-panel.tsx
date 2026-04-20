// components/sales/pos/sale-options-panel.tsx
"use client";

import type React from "react";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  User,
  Wallet,
  FlaskConical,
  Truck,
  ArrowLeft,
  Clock,
  CreditCard,
} from "lucide-react";
import { useCurrency } from "@/hooks/swr/use-currency";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SearchableSelect } from "@/components/shared/SearchableSelect";

type Props = {
  customers: any[];
  accounts: any[];
  creditCards?: any[];
  hasSupplies: boolean;
  customerId: number | null;
  accountId: number | null;
  creditCardId: number | null;
  saleCardCurrency: string;
  exchangeRate: number;
  notes: string;
  grandTotal: number;
  shippingCost: number;
  isCreating: boolean;
  isPending: boolean;
  onCustomerChange: (id: number | null) => void;
  onAccountChange: (id: number) => void;
  onCreditCardChange: (id: number | null) => void;
  onSaleCardCurrencyChange: (v: string) => void;
  onExchangeRateChange: (v: number) => void;
  onNotesChange: (v: string) => void;
  onShippingCostChange: (v: number) => void;
  onIsPendingChange: (v: boolean) => void;
  onCheckout: () => void;
  onOpenSupplies: () => void;
  onBack?: () => void;
};

export function SaleOptionsPanel({
  customers,
  accounts,
  creditCards = [],
  hasSupplies,
  customerId,
  accountId,
  creditCardId,
  saleCardCurrency,
  exchangeRate,
  notes,
  grandTotal,
  shippingCost,
  isCreating,
  isPending,
  onCustomerChange,
  onAccountChange,
  onCreditCardChange,
  onSaleCardCurrencyChange,
  onExchangeRateChange,
  onNotesChange,
  onShippingCostChange,
  onIsPendingChange,
  onCheckout,
  onOpenSupplies,
  onBack,
}: Props) {
  const { format, symbol, currency: nativeCurrency } = useCurrency();

  const [paymentMode, setPaymentMode] = useState<"account" | "credit_card">("account");
  const isCreditCardUsd = paymentMode === "credit_card" && saleCardCurrency === "USD";

  // --- estado para el confirm dialog ---
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleMainActionClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onCheckout();
  };

  const confirmTitle = isPending
    ? "¿Guardar venta como pendiente?"
    : "¿Confirmar venta?";
  const confirmDescription = isPending
    ? "La venta quedará registrada como pendiente. El inventario se descuenta, pero el pago queda abierto hasta que lo confirmes."
    : "Se registrará el pago y la venta quedará completada. Esta acción no se puede deshacer.";
  const confirmLabel = isPending
    ? "Guardar como pendiente"
    : "Confirmar venta";

  return (
    <>
      <Card className="flex flex-col min-h-0">
        <CardContent
          className="flex flex-col gap-3 pt-4 px-4 pb-4 min-h-0 overflow-y-auto"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {/* Cliente */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Cliente
              <span className="text-muted-foreground ml-1">(opcional)</span>
            </Label>
            <SearchableSelect
              value={customerId?.toString() ?? "anonymous"}
              onValueChange={(v) => onCustomerChange(v === "anonymous" ? null : Number(v))}
              items={customers.map((c) => ({
                value: c.id.toString(),
                label: c.name
              }))}
              defaultOption={{ value: "anonymous", label: "Venta anónima" }}
              placeholder="Venta anónima"
              searchPlaceholder="Buscar cliente..."
              className="h-8 text-sm w-full"
            />
          </div>

          {/* Modo de pago */}
          {creditCards.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => { setPaymentMode("account"); onCreditCardChange(null); }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  paymentMode === "account"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Wallet className="h-3 w-3" />
                Cuenta
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMode("credit_card"); onAccountChange(0); }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  paymentMode === "credit_card"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CreditCard className="h-3 w-3" />
                Tarjeta
              </button>
            </div>
          )}

          {/* Cuenta destino */}
          {paymentMode === "account" && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                Cuenta de destino *
              </Label>
              <Select
                value={accountId?.toString() ?? ""}
                onValueChange={(v) => onAccountChange(Number(v))}
              >
                <SelectTrigger className="h-8 text-sm w-full">
                  <SelectValue placeholder="Seleccionar cuenta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tarjeta de crédito */}
          {paymentMode === "credit_card" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Tarjeta de crédito *
                </Label>
                <Select
                  value={creditCardId?.toString() ?? ""}
                  onValueChange={(v) => onCreditCardChange(Number(v))}
                >
                  <SelectTrigger className="h-8 text-sm w-full">
                    <SelectValue placeholder="Seleccionar tarjeta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {creditCards.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}{c.last_four ? ` ···· ${c.last_four}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Moneda de la compra */}
              <div className="space-y-1.5">
                <Label className="text-xs">Moneda de la compra</Label>
                <Select
                  value={saleCardCurrency}
                  onValueChange={onSaleCardCurrencyChange}
                >
                  <SelectTrigger className="h-8 text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={nativeCurrency}>{nativeCurrency} — Moneda local</SelectItem>
                    <SelectItem value="USD">USD — Dólares</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tasa de cambio — solo si USD */}
              {isCreditCardUsd && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Tasa de cambio (1 USD = ? {nativeCurrency}) *
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    placeholder="Ej: 24.89"
                    value={exchangeRate === 0 ? "" : exchangeRate}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      onExchangeRateChange(isNaN(n) ? 0 : n);
                    }}
                    className="h-8 text-sm"
                  />
                  {exchangeRate > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Costo equivalente: {format(grandTotal * exchangeRate)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Envío */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              Costo de envío
              <span className="text-muted-foreground ml-1">(opcional)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                {symbol}
              </span>
              <Input
                type="number"
                value={shippingCost === 0 ? "" : shippingCost}
                onChange={(e) => {
                  const raw = e.target.value.replace(/^0+(\d)/, "$1");
                  const n = parseFloat(raw);
                  onShippingCostChange(isNaN(n) ? 0 : Math.max(0, n));
                }}
                placeholder="0"
                min="0"
                step="0.01"
                className="h-8 text-sm pl-7"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Notas <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Observaciones..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Suministros */}
          {hasSupplies && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={onOpenSupplies}
              type="button"
            >
              <FlaskConical className="h-3.5 w-3.5 text-primary" />
              Agregar suministros usados
            </Button>
          )}

          {/* Toggle venta pendiente (versión que ya te funciona) */}
          <button
            type="button"
            onClick={() => onIsPendingChange(!isPending)}
            className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-xs flex items-center gap-3 cursor-pointer transition-colors
            ${isPending
                ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                : "border-border hover:bg-muted/50"
              }`}
          >
            {/* Texto + icono */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <Clock
                className={`h-3.5 w-3.5 shrink-0 ${isPending ? "text-amber-600" : "text-muted-foreground"
                  }`}
              />
              <div className="min-w-0">
                <p
                  className={`text-[11px] font-semibold leading-tight ${isPending ? "text-amber-700" : "text-foreground"
                    }`}
                >
                  Registrar como pendiente
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {isPending
                    ? "Inventario descontado · pago pendiente"
                    : "El pago se registra al confirmar"}
                </p>
              </div>
            </div>

            {/* Switch visual */}
            <div
              className={`relative shrink-0 h-5 w-9 rounded-full flex items-center transition-colors ${isPending ? "bg-amber-500" : "bg-muted-foreground/30"
                }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${isPending ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
              />
            </div>
          </button>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-1">
            {onBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                disabled={isCreating}
                className="gap-1.5 shrink-0"
                type="button"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Carrito
              </Button>
            )}
            <Button
              className={`flex-1 gap-2 ${isPending ? "bg-amber-500 hover:bg-amber-600 text-white" : ""
                }`}
              onClick={handleMainActionClick}
              disabled={isCreating}
              type="button"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : isPending ? (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  Guardar pendiente · {format(grandTotal)}
                </>
              ) : (
                `Confirmar venta · ${format(grandTotal)}`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ConfirmDialog reutilizable */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isPending ? "¿Guardar venta como pendiente?" : "¿Confirmar venta?"}
        description={
          isPending
            ? "La venta se registrará como pendiente. El inventario se descontará, pero el pago quedará abierto."
            : "Se registrará el pago y la venta quedará completada. Esta acción no se puede deshacer."
        }
        confirmLabel={isPending ? "Guardar pendiente" : "Confirmar venta"}
        variant={isPending ? "warning" : "default"}
        onConfirm={handleConfirm}
      />
    </>
  );
}