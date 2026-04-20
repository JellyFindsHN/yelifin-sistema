// components/products/confirm-purchase-arrival-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, PackageCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConfirmPurchaseArrival, Purchase } from "@/hooks/swr/use-purchases";
import { useCurrency } from "@/hooks/swr/use-currency";

type Props = {
  purchase:     Purchase | null;
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
};

export function ConfirmPurchaseArrivalDialog({
  purchase, open, onOpenChange, onSuccess,
}: Props) {
  const { confirmArrival, isConfirming } = useConfirmPurchaseArrival(purchase?.id ?? null);
  const { format, symbol }               = useCurrency();

  const [newShipping, setNewShipping] = useState("");

  useEffect(() => {
    if (open && purchase) {
      setNewShipping(Number(purchase.shipping) > 0 ? String(purchase.shipping) : "");
    }
  }, [open, purchase]);

  if (!purchase) return null;

  const originalShipping = Number(purchase.shipping);
  const parsedShipping   = newShipping === "" ? 0 : Math.max(0, Number(newShipping));
  const shippingDelta    = parsedShipping - originalShipping;
  const newTotal         = Number(purchase.total) + shippingDelta;
  const hasAdjustment    = shippingDelta !== 0;

  const handleConfirm = async () => {
    try {
      await confirmArrival(newShipping === "" ? 0 : parsedShipping);
      toast.success("Inventario registrado exitosamente");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al confirmar la llegada");
    }
  };

  const purchasedDate = new Date(purchase.purchased_at).toLocaleDateString("es-HN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent
        className={cn(
          "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0",
          "w-full max-w-full rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0",
          "max-h-[92dvh] flex flex-col p-0",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-md",
          "sm:rounded-2xl sm:border sm:max-h-[88vh]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-[48%]",
          "data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:slide-out-to-bottom-[48%]",
          "duration-300",
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <DialogHeader className="shrink-0 px-5 pt-2 pb-3 sm:pt-5 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <PackageCheck className="h-5 w-5 text-primary" />
            Confirmar llegada
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Compra del {purchasedDate} · {purchase.items_count} producto{purchase.items_count !== 1 ? "s" : ""}
          </p>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {/* Resumen original */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal productos</span>
              <span>{format(Number(purchase.subtotal) - originalShipping)}</span>
            </div>
            {originalShipping > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Envío original</span>
                <span>{format(originalShipping)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total pagado</span>
              <span>{format(Number(purchase.total))}</span>
            </div>
          </div>

          {/* Input de nuevo envío */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              Costo de envío real
              <span className="text-xs text-muted-foreground font-normal">
                {originalShipping > 0 ? `· original: ${format(originalShipping)}` : "· sin envío registrado"}
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
                value={newShipping}
                onChange={(e) => setNewShipping(e.target.value)}
                disabled={isConfirming}
                className="h-11 pl-8 text-base"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Dejá en 0 si no hubo envío. Se distribuye entre todas las unidades.
            </p>
          </div>

          {/* Ajuste financiero si el envío cambió */}
          {hasAdjustment && (
            <div className={cn(
              "rounded-xl border p-3.5 space-y-1.5 text-sm",
              shippingDelta > 0
                ? "border-red-200 bg-red-50/60 dark:bg-red-950/20"
                : "border-green-200 bg-green-50/60 dark:bg-green-950/20"
            )}>
              <div className="flex items-center gap-1.5 font-medium text-xs mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Ajuste financiero automático
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envío original</span>
                <span>{format(originalShipping)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envío real</span>
                <span>{format(parsedShipping)}</span>
              </div>
              <Separator />
              <div className={cn(
                "flex justify-between font-semibold",
                shippingDelta > 0 ? "text-red-700" : "text-green-700"
              )}>
                <span>{shippingDelta > 0 ? "Cargo adicional" : "Devolución"}</span>
                <span>{shippingDelta > 0 ? "-" : "+"}{format(Math.abs(shippingDelta))}</span>
              </div>
              <div className="flex justify-between font-bold pt-0.5">
                <span>Nuevo total</span>
                <span>{format(newTotal)}</span>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground leading-relaxed">
            Al confirmar, se acreditarán{" "}
            <span className="font-semibold text-foreground">
              {purchase.items_count} línea{purchase.items_count !== 1 ? "s" : ""} de stock
            </span>{" "}
            al inventario
            {hasAdjustment && (
              <>
                {" "}y se{" "}
                {shippingDelta > 0 ? "debitarán" : "acreditarán"}{" "}
                <span className="font-semibold text-foreground">
                  {format(Math.abs(shippingDelta))}
                </span>{" "}
                {shippingDelta > 0 ? "adicionales" : "de vuelta"} a la cuenta.
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 px-5 py-4 border-t bg-transparent sm:bg-background flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex-1 h-11 gap-2"
          >
            {isConfirming
              ? <><Loader2 className="h-4 w-4 animate-spin" />Registrando...</>
              : <><PackageCheck className="h-4 w-4" />Confirmar llegada</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
