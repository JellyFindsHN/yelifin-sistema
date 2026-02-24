// app/(dashboard)/products/batch/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, Trash2, Upload, X, Package,
  Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useCreateProduct } from "@/hooks/swr/use-products";
import { useAuth } from "@/hooks/use-auth";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ── Tipos ──────────────────────────────────────────────────────────────
type ProductStatus = "idle" | "uploading" | "saving" | "done" | "error";

type BatchProduct = {
  id: string;
  name: string;
  sku: string;
  price: string;
  imageFile: File | null;
  imagePreview: string | null;
  expanded: boolean;
  status: ProductStatus;
  errorMsg: string | null;
};

const emptyProduct = (): BatchProduct => ({
  id:           crypto.randomUUID(),
  name:         "",
  sku:          "",
  price:        "",
  imageFile:    null,
  imagePreview: null,
  expanded:     true,
  status:       "idle",
  errorMsg:     null,
});

// ── Helpers ────────────────────────────────────────────────────────────
async function convertToWebP(file: File, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => { URL.revokeObjectURL(url); blob ? resolve(blob) : reject(new Error("Error")); },
        "image/webp", quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Error al cargar")); };
    img.src = url;
  });
}

const formatCurrency = (v: string) => {
  const n = parseFloat(v);
  if (isNaN(n)) return "";
  return new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 0 }).format(n);
};

// ── Status badge ───────────────────────────────────────────────────────
function StatusBadge({ status, errorMsg }: { status: ProductStatus; errorMsg: string | null }) {
  if (status === "idle")      return null;
  if (status === "uploading") return <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" />Subiendo imagen</Badge>;
  if (status === "saving")    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" />Guardando</Badge>;
  if (status === "done")      return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Creado</Badge>;
  if (status === "error")     return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-2.5 w-2.5" />{errorMsg ?? "Error"}</Badge>;
  return null;
}

