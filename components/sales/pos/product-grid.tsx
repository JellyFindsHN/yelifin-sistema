// components/sales/pos/product-grid.tsx
"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { CartItem } from "@/hooks/swr/use-sales";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 0 }).format(v);

type Props = {
  products: any[];
  cart: CartItem[];
  onAdd: (product: any) => void;
  search: string;
};

export function PosProductGrid({ products, cart, onAdd, search }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Package className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">
          {search ? "No se encontraron productos" : "No hay productos con stock"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {products.map((product) => {
        const inCart = cart.find((i) => i.product_id === product.id);
        return (
          <Card
            key={product.id}
            className="overflow-hidden cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
            onClick={() => onAdd(product)}
          >
            <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
              {product.image_url ? (
                <Image src={product.image_url} alt={product.name} fill className="object-cover" />
              ) : (
                <Package className="h-8 w-8 text-muted-foreground/20" />
              )}
              {inCart && (
                <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow">
                  {inCart.quantity}
                </div>
              )}
              <div className="absolute bottom-1.5 left-1.5">
                <Badge className="text-[10px] bg-background/90 text-foreground border px-1.5">
                  {product.stock} uds
                </Badge>
              </div>
            </div>
            <CardContent className="p-2.5">
              <p className="text-xs font-medium truncate leading-tight">{product.name}</p>
              <p className="text-sm font-bold text-primary mt-0.5">{formatCurrency(product.price)}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}