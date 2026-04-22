// components/products/edit-product-variant-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Pencil, Trash2, Plus, DollarSign,
  Hash, ImageIcon, Tag, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUpdateVariant } from "@/hooks/swr/use-products";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/swr/use-currency";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { ProductVariant } from "@/types";
import { ProductImageUpload } from "./product-image-upload";

// ── Schema ─────────────────────────────────────────────────────────────

const schema = z.object({
  variant_name:   z.string().min(1, "El nombre de la variante es requerido"),
  sku:            z.string().min(1, "El SKU es requerido"),
  price_override: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(0, "El precio debe ser mayor o igual a 0").optional()
  ),
});

type FormData = z.infer<typeof schema>;

// ── Tipos ──────────────────────────────────────────────────────────────

type AttributePair = { key: string; value: string };

type Props = {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  productId:     number;
  productName:   string;
  basePrice:     number;
  baseSku?:      string;
  variantIndex?: number;
  variant:       ProductVariant | null;
  onSuccess:     () => void;
};

// ── Helper para eliminar imagen desde download URL ─────────────────────

async function deleteOldImage(imageUrl: string) {
  try {
    const path = decodeURIComponent(
      imageUrl.split("/o/")[1].split("?")[0]
    );
    await deleteObject(ref(storage, path));
  } catch {
    console.warn("No se pudo eliminar la imagen anterior de Storage");
  }
}

// ── Componente ─────────────────────────────────────────────────────────

