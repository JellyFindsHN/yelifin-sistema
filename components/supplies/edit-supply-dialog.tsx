// components/supplies/edit-supply-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
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

  const handleClose = () => {
    onOpenChange(false);
  };

  const onSubmit = async (data: FormData) => {
    try {
      await updateSupply(data);
      toast.success("Suministro actualizado");
      handleClose();
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar");
    }
  };

  if (!supply) return null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(v) => !v && handleClose()}
      title="Editar suministro"
      width="wide"
      as="form"
      formProps={{ id: "edit-supply-form", onSubmit: handleSubmit(onSubmit), autoComplete: "off" }}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUpdating}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            form="edit-supply-form"
            disabled={isUpdating}
            className="flex-1 h-11 gap-2"
          >
            {isUpdating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar"
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
              {...register("name")}
              disabled={isUpdating}
              className="h-11 text-base"
              autoComplete="off"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Unidad</Label>
              <Input
                {...register("unit")}
                disabled={isUpdating}
                className="h-11 text-base"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Stock mínimo</Label>
              <Input
                type="number"
                min="0"
                {...register("min_stock")}
                disabled={isUpdating}
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