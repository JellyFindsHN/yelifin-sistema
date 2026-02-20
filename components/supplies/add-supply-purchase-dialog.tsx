// components/supplies/add-supply-purchase-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Supply, useCreateSupplyPurchase } from "@/hooks/swr/use-supplies";

const schema = z.object({
  quantity: z.coerce.number().min(1, "La cantidad debe ser mayor a 0"),
  unit_cost: z.coerce.number().min(0, "Costo inválido"),
  purchased_at: z.string().optional(), // YYYY-MM-DD
});

type FormData = z.infer<typeof schema>;

export function AddSupplyPurchaseDialog({
  supply,
  open,
  onOpenChange,
  onSuccess,
}: {
  supply: Supply | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { createSupplyPurchase, isCreating } = useCreateSupplyPurchase();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, unit_cost: 0 },
  });

  useEffect(() => {
    if (supply && open) {
      reset({ quantity: 1, unit_cost: Number(supply.unit_cost ?? 0) });
    }
  }, [supply, open, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (!supply) return;

      // Si viene "YYYY-MM-DD", lo convertimos a ISO con hora 00:00
      const purchased_at =
        data.purchased_at?.trim()
          ? new Date(`${data.purchased_at}T00:00:00`).toISOString()
          : new Date().toISOString();

      await createSupplyPurchase({
        purchased_at,
        items: [
          {
            supply_id: supply.id,
            quantity: Number(data.quantity),
            unit_cost: Number(data.unit_cost),
          },
        ],
      });

      toast.success("Compra registrada");
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Error al registrar compra");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Registrar compra</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground">
          Suministro: <span className="font-medium text-foreground">{supply?.name ?? "-"}</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cantidad *</Label>
              <Input type="number" min="1" {...register("quantity")} disabled={isCreating} />
              {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Costo unitario (L) *</Label>
              <Input type="number" step="0.0001" min="0" {...register("unit_cost")} disabled={isCreating} />
              {errors.unit_cost && <p className="text-sm text-destructive">{errors.unit_cost.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fecha (opcional)</Label>
            <Input type="date" {...register("purchased_at")} disabled={isCreating} />
            <p className="text-xs text-muted-foreground">
              Si no seleccionás fecha, se usa la fecha actual.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Registrar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
