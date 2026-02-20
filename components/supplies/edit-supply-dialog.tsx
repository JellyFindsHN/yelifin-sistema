// components/supplies/edit-supply-dialog.tsx
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
import { Supply, useUpdateSupply } from "@/hooks/swr/use-supplies";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  unit: z.string().optional(),
  min_stock: z.coerce.number().min(0, "Stock mínimo inválido"),
});

type FormData = z.infer<typeof schema>;

export function EditSupplyDialog({
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
  const { updateSupply, isUpdating } = useUpdateSupply(supply?.id ?? null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { unit: "unit", min_stock: 0 },
  });

  useEffect(() => {
    if (supply && open) {
      reset({
        name: supply.name,
        unit: supply.unit ?? "unit",
        min_stock: supply.min_stock ?? 0,
      });
    }
  }, [supply, open, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      await updateSupply(data);
      toast.success("Suministro actualizado");
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar suministro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input {...register("name")} disabled={isUpdating} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input {...register("unit")} disabled={isUpdating} />
            </div>
            <div className="space-y-2">
              <Label>Stock mínimo</Label>
              <Input type="number" min="0" {...register("min_stock")} disabled={isUpdating} />
              {errors.min_stock && <p className="text-sm text-destructive">{errors.min_stock.message}</p>}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
