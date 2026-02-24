// components/products/product-grid.tsx
"use client";

import { Product } from "@/types";
import { ProductCard } from "./product-card";
import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAddInventory: (product: Product) => void;
};

export function ProductGrid({ products, onEdit, onDelete, onAddInventory }: Props) {
  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Package className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm font-medium">No se encontraron productos</p>
          <p className="text-xs text-muted-foreground mt-1">
            Intenta con otros filtros o crea un nuevo producto
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddInventory={onAddInventory}
        />
      ))}
    </div>
  );
}