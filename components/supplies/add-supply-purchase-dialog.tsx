// components/supplies/add-supply-purchase-dialog.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShoppingBag, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateSupplyPurchase, Supply } from "@/hooks/swr/use-supplies";
import { useAccounts } from "@/hooks/swr/use-accounts";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 0,
  }).format(v);

type Props = {
  supply: Supply | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function AddSupplyPurchaseDialog({
  supply,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { createSupplyPurchase, isCreating } = useCreateSupplyPurchase();
  const { accounts } = useAccounts();

  const [accountId, setAccountId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().split("T")[0]
  );

  const qty = Number(quantity) || 0;
  const cost = Number(unitCost) || 0;
  const total = qty * cost;

  useEffect(() => {
    if (open && supply) {
      setAccountId("");
      setQuantity("1");
      setUnitCost(supply.unit_cost > 0 ? String(supply.unit_cost) : "");
      setPurchasedAt(new Date().toISOString().split("T")[0]);
    }
  }, [open, supply]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const onSubmit = async () => {
    if (!supply) return;
    if (!accountId) return toast.error("Selecciona una cuenta");
    if (qty <= 0) return toast.error("La cantidad debe ser mayor a 0");
    if (cost < 0) return toast.error("El costo no puede ser negativo");

    try {
      await createSupplyPurchase({
        account_id: Number(accountId),
        purchased_at: purchasedAt,
        items: [{ supply_id: supply.id, quantity: qty, unit_cost: cost }],
      });

      toast.success(`${qty} ${supply.unit ?? "uds"} de ${supply.name} agregados`);
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar la compra");
    }
  };

  if (!supply) return null;

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
          "duration-300"
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={handleClose}
      >
        {/* Handle móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <DialogHeader className="shrink-0 px-5 pt-2 pb-3 sm:pt-5 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Registrar compra
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{supply.name}</p>
        </DialogHeader>

        {/* Body */}
        <div
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
              value={accountId}
              onValueChange={setAccountId}
              disabled={isCreating}
            >
              <SelectTrigger className="w-full h-11 text-left">
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
          </div>

          <Separator />

          {/* Cantidad + costo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-sm font-medium">
                Cantidad ({supply.unit ?? "uds"}){" "}
                <span className="text-destructive text-xs">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isCreating}
                className="h-11 text-base"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit_cost" className="text-sm font-medium">
                Costo unitario (L)
              </Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                disabled={isCreating}
                className="h-11 text-base"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Total */}
          {qty > 0 && cost > 0 && (
            <div className="bg-muted/40 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total a descontar
              </span>
              <span className="font-bold text-primary">
                {formatCurrency(total)}
              </span>
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label htmlFor="purchased_at" className="text-sm font-medium">
              Fecha de compra
            </Label>
            <Input
              id="purchased_at"
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
              disabled={isCreating}
              className="h-11 text-base"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Footer fijo */}
        <div className="shrink-0 px-5 py-4 border-t bg-transparent xl:bg-transparent md:bg-transparent sm:bg-background flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={onSubmit}
            disabled={isCreating}
            className="flex-1 h-11 gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              "Registrar compra"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}