// ── Page ───────────────────────────────────────────────────────────────
export default function BatchProductsPage() {
  const router = useRouter();
  const { firebaseUser }              = useAuth();
  const { createProduct }             = useCreateProduct();
  const [products, setProducts]       = useState<BatchProduct[]>([emptyProduct()]);
  const [isSubmitting, setSubmitting] = useState(false);
  const fileRefs                      = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Helpers de estado ──────────────────────────────────────────────
  const update = (id: string, patch: Partial<BatchProduct>) =>
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));

  const addProduct = () =>
    setProducts((prev) => [...prev, emptyProduct()]);

  const removeProduct = (id: string) => {
    setProducts((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p?.imagePreview) URL.revokeObjectURL(p.imagePreview);
      return prev.filter((x) => x.id !== id);
    });
  };

  const toggleExpand = (id: string) =>
    update(id, { expanded: !products.find((p) => p.id === id)?.expanded });

  // ── Imagen ─────────────────────────────────────────────────────────
  const handleImageSelect = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Solo imágenes");
    if (file.size > 5 * 1024 * 1024) return toast.error("Máximo 5MB");
    const preview = URL.createObjectURL(file);
    update(id, { imageFile: file, imagePreview: preview });
  };

  const removeImage = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (p?.imagePreview) URL.revokeObjectURL(p.imagePreview);
    update(id, { imageFile: null, imagePreview: null });
    if (fileRefs.current[id]) fileRefs.current[id]!.value = "";
  };

  // ── Validación ─────────────────────────────────────────────────────
  const validate = (): boolean => {
    let ok = true;
    products.forEach((p) => {
      if (!p.name.trim()) {
        update(p.id, { errorMsg: "Nombre requerido" });
        ok = false;
      }
      if (!p.price || isNaN(parseFloat(p.price)) || parseFloat(p.price) < 0) {
        update(p.id, { errorMsg: "Precio inválido" });
        ok = false;
      }
    });
    return ok;
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return toast.error("Corrige los errores antes de continuar");
    setSubmitting(true);

    let successCount = 0;
    let errorCount   = 0;

    for (const p of products) {
      if (p.status === "done") continue;

      try {
        let image_url: string | null = null;

        if (p.imageFile) {
          update(p.id, { status: "uploading", errorMsg: null });
          const webpBlob   = await convertToWebP(p.imageFile);
          const path       = `products/${firebaseUser!.uid}/${Date.now()}.webp`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, webpBlob, { contentType: "image/webp" });
          image_url = await getDownloadURL(storageRef);
        }

        update(p.id, { status: "saving" });
        await createProduct({
          name:        p.name.trim(),
          sku:         p.sku.trim() || undefined,
          price:       parseFloat(p.price),
          image_url,
          description: undefined,
        });

        update(p.id, { status: "done", expanded: false });
        successCount++;

      } catch (err: any) {
        update(p.id, { status: "error", errorMsg: err.message ?? "Error" });
        errorCount++;
      }
    }

    setSubmitting(false);

    if (errorCount === 0) {
      toast.success(`${successCount} producto${successCount !== 1 ? "s" : ""} creado${successCount !== 1 ? "s" : ""}`);
      setTimeout(() => router.push("/products"), 800);
    } else {
      toast.error(`${errorCount} producto${errorCount !== 1 ? "s" : ""} con error`);
    }
  };

  const pendingCount = products.filter((p) => p.status !== "done").length;
  const doneCount    = products.filter((p) => p.status === "done").length;
  const allDone      = pendingCount === 0;

  return (
    <div className="space-y-4 pb-24">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Registro por lotes</h1>
          <p className="text-muted-foreground text-sm">
            {products.length} producto{products.length !== 1 ? "s" : ""}
            {doneCount > 0 && <span className="text-green-600 ml-1">· {doneCount} creado{doneCount !== 1 ? "s" : ""}</span>}
          </p>
        </div>
      </div>

      {/* Progreso si hay guardados */}
      {doneCount > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-green-500 h-full transition-all duration-500"
            style={{ width: `${(doneCount / products.length) * 100}%` }}
          />
        </div>
      )}

      {/* Lista de productos */}
      <div className="space-y-2.5">
        {products.map((p, index) => (
          <Card
            key={p.id}
            className={`overflow-hidden transition-colors ${
              p.status === "done"  ? "border-green-200 bg-green-50/30" :
              p.status === "error" ? "border-destructive/30" : ""
            }`}
          >
            {/* Header de la card */}
            <button
              className="w-full flex items-center gap-3 p-3 text-left cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => toggleExpand(p.id)}
            >
              {/* Thumbnail */}
              <div className="relative h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {p.imagePreview ? (
                  <Image src={p.imagePreview} alt="" fill className="object-cover" />
                ) : (
                  <Package className="h-4.5 w-4.5 text-muted-foreground/30" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {p.name.trim() || <span className="text-muted-foreground font-normal">Producto {index + 1}</span>}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {p.price && <span className="text-xs text-muted-foreground">{formatCurrency(p.price)}</span>}
                  <StatusBadge status={p.status} errorMsg={p.errorMsg} />
                </div>
              </div>

              {/* Acciones header */}
              <div className="flex items-center gap-1 shrink-0">
                {p.status !== "done" && products.length > 1 && (
                  <span
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); removeProduct(p.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                )}
                {p.expanded
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </button>

            {/* Formulario expandido */}
            {p.expanded && p.status !== "done" && (
              <CardContent className="px-3 pb-3 pt-0 space-y-3 border-t">

                {/* Imagen */}
                <div>
                  <Label className="text-xs mb-1.5 block">Imagen <span className="text-muted-foreground">(opcional)</span></Label>
                  {p.imagePreview ? (
                    <div className="relative h-32 rounded-lg overflow-hidden bg-muted">
                      <Image src={p.imagePreview} alt="" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(p.id)}
                        className="absolute top-2 right-2 bg-background/80 rounded-full p-1 shadow hover:bg-background transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="h-20 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
                      onClick={() => fileRefs.current[p.id]?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-xs">Subir imagen</span>
                    </div>
                  )}
                  <input
                    ref={(el) => { fileRefs.current[p.id] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageSelect(p.id, e)}
                  />
                </div>

                {/* Nombre */}
                <div>
                  <Label className="text-xs mb-1.5 block">Nombre *</Label>
                  <Input
                    value={p.name}
                    onChange={(e) => update(p.id, { name: e.target.value, errorMsg: null })}
                    placeholder="Ej: Camiseta negra talla M"
                    className={`h-9 text-sm ${p.errorMsg?.includes("Nombre") ? "border-destructive" : ""}`}
                    disabled={isSubmitting}
                  />
                  {p.errorMsg?.includes("Nombre") && (
                    <p className="text-xs text-destructive mt-1">{p.errorMsg}</p>
                  )}
                </div>

                {/* SKU + Precio en grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">SKU <span className="text-muted-foreground">(opcional)</span></Label>
                    <Input
                      value={p.sku}
                      onChange={(e) => update(p.id, { sku: e.target.value })}
                      placeholder="PRO-001"
                      className="h-9 text-sm font-mono"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Precio (L) *</Label>
                    <Input
                      type="number"
                      value={p.price}
                      onChange={(e) => update(p.id, { price: e.target.value, errorMsg: null })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={`h-9 text-sm ${p.errorMsg?.includes("Precio") ? "border-destructive" : ""}`}
                      disabled={isSubmitting}
                    />
                    {p.errorMsg?.includes("Precio") && (
                      <p className="text-xs text-destructive mt-1">{p.errorMsg}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Botón agregar */}
      {!allDone && (
        <button
          onClick={addProduct}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-muted-foreground/20 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Agregar otro producto
        </button>
      )}

      {/* Footer fijo */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t z-40">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Button variant="outline" asChild className="flex-1">
            <Link href="/products">Cancelar</Link>
          </Button>
          <Button
            className="flex-2 flex-grow-[2]"
            onClick={handleSubmit}
            disabled={isSubmitting || allDone || products.every((p) => p.status === "done")}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
            ) : (
              `Crear ${pendingCount} producto${pendingCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}