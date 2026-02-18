// components/products/create-product-dialog.tsx
"use client";

import { useState, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateProduct } from "@/hooks/swr/use-products";
import { useAuth } from "@/hooks/use-auth";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from "next/image";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

// ── Convierte cualquier imagen a WebP ─────────────────────────────────
async function convertToWebP(file: File, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // Máximo 1200px manteniendo proporción
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          blob ? resolve(blob) : reject(new Error("Error al convertir imagen"));
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Error al cargar imagen"));
    };

    img.src = url;
  });
}

export function CreateProductDialog({ open, onOpenChange, onSuccess }: Props) {
  const { firebaseUser } = useAuth();
  const { createProduct, isCreating } = useCreateProduct();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Sugerencia de SKU basada en el nombre
  const nameValue = watch("name");
  const suggestedSku = nameValue
    ? nameValue
        .split(" ")
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 4) + "-001"
    : "";

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string> => {
    const webpBlob = await convertToWebP(file);
    const path = `products/${firebaseUser!.uid}/${Date.now()}.webp`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, webpBlob, { contentType: "image/webp" });
    return getDownloadURL(storageRef);
  };

  const onSubmit = async (data: FormData) => {
    try {
      let image_url: string | null = null;

      if (imageFile) {
        setIsUploadingImage(true);
        image_url = await uploadImage(imageFile);
        setIsUploadingImage(false);
      }

      await createProduct({ ...data, image_url });

      toast.success("Producto creado exitosamente");
      reset();
      handleRemoveImage();
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      setIsUploadingImage(false);
      toast.error(error.message || "Error al crear el producto");
    }
  };

  const handleClose = () => {
    reset();
    handleRemoveImage();
    onOpenChange(false);
  };

  const isLoading = isCreating || isUploadingImage;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-130 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Imagen */}
          <div className="space-y-2">
            <Label>Imagen del producto</Label>
            <div
              className="relative w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden bg-muted/20"
              onClick={() => !isLoading && fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1.5 hover:bg-background transition-colors shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute bottom-2 right-2">
                    <span className="text-xs bg-background/80 px-2 py-0.5 rounded-full text-muted-foreground">
                      WebP
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground py-6">
                  <Upload className="h-8 w-8" />
                  <p className="text-sm font-medium">Haz clic para subir una imagen</p>
                  <p className="text-xs">PNG, JPG, WebP hasta 5MB · Se convierte a WebP automáticamente</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              disabled={isLoading}
            />
          </div>

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              placeholder="Nombre del producto"
              {...register("name")}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descripción
              <span className="text-xs text-muted-foreground ml-2">opcional</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe el producto brevemente..."
              rows={2}
              {...register("description")}
              disabled={isLoading}
            />
          </div>

          {/* SKU */}
          <div className="space-y-2">
            <Label htmlFor="sku">
              SKU
              <span className="text-xs text-muted-foreground ml-2">opcional</span>
            </Label>
            <Input
              id="sku"
              placeholder={suggestedSku || "PRO-001"}
              {...register("sku")}
              disabled={isLoading}
            />
            {suggestedSku && (
              <p className="text-xs text-muted-foreground">
                Sugerido:{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    const input = document.getElementById("sku") as HTMLInputElement;
                    if (input) input.value = suggestedSku;
                  }}
                >
                  {suggestedSku}
                </button>
              </p>
            )}
          </div>

          {/* Precio */}
          <div className="space-y-2">
            <Label htmlFor="price">Precio de venta (L) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("price")}
              disabled={isLoading}
            />
            {errors.price && (
              <p className="text-sm text-destructive">{errors.price.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploadingImage ? "Subiendo imagen..." : "Creando..."}
                </>
              ) : (
                "Crear producto"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}