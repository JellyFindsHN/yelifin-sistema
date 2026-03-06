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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
            Editar suministro
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form
          id="edit-supply-form"
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
        </form>

        {/* Footer fijo */}
        <div className="shrink-0 px-5 py-4 border-t bg-transparent xl:bg-transparent md:bg-transparent sm:bg-background flex gap-3">
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
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}