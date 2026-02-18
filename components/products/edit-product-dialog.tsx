// components/products/edit-product-dialog.tsx
"use client";

import { useState, useRef, useEffect } from "react";
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
import { useUpdateProduct } from "@/hooks/swr/use-products";
import { useAuth } from "@/hooks/use-auth";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Product } from "@/types";
import Image from "next/image";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  price: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
});

type FormData = z.infer<typeof schema>;

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function EditProductDialog({ product, open, onOpenChange, onSuccess }: Props) {
  const { firebaseUser } = useAuth();
  const { updateProduct, isUpdating } = useUpdateProduct(product?.id ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Cargar datos del producto al abrir
  useEffect(() => {
    if (product && open) {
      reset({
        name: product.name,
        description: product.description ?? "",
        sku: product.sku ?? "",
        barcode: product.barcode ?? "",
        price: product.price,
      });
      setImagePreview(product.image_url ?? null);
      setImageFile(null);
    }
  }, [product, open, reset]);

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
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `products/${firebaseUser!.uid}/${Date.now()}.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const onSubmit = async (data: FormData) => {
    try {
      let image_url = product?.image_url;

      if (imageFile) {
        setIsUploadingImage(true);
        image_url = await uploadImage(imageFile);
        setIsUploadingImage(false);
      } else if (!imagePreview) {
        image_url = undefined; // imagen eliminada
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

  const isLoading = isUpdating || isUploadingImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-130">
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Imagen */}
          <div className="space-y-2">
            <Label>Imagen del producto</Label>
            <div
              className="relative w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <p className="text-sm">Haz clic para subir una imagen</p>
                  <p className="text-xs">PNG, JPG hasta 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" placeholder="Nombre del producto" {...register("name")} disabled={isLoading} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" placeholder="Descripción opcional" rows={2} {...register("description")} disabled={isLoading} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" placeholder="PRO-001" {...register("sku")} disabled={isLoading} />
              {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Código de barras</Label>
              <Input id="barcode" placeholder="123456789" {...register("barcode")} disabled={isLoading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio de venta (L) *</Label>
            <Input id="price" type="number" step="0.01" placeholder="0.00" {...register("price")} disabled={isLoading} />
            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isUploadingImage ? "Subiendo imagen..." : "Guardando..."}</>
              ) : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}