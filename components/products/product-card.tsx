// components/products/product-card.tsx
"use client";

import { Product } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Pencil, Trash2, PackagePlus } from "lucide-react";
import Image from "next/image";

type Props = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAddInventory: (product: Product) => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 0,
  }).format(value);

const getStockBadge = (stock: number = 0) => {
  if (stock > 10)
    return <Badge className="bg-green-100 text-green-700 border-green-200">{stock} uds</Badge>;
  if (stock >= 5)
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{stock} uds</Badge>;
  if (stock === 0)
    return <Badge variant="destructive">Sin stock</Badge>;
  return <Badge variant="destructive">{stock} uds</Badge>;
};

export function ProductCard({ product, onEdit, onDelete, onAddInventory }: Props) {
  return (
    <Card className="overflow-hidden flex flex-col">
      {/* Imagen */}
      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <Package className="h-16 w-16 text-muted-foreground/40" />
        )}
      </div>

      {/* Info */}
      <CardContent className="p-4 space-y-1.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{product.name}</p>
            {product.sku && (
              <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
            )}
          </div>
          {getStockBadge(product.stock)}
        </div>
        <p className="text-lg font-bold text-primary">
          {formatCurrency(product.price)}
        </p>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}
      </CardContent>

      {/* Footer con acciones */}
      <CardFooter className="p-3 pt-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => onAddInventory(product)}
        >
          <PackagePlus className="h-3.5 w-3.5" />
          Inventario
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => onEdit(product)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(product)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}