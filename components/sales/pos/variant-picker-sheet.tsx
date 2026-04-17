// components/sales/pos/variant-picker-sheet.tsx
"use client";

import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Box } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Product, ProductVariant } from "@/types";
import { VariantStock } from "@/hooks/swr/use-inventory";
import { useCurrency } from "@/hooks/swr/use-currency";

type Props = {
  open:            boolean;
  onOpenChange:    (v: boolean) => void;
  product:         Product | null;
  // Stock por variante — viene de useInventory si está disponible
  variantsStock?:  VariantStock[];
  // null = producto base, ProductVariant = variante específica
  onSelect:        (product: Product, variant: ProductVariant | null) => void;
};

export function VariantPickerSheet({
  open, onOpenChange, product, variantsStock = [], onSelect,
}: Props) {
  const { format } = useCurrency();

  if (!product) return null;

  // Stock del producto base
  const baseStock = variantsStock.length > 0
    ? null  // si hay datos de inventory, el base_stock viene del item padre
    : (product.stock ?? 0) - product.variants.reduce((acc, v) => {
        const vs = variantsStock.find((s) => s.variant_id === v.id);
        return acc + Number(vs?.stock ?? 0);
      }, 0);

  const getVariantStock = (variantId: number): number | null => {
    const vs = variantsStock.find((s) => s.variant_id === variantId);
    return vs ? Number(vs.stock) : null;
  };

  const handleSelect = (variant: ProductVariant | null) => {
    onSelect(product, variant);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[80dvh] flex flex-col p-0"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <SheetHeader className="shrink-0 px-5 pb-3 pt-1 border-b">
          <SheetTitle className="flex items-center gap-2 text-base font-bold">
            <Layers className="h-4 w-4 text-primary" />
            Seleccionar variante
          </SheetTitle>
          <p className="text-xs text-muted-foreground text-left">{product.name}</p>
        </SheetHeader>

        {/* Lista */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {/* Opción base */}
          <VariantOption
            image={product.image_url}
            name={`${product.name} (base)`}
            sku={product.sku}
            attributes={null}
            price={product.price}
            stock={baseStock}
            isBase
            onSelect={() => handleSelect(null)}
            format={format}
          />

          {/* Variantes */}
          {product.variants.map((variant) => {
            const stock = getVariantStock(variant.id);
            const price = variant.price_override != null
              ? Number(variant.price_override)
              : product.price;

            return (
              <VariantOption
                key={variant.id}
                image={variant.image_url ?? product.image_url}
                name={variant.variant_name}
                sku={variant.sku}
                attributes={variant.attributes}
                price={price}
                hasPriceOverride={variant.price_override != null && variant.price_override !== product.price}
                stock={stock}
                onSelect={() => handleSelect(variant)}
                format={format}
              />
            );
          })}
        </div>

        <div className="shrink-0 px-4 py-3 border-t">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── VariantOption ──────────────────────────────────────────────────────

type VariantOptionProps = {
  image:            string | null;
  name:             string;
  sku:              string | null | undefined;
  attributes:       Record<string, string> | null | undefined;
  price:            number;
  hasPriceOverride?: boolean;
  stock:            number | null;
  isBase?:          boolean;
  onSelect:         () => void;
  format:           (v: number) => string;
};

function VariantOption({
  image, name, sku, attributes, price,
  hasPriceOverride, stock, isBase, onSelect, format,
}: VariantOptionProps) {
  const outOfStock = stock !== null && stock === 0;

  return (
    <button
      type="button"
      onClick={outOfStock ? undefined : onSelect}
      disabled={outOfStock}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
        outOfStock
          ? "opacity-40 cursor-not-allowed bg-muted/30"
          : "hover:bg-muted/50 active:bg-muted cursor-pointer"
      )}
    >
      {/* Imagen */}
      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
        {image ? (
          <Image src={image} alt={name} fill className="object-cover" />
        ) : isBase ? (
          <Box className="h-5 w-5 text-muted-foreground/40" />
        ) : (
          <Layers className="h-5 w-5 text-muted-foreground/40" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {sku && (
          <p className="text-xs text-muted-foreground font-mono">{sku}</p>
        )}
        {attributes && Object.keys(attributes).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(attributes).map(([k, v]) => (
              <span
                key={k}
                className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md"
              >
                {k}: {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Precio + stock */}
      <div className="shrink-0 text-right space-y-1">
        <p className={cn(
          "text-sm font-bold",
          hasPriceOverride ? "text-primary" : "text-foreground"
        )}>
          {format(price)}
        </p>
        {stock !== null && (
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              stock === 0
                ? "bg-red-100 text-red-700 border-red-200"
                : stock < 5
                ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                : "bg-green-100 text-green-700 border-green-200"
            )}
          >
            {stock === 0 ? "Agotado" : `${stock} uds`}
          </Badge>
        )}
      </div>
    </button>
  );
}