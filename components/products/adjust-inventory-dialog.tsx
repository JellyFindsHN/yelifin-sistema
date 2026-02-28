// components/products/adjust-inventory-dialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Product } from "@/types";

type AdjustType = "in" | "out";

type Props = {
  product:      Product | null;
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
};

export function AdjustInventoryDialog({ product, open, onOpenChange, onSuccess }: Props) {
  const { firebaseUser } = useAuth();

  const [type,       setType]       = useState<AdjustType>("in");
  const [quantity,   setQuantity]   = useState<string>("1");
  const [notes,      setNotes]      = useState("");
  const [isLoading,  setIsLoading]  = useState(false);

  const handleClose = () => {
    setType("in");
    setQuantity("1");
    setNotes("");
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const qty = Number(quantity);
    if (!qty || qty < 1)  { toast.error("La cantidad debe ser al menos 1"); return; }
    if (!notes.trim())    { toast.error("El motivo del ajuste es requerido"); return; }

    try {
      setIsLoading(true);
      const token = await firebaseUser?.getIdToken();
      const res = await fetch("/api/inventory/adjust", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product_id: product!.id,
          type,
          quantity:   qty,
          notes:      notes.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al registrar el ajuste");
      }

      toast.success(type === "in"
        ? `+${qty} unidades agregadas al inventario`
        : `-${qty} unidades removidas del inventario`
      );
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar el ajuste");
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className={cn(
          "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0",
          "w-full max-w-full rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0",
          "max-h-[92dvh] flex flex-col p-0",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-md sm:rounded-2xl sm:border",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-[48%]",
          "data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:slide-out-to-bottom-[48%]",
          "duration-300",
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={() => handleClose()}
      >
        {/* Handle móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <DialogHeader className="shrink-0 px-5 pt-2 pb-3 sm:pt-5 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold">Ajuste de inventario</DialogTitle>
              <p className="text-sm text-muted-foreground truncate max-w-[260px]">{product.name}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div
            className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >

            {/* Tipo de ajuste */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de ajuste</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("in")}
                  disabled={isLoading}
                  className={cn(
                    "h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-colors",
                    type === "in"
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-xs font-medium">Agregar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("out")}
                  disabled={isLoading}
                  className={cn(
                    "h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-colors",
                    type === "out"
                      ? "border-destructive bg-destructive/5 text-destructive"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  <TrendingDown className="h-5 w-5" />
                  <span className="text-xs font-medium">Remover</span>
                </button>
              </div>
            </div>

            {/* Cantidad */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Cantidad <span className="text-destructive text-xs">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? "" : e.target.value)}
                className="h-11 text-base"
                disabled={isLoading}
              />
            </div>

            {/* Motivo — requerido */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Motivo <span className="text-destructive text-xs">*</span>
              </Label>
              <Input
                placeholder={type === "in"
                  ? "Ej: Corrección de conteo, devolución de cliente..."
                  : "Ej: Producto dañado, merma, corrección de conteo..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-11 text-base"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Este ajuste no genera ningún movimiento financiero.
              </p>
            </div>

          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-4 border-t bg-background flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 h-11"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                "flex-1 h-11 gap-2",
                type === "out" && "bg-destructive hover:bg-destructive/90",
              )}
            >
              {isLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
                : type === "in"
                  ? <><TrendingUp  className="h-4 w-4" />Agregar unidades</>
                  : <><TrendingDown className="h-4 w-4" />Remover unidades</>
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}