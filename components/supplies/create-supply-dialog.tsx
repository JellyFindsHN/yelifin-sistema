"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
          "duration-300",
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
          <DialogTitle className="text-lg font-bold">
            Nuevo suministro
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form
          id="create-supply-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
          autoComplete="off"
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
        </form>

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
            type="submit"
            form="create-supply-form"
            disabled={isCreating}
            className="flex-1 h-11 gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}