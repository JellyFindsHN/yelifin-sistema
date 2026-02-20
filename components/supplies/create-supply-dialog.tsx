"use client";

import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateSupply } from "@/hooks/swr/use-supplies";

const UNIT_OPTIONS = [
  { value: "unit", label: "Unidad (unit)" },
  { value: "pack", label: "Paquete (pack)" },
  { value: "box", label: "Caja (box)" },
  { value: "kg", label: "Kilogramo (kg)" },
  { value: "g", label: "Gramo (g)" },
  { value: "lb", label: "Libra (lb)" },
  { value: "l", label: "Litro (L)" },
  { value: "ml", label: "Mililitro (ml)" },
  { value: "m", label: "Metro (m)" },
  { value: "cm", label: "Centímetro (cm)" },
];

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  unit: z.string().min(1, "La unidad es requerida"),
  stock: z.coerce.number().min(0, "Stock inválido").optional(),
  min_stock: z.coerce.number().min(0, "Stock mínimo inválido").optional(),
  unit_cost: z.coerce.number().min(0, "Costo inválido").optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateSupplyDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { createSupply, isCreating } = useCreateSupply();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      unit: "unit",
      stock: undefined,
      min_stock: undefined,
      unit_cost: undefined,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Normalizamos vacíos a 0 para el backend
      const payload = {
        ...data,
        stock: Number(data.stock ?? 0),
        min_stock: Number(data.min_stock ?? 0),
        unit_cost: Number(data.unit_cost ?? 0),
      };

      await createSupply(payload);
      toast.success("Suministro creado");
      reset({ unit: "unit", stock: undefined, min_stock: undefined, unit_cost: undefined, name: "" });
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Error al crear suministro");
    }
  };

  const handleClose = () => {
    reset({ unit: "unit", stock: undefined, min_stock: undefined, unit_cost: undefined, name: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nuevo suministro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              placeholder="Ej: Bolsas de manila"
              {...register("name")}
              disabled={isCreating}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unidad *</Label>

              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isCreating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              {errors.unit && (
                <p className="text-sm text-destructive">{errors.unit.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Costo unitario (L)</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="Ej: 1.50"
                {...register("unit_cost")}
                disabled={isCreating}
              />
              {errors.unit_cost && (
                <p className="text-sm text-destructive">{errors.unit_cost.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Stock inicial</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ej: 20"
                {...register("stock")}
                disabled={isCreating}
              />
              {errors.stock && (
                <p className="text-sm text-destructive">{errors.stock.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Stock mínimo</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ej: 10"
                {...register("min_stock")}
                disabled={isCreating}
              />
              {errors.min_stock && (
                <p className="text-sm text-destructive">{errors.min_stock.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
