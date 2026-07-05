"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
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
      const payload = {
        ...data,
        stock: Number(data.stock ?? 0),
        min_stock: Number(data.min_stock ?? 0),
        unit_cost: Number(data.unit_cost ?? 0),
      };

      await createSupply(payload);
      toast.success("Suministro creado");
      reset({
        unit: "unit",
        stock: undefined,
        min_stock: undefined,
        unit_cost: undefined,
        name: "",
      });
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Error al crear suministro");
    }
  };

  const handleClose = () => {
    reset({
      unit: "unit",
      stock: undefined,
      min_stock: undefined,
      unit_cost: undefined,
      name: "",
    });
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(v) => !v && handleClose()}
      title="Nuevo suministro"
      width="wide"
      as="form"
      formProps={{ id: "create-supply-form", onSubmit: handleSubmit(onSubmit), autoComplete: "off" }}
      footer={
        <>
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
            type="submit"
            form="create-supply-form"
            disabled={isCreating}
            className="flex-1 h-11 gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creando…
              </>
            ) : (
              "Crear"
            )}
          </Button>
        </>
      }
    >
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Nombre <span className="text-destructive text-xs">*</span>
            </Label>
            <Input
              placeholder="Ej: Bolsas de manila"
              {...register("name")}
              disabled={isCreating}
              className="h-11 text-base"
              autoComplete="off"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Unidad <span className="text-destructive text-xs">*</span>
              </Label>

              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isCreating}
                  >
                    <SelectTrigger className="w-full h-11 text-left">
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
                <p className="text-xs text-destructive">{errors.unit.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Costo unitario (L)
              </Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="Ej: 1.50"
                {...register("unit_cost")}
                disabled={isCreating}
                className="h-11 text-base"
                autoComplete="off"
              />
              {errors.unit_cost && (
                <p className="text-xs text-destructive">
                  {errors.unit_cost.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Stock inicial</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ej: 20"
                {...register("stock")}
                disabled={isCreating}
                className="h-11 text-base"
                autoComplete="off"
              />
              {errors.stock && (
                <p className="text-xs text-destructive">{errors.stock.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Stock mínimo</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ej: 10"
                {...register("min_stock")}
                disabled={isCreating}
                className="h-11 text-base"
                autoComplete="off"
              />
              {errors.min_stock && (
                <p className="text-xs text-destructive">
                  {errors.min_stock.message}
                </p>
              )}
            </div>
          </div>
    </ResponsiveModal>
  );
}