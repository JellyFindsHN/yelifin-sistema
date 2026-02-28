// components/products/edit-product-dialog.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X, Pencil, DollarSign, Hash, FileText, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUpdateProduct } from "@/hooks/swr/use-products";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/swr/use-currency";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Product } from "@/types";
import Image from "next/image";

const schema = z.object({
  name:        z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  sku:         z.string().optional(),
  price:       z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
});

type FormData = z.infer<typeof schema>;

type Props = {
  product:      Product | null;
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
};

// ── WebP converter ─────────────────────────────────────────────────────
async function convertToWebP(file: File, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else                { width  = Math.round((width  * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => { URL.revokeObjectURL(url); blob ? resolve(blob) : reject(new Error("Error al convertir")); },
        "image/webp", quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Error al cargar imagen")); };
    img.src = url;
  });
}

async function deleteOldImage(imageUrl: string) {
  try {
    await deleteObject(ref(storage, imageUrl));
  } catch {
    console.warn("No se pudo eliminar la imagen anterior de Storage");
  }
}

// ── Componente ─────────────────────────────────────────────────────────
export function EditProductDialog({ product, open, onOpenChange, onSuccess }: Props) {
  const { firebaseUser }              = useAuth();
  const { updateProduct, isUpdating } = useUpdateProduct(product?.id ?? null);
  const { symbol }                    = useCurrency();

  const [imageFile,        setImageFile]       = useState<File | null>(null);
  const [imagePreview,     setImagePreview]     = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (product && open) {
      reset({
        name:        product.name,
        description: product.description ?? "",
        sku:         product.sku ?? "",
        price:       product.price,
      });
      setImagePreview(product.image_url ?? null);
      setImageFile(null);
    }
  }, [product, open, reset]);

  // ── Imagen ─────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes"); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error("La imagen no puede superar 5MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string> => {
    const webpBlob   = await convertToWebP(file);
    const path       = `products/${firebaseUser!.uid}/${Date.now()}.webp`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, webpBlob, { contentType: "image/webp" });
    return getDownloadURL(storageRef);
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    try {
      let image_url: string | null | undefined = product?.image_url;

      if (imageFile) {
        setIsUploadingImage(true);
        if (product?.image_url) await deleteOldImage(product.image_url);
        image_url = await uploadImage(imageFile);
        setIsUploadingImage(false);
      } else if (!imagePreview && product?.image_url) {
        await deleteOldImage(product.image_url);
        image_url = null;
      }

      await updateProduct({ ...data, image_url });
      toast.success("Producto actualizado exitosamente");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      setIsUploadingImage(false);
      toast.error(error.message || "Error al actualizar el producto");
    }
  };

  const handleClose = () => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    onOpenChange(false);
  };

  const isLoading = isUpdating || isUploadingImage;

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
          "sm:w-full sm:max-w-lg sm:rounded-2xl sm:border",
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
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="h-4 w-4 text-primary" />
            Editar producto
          </DialogTitle>
        </DialogHeader>

        {/* Scroll */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          <form id="edit-product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Imagen */}
            <div className="space-y-2">
              <FieldLabel icon={<ImageIcon className="h-3.5 w-3.5" />} label="Imagen" optional />
              <div
                className={cn(
                  "relative w-full aspect-video rounded-xl border-2 border-dashed transition-colors overflow-hidden cursor-pointer",
                  imagePreview ? "border-transparent" : "border-muted-foreground/20 hover:border-primary/40 bg-muted/20",
                )}
                onClick={() => !isLoading && fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <>
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 shadow hover:bg-background transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">WebP</span>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-4">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium">Toca para subir imagen</p>
                    <p className="text-xs text-center opacity-70">PNG, JPG, WebP · máx 5MB · se convierte a WebP</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={handleImageSelect} disabled={isLoading}
              />
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <FieldLabel icon={<FileText className="h-3.5 w-3.5" />} label="Nombre" required />
              <Input {...register("name")} disabled={isLoading} className="h-11 text-base" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <FieldLabel icon={<Hash className="h-3.5 w-3.5" />} label="SKU" optional />
              <Input {...register("sku")} disabled={isLoading} className="h-11 text-base font-mono" />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>

            {/* Precio */}
            <div className="space-y-2">
              <FieldLabel icon={<DollarSign className="h-3.5 w-3.5" />} label="Precio de venta" required />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                  {symbol}
                </span>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  {...register("price")} disabled={isLoading}
                  className="h-11 pl-8 text-base"
                />
              </div>
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <FieldLabel icon={<FileText className="h-3.5 w-3.5" />} label="Descripción" optional />
              <Textarea
                placeholder="Describe el producto brevemente..."
                rows={2}
                {...register("description")}
                disabled={isLoading}
                className="resize-none text-base"
              />
            </div>

          </form>
        </div>

        {/* Footer fijo */}
        <div className="shrink-0 px-5 py-4 border-t bg-background flex gap-3">
          <Button
            type="button" variant="outline"
            onClick={handleClose} disabled={isLoading}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button
            type="submit" form="edit-product-form"
            disabled={isLoading} className="flex-1 h-11 gap-2"
          >
            {isLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" />{isUploadingImage ? "Subiendo..." : "Guardando..."}</>
              : <><Pencil className="h-4 w-4" />Guardar cambios</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── FieldLabel ─────────────────────────────────────────────────────────
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