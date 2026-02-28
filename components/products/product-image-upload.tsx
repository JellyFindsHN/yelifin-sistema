// components/products/product-image-upload.tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

// ── Tipos ──────────────────────────────────────────────────────────────
type Props = {
  disabled?: boolean;
  onChange:  (file: File | null) => void;
};

// ── Componente ─────────────────────────────────────────────────────────
export function ProductImageUpload({ disabled, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }

    // Convertir a WebP antes de guardar
    try {
      const webpBlob = await convertToWebP(file);
      const webpFile = new File([webpBlob], file.name.replace(/\.[^.]+$/, ".webp"), {
        type: "image/webp",
      });
      const objectUrl = URL.createObjectURL(webpFile);
      setPreview(objectUrl);
      onChange(webpFile);
    } catch {
      toast.error("Error al procesar la imagen");
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className={cn(
        "relative w-full aspect-video rounded-xl border-2 border-dashed transition-colors overflow-hidden",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        preview
          ? "border-transparent"
          : "border-muted-foreground/20 hover:border-primary/40 bg-muted/20",
      )}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      {preview ? (
        <>
          <Image src={preview} alt="Preview" fill className="object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 shadow hover:bg-background transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
            WebP
          </span>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-4">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">Toca para subir imagen</p>
          <p className="text-xs text-center opacity-70">
            PNG, JPG, WebP · máx 5MB · se convierte a WebP
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelect}
        disabled={disabled}
      />
    </div>
  );
}

export { convertToWebP };