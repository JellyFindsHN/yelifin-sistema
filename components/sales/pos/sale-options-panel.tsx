// components/sales/pos/sale-options-panel.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, User, Wallet, CreditCard, FlaskConical, Truck } from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 0,
  }).format(v);

type Props = {
  customers: any[];
  accounts: any[];
  hasSupplies: boolean;
  customerId: number | null;
  accountId: number | null;
  notes: string;
  grandTotal: number;
  shippingCost: number;
  isCreating: boolean;
  onCustomerChange: (id: number | null) => void;
  onAccountChange: (id: number) => void;
  onNotesChange: (v: string) => void;
  onShippingCostChange: (v: number) => void;
  onCheckout: () => void;
  onOpenSupplies: () => void;
};

export function SaleOptionsPanel({
  customers, accounts, hasSupplies,
  customerId, accountId, notes, grandTotal, shippingCost, isCreating,
  onCustomerChange, onAccountChange, onNotesChange,
  onShippingCostChange, onCheckout, onOpenSupplies,
}: Props) {
  return (
    <Card>
      <CardContent className="pl-4 space-y-3 pt-4">

        {/* Cliente */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Cliente
            <span className="text-muted-foreground ml-1">(opcional)</span>
          </Label>
          <Select
            value={customerId?.toString() ?? "anonymous"}
            onValueChange={(v) => onCustomerChange(v === "anonymous" ? null : Number(v))}
          >
            <SelectTrigger className="h-8 text-sm w-full">
              <SelectValue placeholder="Venta anónima" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anonymous">Venta anónima</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cuenta destino */}
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
                <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Envío */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            Costo de envío
            <span className="text-muted-foreground ml-1">(opcional)</span>
          </Label>
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
            className="h-8 text-sm"
          />
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

        <Button className="w-full" onClick={onCheckout} disabled={isCreating}>
          {isCreating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</>
          ) : (
            `Confirmar venta · ${formatCurrency(grandTotal)}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}