export function EditProductVariantDialog({
  open, onOpenChange, productId, productName, basePrice, baseSku, variantIndex = 0, variant, onSuccess,
}: Props) {
  const { firebaseUser }              = useAuth();
  const { updateVariant, isUpdating } = useUpdateVariant(productId, variant?.id ?? null);
  const { symbol, format }            = useCurrency();

  const [imageFile,        setImageFile]        = useState<File | null>(null);
  const [imagePreview,     setImagePreview]      = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage]  = useState(false);
  const [attributes,       setAttributes]        = useState<AttributePair[]>([
    { key: "", value: "" },
  ]);

  const {
    register, handleSubmit, reset, watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const priceOverrideValue = watch("price_override");
  const hasCustomPrice     = priceOverrideValue !== undefined;

  // ── Poblar form cuando cambia la variante ──────────────────────────

  useEffect(() => {
    if (variant && open) {
      const autoSku = baseSku
        ? `${baseSku}-${String(variantIndex + 1).padStart(3, "0")}`
        : "";
      reset({
        variant_name:   variant.variant_name,
        sku:            variant.sku?.trim() || autoSku,
        price_override: variant.price_override ?? undefined,
      });
      setImagePreview(variant.image_url ?? null);
      setImageFile(null);

      if (variant.attributes && Object.keys(variant.attributes).length > 0) {
        setAttributes(
          Object.entries(variant.attributes).map(([key, value]) => ({ key, value }))
        );
      } else {
        setAttributes([{ key: "", value: "" }]);
      }
    }
  }, [variant, open, reset, baseSku, variantIndex]);

  // ── Atributos dinámicos ────────────────────────────────────────────

  const addAttribute = () => {
    setAttributes((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAttribute = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    setAttributes((prev) =>
      prev.map((attr, i) => (i === index ? { ...attr, [field]: value } : attr))
    );
  };

  // ── Imagen ─────────────────────────────────────────────────────────

  const uploadImage = async (file: File): Promise<string> => {
    const path       = `products/${firebaseUser!.uid}/variants/${Date.now()}.webp`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: "image/webp" });
    return getDownloadURL(storageRef);
  };

  // ── Submit ─────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    const filledAttrs = attributes.filter((a) => a.key.trim() || a.value.trim());
    const invalidAttr = filledAttrs.find((a) => !a.key.trim() || !a.value.trim());
    if (invalidAttr) {
      toast.error("Cada atributo debe tener nombre y valor");
      return;
    }

    try {
      let image_url: string | null | undefined = variant?.image_url;

      if (imageFile) {
        setIsUploadingImage(true);
        if (variant?.image_url) await deleteOldImage(variant.image_url);
        image_url = await uploadImage(imageFile);
        setIsUploadingImage(false);
      } else if (!imagePreview && variant?.image_url) {
        // Usuario quitó la imagen sin subir una nueva
        await deleteOldImage(variant.image_url);
        image_url = null;
      }

      const attributesObj: Record<string, string> | null =
        filledAttrs.length > 0
          ? Object.fromEntries(filledAttrs.map((a) => [a.key.trim(), a.value.trim()]))
          : null;

      await updateVariant({
        variant_name:   data.variant_name.trim(),
        sku:            data.sku.trim(),
        price_override: data.price_override !== undefined ? data.price_override : null,
        attributes:     attributesObj,
        image_url,
      });

      toast.success("Variante actualizada exitosamente");
      handleClose();
      onSuccess();
    } catch (error: any) {
      setIsUploadingImage(false);
      toast.error(error.message || "Error al actualizar la variante");
    }
  };

  const handleClose = () => {
    setImageFile(null);
    setIsUploadingImage(false);
    onOpenChange(false);
  };

  const isLoading   = isUpdating || isUploadingImage;
  const submitLabel = isUploadingImage ? "Subiendo imagen..."
                    : isUpdating       ? "Guardando..."
                    : "Guardar cambios";

  if (!variant) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className={cn(
          "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0",
          "w-full max-w-full rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0",
          "max-h-[92dvh] flex flex-col p-0",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-md lg:max-w-xl xl:max-w-xl",
          "sm:rounded-2xl sm:border sm:max-h-[88vh]",
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
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Layers className="h-4 w-4 text-primary" />
            Editar variante
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {productName} · precio base {format(basePrice)}
          </p>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          <form id="edit-variant-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            <div className="space-y-2">
              <FieldLabel icon={<ImageIcon className="h-3.5 w-3.5" />} label="Imagen" optional />
              <ProductImageUpload
                disabled={isLoading}
                onChange={setImageFile}
                initialPreview={imagePreview}
                onRemove={() => setImagePreview(null)}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel icon={<Tag className="h-3.5 w-3.5" />} label="Nombre" required />
              <Input
                {...register("variant_name")}
                placeholder="Ej: Talla M / Color Rojo / 500g"
                disabled={isLoading}
                className="h-11 text-base"
              />
              {errors.variant_name && (
                <p className="text-xs text-destructive">{errors.variant_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <FieldLabel icon={<Hash className="h-3.5 w-3.5" />} label="SKU" required />
              <Input
                {...register("sku")}
                placeholder="Ej: CAM-NEG-M"
                disabled={isLoading}
                className="h-11 text-base font-mono"
              />
              {errors.sku && (
                <p className="text-xs text-destructive">{errors.sku.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <FieldLabel
                icon={<DollarSign className="h-3.5 w-3.5" />}
                label="Precio especial"
                optional
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                  {symbol}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={`Dejar vacío para usar ${format(basePrice)}`}
                  {...register("price_override")}
                  disabled={isLoading}
                  className="h-11 pl-8 text-base"
                />
              </div>
              {hasCustomPrice && (
                <p className="text-xs text-muted-foreground">
                  Esta variante se venderá a{" "}
                  <span className="font-medium text-foreground font-mono">
                    {format(Number(priceOverrideValue))}
                  </span>{" "}
                  en lugar del precio base.
                </p>
              )}
              {errors.price_override && (
                <p className="text-xs text-destructive">{errors.price_override.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel
                  icon={<Tag className="h-3.5 w-3.5" />}
                  label="Atributos"
                  optional
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addAttribute}
                  disabled={isLoading || attributes.length >= 8}
                  className="h-7 text-xs gap-1 text-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  Agregar
                </Button>
              </div>

              <div className="space-y-2">
                {attributes.map((attr, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={attr.key}
                      onChange={(e) => updateAttribute(index, "key", e.target.value)}
                      placeholder="Ej: Color"
                      disabled={isLoading}
                      className="h-10 text-sm flex-1"
                    />
                    <Input
                      value={attr.value}
                      onChange={(e) => updateAttribute(index, "value", e.target.value)}
                      placeholder="Ej: Rojo"
                      disabled={isLoading}
                      className="h-10 text-sm flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttribute(index)}
                      disabled={isLoading || attributes.length === 1}
                      className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Ej: Color → Rojo, Talla → M, Material → Algodón
              </p>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t bg-transparent xl:bg-transparent md:bg-transparent sm:bg-background flex gap-3">
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
            form="edit-variant-form"
            disabled={isLoading}
            className="flex-1 h-11 gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {submitLabel}
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── FieldLabel ──────────────────────────────────────────────────────────

function FieldLabel({ icon, label, required, optional }: {
  icon?:     React.ReactNode;
  label:     string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <Label className="text-sm font-medium">{label}</Label>
      {required && <span className="text-destructive text-xs">*</span>}
      {optional && <span className="text-muted-foreground text-xs">opcional</span>}
    </div>
  );
}