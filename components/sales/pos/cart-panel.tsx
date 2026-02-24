// components/sales/pos/cart-panel.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart } from "lucide-react";
import { CartItem } from "@/hooks/swr/use-sales";
import { CartItemRow } from "./cart-item-row";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 0 }).format(v);

export type DiscountType = "none" | "global" | "per_item";

type Props = {
  cart: CartItem[];
  discountType: DiscountType;
  globalDiscount: number;
  subtotal: number;
  totalDiscount: number;
  total: number;
  onQuantity: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onPriceChange: (id: number, value: number) => void;
  onDiscountChange: (id: number, value: number) => void;
  onDiscountTypeChange: (type: DiscountType) => void;
  onGlobalDiscountChange: (value: number) => void;
};

// Limpia el valor del input: evita el "0" inicial cuando se escribe
const cleanPercentInput = (raw: string): number => {
  const cleaned = raw.replace(/^0+(\d)/, "$1"); // quita ceros iniciales si hay dígito después
  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n)); // clamp 0–100
};

export function CartPanel({
  cart, discountType, globalDiscount, subtotal, totalDiscount, total,
  onQuantity, onRemove, onPriceChange, onDiscountChange,
  onDiscountTypeChange, onGlobalDiscountChange,
}: Props) {

  // El globalDiscount que llega es ya el porcentaje (0–100)
  // El monto real se calcula: subtotal * (pct / 100)
  const globalDiscountAmount = subtotal * (globalDiscount / 100);

  return (
    <Card>
      <CardHeader className="pl-4 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Carrito
          {cart.length > 0 && (
            <Badge variant="secondary" className="ml-auto">{cart.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pl-4 space-y-3">
        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Toca un producto para agregarlo
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
            {cart.map((item) => (
              <CartItemRow
                key={item.product_id}
                item={item}
                discountType={discountType}
                onQuantity={onQuantity}
                onRemove={onRemove}
                onPriceChange={onPriceChange}
                onDiscountChange={onDiscountChange}
              />
            ))}
          </div>
        )}

        {/* Tipo de descuento */}
        {cart.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 rounded-lg border overflow-hidden">
              {(["none", "global", "per_item"] as DiscountType[]).map((type, i) => (
                <button
                  key={type}
                  onClick={() => onDiscountTypeChange(type)}
                  className={`py-1.5 text-xs font-medium transition-colors ${i > 0 ? "border-l" : ""} ${
                    discountType === type
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {type === "none" ? "Sin desc." : type === "global" ? "Global" : "Por prod."}
                </button>
              ))}
            </div>

            {discountType === "global" && (
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    type="number"
                    value={globalDiscount === 0 ? "" : globalDiscount}
                    onChange={(e) => onGlobalDiscountChange(cleanPercentInput(e.target.value))}
                    placeholder="0"
                    min="0"
                    max="100"
                    className="h-8 text-sm pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    %
                  </span>
                </div>
                {globalDiscount > 0 && (
                  <p className="text-xs text-green-600 text-right">
                    -{formatCurrency(globalDiscountAmount)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Totales */}
        {cart.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  Descuento
                  {discountType === "global" && globalDiscount > 0 && (
                    <span className="ml-1 text-xs opacity-70">({globalDiscount}%)</span>
                  )}
                </span>
                <span>-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}