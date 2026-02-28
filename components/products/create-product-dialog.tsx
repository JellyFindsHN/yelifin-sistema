// components/products/create-product-dialog.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, PackagePlus, DollarSign, Hash, FileText, ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useCreateProduct } from "@/hooks/swr/use-products";
import { useCreatePurchase } from "@/hooks/swr/use-purchases";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/swr/use-currency";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { ProductImageUpload } from "./product-image-upload";
import { InventorySection, InventorySectionValue } from "./inventory-section";

// ── Schema ─────────────────────────────────────────────────────────────
const schema = z.object({
  name:        z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  sku:         z.string().min(1, "El SKU es requerido"),
  price:       z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
};

// ── Componente ─────────────────────────────────────────────────────────
export function CreateProductDialog({ open, onOpenChange, onSuccess }: Props) {
  const { firebaseUser }                                   = useAuth();
  const { createProduct, isCreating }                      = useCreateProduct();
  const { createPurchase, isCreating: isCreatingPurchase } = useCreatePurchase();
  const { symbol }                                         = useCurrency();

  const [imageFile,        setImageFile]       = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [inventory,        setInventory]        = useState<InventorySectionValue>(null);

  const {
    register, handleSubmit, reset, watch,
    formState: { errors },
    setValue,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const nameValue    = watch("name");
  const suggestedSku = nameValue
    ? nameValue.split(" ").map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 4) + "-001"
    : "";

  // ── Upload imagen ──────────────────────────────────────────────────
  const uploadImage = async (file: File): Promise<string> => {
    const path       = `products/${firebaseUser!.uid}/${Date.now()}.webp`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: "image/webp" });
    return getDownloadURL(storageRef);
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    // Validar inventario si está activo
    if (inventory) {
      const qty = Number(inventory.data.quantity);
      if (!qty || qty < 1) { toast.error("La cantidad debe ser al menos 1"); return; }
    }
    if (inventory?.mode === "purchase" && !inventory.data.account_id) {
      toast.error("Selecciona una cuenta para la compra");
      return;
    }

    try {
      // 1. Subir imagen si hay
      let image_url: string | null = null;
      if (imageFile) {
        setIsUploadingImage(true);
        image_url = await uploadImage(imageFile);
        setIsUploadingImage(false);
      }

      // 2. Crear producto
      const result    = await createProduct({ ...data, image_url });
      const productId = result?.data?.id as number;
      if (!productId) throw new Error("No se obtuvo el ID del producto");

      // 3. Registrar inventario según modo
      if (inventory?.mode === "purchase") {
        const d = inventory.data;
        await createPurchase({
          account_id:    d.account_id!,
          currency:      d.currency,
          exchange_rate: d.exchange_rate,
          shipping:      d.shipping,
          notes:         d.notes || undefined,
          purchased_at:  new Date(d.purchased_at).toISOString(),
          items: [{
            product_id:    productId,
            quantity:      Number(d.quantity),
            unit_cost_usd: d.unit_cost,
          }],
        });
        toast.success("Producto e inventario registrados exitosamente");

      } else if (inventory?.mode === "existing") {
        const d = inventory.data;
        const token = await firebaseUser?.getIdToken();
        const res = await fetch("/api/inventory/existing", {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            product_id:   productId,
            quantity:     Number(d.quantity),
            unit_cost:    d.unit_cost || undefined,
            purchased_at: d.purchased_at || undefined,
            notes:        d.notes || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al registrar existencia inicial");
        }
        toast.success("Producto creado con existencia inicial");

      } else {
        toast.success("Producto creado exitosamente");
      }

      handleClose();
      onSuccess();

    } catch (error: any) {
      setIsUploadingImage(false);
      toast.error(error.message || "Error al crear el producto");
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────
  const handleClose = () => {
    reset();
    setImageFile(null);
    setInventory(null);
    setIsUploadingImage(false);
    onOpenChange(false);
  };

  const isLoading  = isCreating || isCreatingPurchase || isUploadingImage;
  const hasInv     = inventory !== null;
  const submitLabel = isUploadingImage      ? "Subiendo imagen..."
                    : isCreatingPurchase    ? "Registrando compra..."
                    : isCreating            ? "Creando producto..."
                    : hasInv                ? "Crear y registrar"
                    : "Crear producto";

  // ── Render ─────────────────────────────────────────────────────────
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
        onEscapeKeyDown={() => handleClose()}
      >
        {/* Handle móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <DialogHeader className="shrink-0 px-5 pt-2 pb-3 sm:pt-5 border-b">
          <DialogTitle className="text-lg font-bold">Nuevo producto</DialogTitle>
        </DialogHeader>

        {/* Scroll */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          <form id="create-product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Imagen */}
            <div className="space-y-2">
              <FieldLabel icon={<ImageIcon className="h-3.5 w-3.5" />} label="Imagen" optional />
              <ProductImageUpload disabled={isLoading} onChange={setImageFile} />
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <FieldLabel icon={<FileText className="h-3.5 w-3.5" />} label="Nombre" required />
              <Input
                {...register("name")}
                disabled={isLoading}
                className="h-11 text-base"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <FieldLabel icon={<Hash className="h-3.5 w-3.5" />} label="SKU" required />
              <Input
                id="sku-input"
                {...register("sku")}
                disabled={isLoading}
                className="h-11 text-base font-mono"
              />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
              {suggestedSku && (
                <p className="text-xs text-muted-foreground">
                  Sugerido:{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setValue("sku", suggestedSku)}
                  >
                    {suggestedSku}
                  </button>
                </p>
              )}
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
                  {...register("price")}
                  disabled={isLoading}
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

            {/* Inventario */}
            <InventorySection
              value={inventory}
              onChange={setInventory}
              disabled={isLoading}
            />

          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t bg-background flex gap-3">
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
            form="create-product-form"
            disabled={isLoading}
            className="flex-1 h-11 gap-2"
          >
            {isLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" />{submitLabel}</>
              : <><PackagePlus className="h-4 w-4" />{submitLabel}</>
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