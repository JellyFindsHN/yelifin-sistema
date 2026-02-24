// components/sales/pos/sale-options-panel.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Wallet, CreditCard, FlaskConical } from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 0 }).format(v);

type Props = {
  customers: any[];
  accounts: any[];
  hasSupplies: boolean;
  customerId: number | null;
  paymentMethod: string;
  accountId: number | null;
  notes: string;
  total: number;
  isCreating: boolean;
  onCustomerChange: (id: number | null) => void;
  onPaymentMethodChange: (v: string) => void;
  onAccountChange: (id: number) => void;
  onNotesChange: (v: string) => void;
  onCheckout: () => void;
  onOpenSupplies: () => void;
};

export function SaleOptionsPanel({
  customers, accounts, hasSupplies,
  customerId, paymentMethod, accountId, notes, total, isCreating,
  onCustomerChange, onPaymentMethodChange, onAccountChange, onNotesChange,
  onCheckout, onOpenSupplies,
}: Props) {
  return (
    <Card>
      <CardContent className="pl-4 space-y-3">

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

        {/* Método de pago */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Método de pago *
          </Label>
          <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
            <SelectTrigger className="h-8 text-sm w-full">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Efectivo</SelectItem>
              <SelectItem value="CARD">Tarjeta</SelectItem>
              <SelectItem value="TRANSFER">Transferencia</SelectItem>
              <SelectItem value="MIXED">Mixto</SelectItem>
              <SelectItem value="OTHER">Otro</SelectItem>
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
                <SelectItem key={a.id} value={a.id.toString()}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Suministros usados */}
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

        <Button
          className="w-full"
          onClick={onCheckout}
          disabled={isCreating}
        >
          {isCreating
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</>
            : `Confirmar venta · ${formatCurrency(total)}`
          }
        </Button>
      </CardContent>
    </Card>
  );
}