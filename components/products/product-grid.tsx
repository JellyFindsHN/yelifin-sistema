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
          <Package className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium">No se encontraron productos</p>
          <p className="text-sm text-muted-foreground">
            Intenta con otros filtros o crea un nuevo producto
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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