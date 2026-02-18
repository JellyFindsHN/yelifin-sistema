// components/products/product-card.tsx
"use client";

import { Product } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";

type Props = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
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
  return <Badge variant="destructive">{stock} uds</Badge>;
};

export function ProductCard({ product, onEdit, onDelete }: Props) {
  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      {/* Imagen */}
      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Package className="h-16 w-16 text-muted-foreground/40" />
        )}

        {/* Acciones al hover */}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(product)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info */}
      <CardContent className="p-4 space-y-2">
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
    </Card>
  );
}