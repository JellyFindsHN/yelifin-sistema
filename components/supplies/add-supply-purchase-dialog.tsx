// components/supplies/add-supply-purchase-dialog.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShoppingBag, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useCreateSupplyPurchase, Supply } from "@/hooks/swr/use-supplies";
import { useAccounts } from "@/hooks/swr/use-accounts";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 0 }).format(v);

type Props = {
  supply: Supply | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function AddSupplyPurchaseDialog({ supply, open, onOpenChange, onSuccess }: Props) {
  const { createSupplyPurchase, isCreating } = useCreateSupplyPurchase();
  const { accounts } = useAccounts();

  const [accountId,   setAccountId]   = useState("");
  const [quantity,    setQuantity]    = useState("1");
  const [unitCost,    setUnitCost]    = useState("");
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().split("T")[0]);

  const qty   = Number(quantity)  || 0;
  const cost  = Number(unitCost)  || 0;
  const total = qty * cost;

  useEffect(() => {
    if (open && supply) {
      setAccountId("");
      setQuantity("1");
      setUnitCost(supply.unit_cost > 0 ? String(supply.unit_cost) : "");
      setPurchasedAt(new Date().toISOString().split("T")[0]);
    }
  }, [open, supply]);

  const onSubmit = async () => {
    if (!supply) return;
    if (!accountId)          return toast.error("Selecciona una cuenta");
    if (qty <= 0)            return toast.error("La cantidad debe ser mayor a 0");
    if (cost < 0)            return toast.error("El costo no puede ser negativo");

    try {
      await createSupplyPurchase({
        account_id:   Number(accountId),
        purchased_at: purchasedAt,
        items: [{ supply_id: supply.id, quantity: qty, unit_cost: cost }],
      });
      toast.success(`${qty} ${supply.unit ?? "uds"} de ${supply.name} agregados`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar la compra");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Registrar compra
          </DialogTitle>
          {supply && (
            <p className="text-sm text-muted-foreground">{supply.name}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">

          {/* Cuenta */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              Cuenta *
            </Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={isCreating}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    <span>{a.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                      {formatCurrency(Number(a.balance))}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Cantidad + Costo en 2 cols */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Cantidad ({supply?.unit ?? "uds"}) *
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Costo unitario (L)</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Total */}
          {qty > 0 && cost > 0 && (
            <div className="bg-muted/40 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total a descontar</span>
              <span className="font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="purchased_at">Fecha de compra</Label>
            <Input
              id="purchased_at"
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
              disabled={isCreating}
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isCreating}>
            {isCreating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registrando...</>
              : "Registrar compra"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}