// app/(dashboard)/sales/new/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Loader2,
  ArrowLeft,
  Tag,
  User,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useProducts } from "@/hooks/swr/use-products";
import { useCreateSale, CartItem } from "@/hooks/swr/use-sales";
import { useAccounts } from "@/hooks/swr/use-accounts";
import { useCustomers } from "@/hooks/swr/use-costumers";
import Link from "next/link";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2,
  }).format(value);

type DiscountType = "none" | "global" | "per_item";

export default function NewSalePage() {
  const router = useRouter();
  const { products } = useProducts();
  const { createSale, isCreating } = useCreateSale();
  const { accounts } = useAccounts();
  const { customers } = useCustomers();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);

  // Productos con stock > 0
  const availableProducts = useMemo(() =>
    products.filter((p) =>
      (p.stock ?? 0) > 0 &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false))
    ), [products, search]
  );

  // ── Carrito ────────────────────────────────────────────────────────

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= (product.stock ?? 0)) {
          toast.error(`Stock máximo: ${product.stock} unidades`);
          return prev;
        }
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        image_url: product.image_url,
        quantity: 1,
        unit_price: product.price,
        discount: 0,
      }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_id === productId
            ? { ...i, quantity: i.quantity + delta }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const updateItemDiscount = (productId: number, value: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === productId ? { ...i, discount: value } : i
      )
    );
  };

  const updateItemPrice = (productId: number, value: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === productId ? { ...i, unit_price: value } : i
      )
    );
  };

  // ── Cálculos ───────────────────────────────────────────────────────

  const subtotal = cart.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const itemDiscounts = cart.reduce((acc, i) => acc + i.discount, 0);
  const appliedGlobalDiscount = discountType === "global" ? globalDiscount : 0;
  const appliedItemDiscounts = discountType === "per_item" ? itemDiscounts : 0;
  const totalDiscount = appliedGlobalDiscount + appliedItemDiscounts;
  const total = subtotal - totalDiscount;

  // ── Checkout ───────────────────────────────────────────────────────

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error("El carrito está vacío");
    if (!paymentMethod) return toast.error("Selecciona un método de pago");
    if (!accountId) return toast.error("Selecciona una cuenta de destino");

    try {
      const result = await createSale({
        customer_id: customerId,
        items: cart.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: discountType === "per_item" ? i.discount : 0,
        })),
        discount: appliedGlobalDiscount,
        payment_method: paymentMethod as any,
        account_id: accountId,
        notes: notes || undefined,
      });

      toast.success(`Venta ${result.data.sale_number} registrada`);
      router.push("/sales");

    } catch (error: any) {
      toast.error(error.message || "Error al registrar la venta");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sales"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva Venta</h1>
          <p className="text-muted-foreground text-sm">POS — Punto de venta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* ── Panel izquierdo: Productos ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar producto por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {availableProducts.length === 0 ? (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">
                  {search ? "No se encontraron productos" : "No hay productos con stock"}
                </p>
              </div>
            ) : (
              availableProducts.map((product) => {
                const inCart = cart.find((i) => i.product_id === product.id);
                return (
                  <Card
                    key={product.id}
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => addToCart(product)}
                  >
                    <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                      ) : (
                        <Package className="h-10 w-10 text-muted-foreground/30" />
                      )}
                      {inCart && (
                        <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {inCart.quantity}
                        </div>
                      )}
                      <div className="absolute bottom-1.5 right-1.5">
                        <Badge className="text-xs bg-background/80 text-foreground border">
                          {product.stock} uds
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-2.5">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-sm font-bold text-primary">{formatCurrency(product.price)}</p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* ── Panel derecho: Carrito ── */}
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Carrito
                {cart.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">{cart.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Agrega productos desde el panel izquierdo
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.product_id} className="space-y-1.5 p-2.5 rounded-lg border">
                      <div className="flex items-start gap-2">
                        <div className="relative h-9 w-9 rounded-md overflow-hidden bg-muted shrink-0">
                          {item.image_url ? (
                            <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
                          ) : (
                            <Package className="h-4 w-4 m-auto mt-2.5 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product_name}</p>
                          {/* Precio editable */}
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItemPrice(item.product_id, Number(e.target.value))}
                            className="h-6 text-xs px-1.5 w-24 mt-0.5"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive shrink-0"
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.product_id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.product_id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Descuento por item */}
                        {discountType === "per_item" && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            <Input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateItemDiscount(item.product_id, Number(e.target.value))}
                              className="h-6 text-xs px-1.5 w-20"
                              min="0"
                              placeholder="Desc. L"
                            />
                          </div>
                        )}

                        <span className="text-sm font-bold">
                          {formatCurrency((item.unit_price * item.quantity) - (discountType === "per_item" ? item.discount : 0))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tipo de descuento */}
              {cart.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    {(["none", "global", "per_item"] as DiscountType[]).map((type) => (
                      <Button
                        key={type}
                        variant={discountType === type ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs h-7"
                        onClick={() => setDiscountType(type)}
                      >
                        {type === "none" ? "Sin descuento" : type === "global" ? "Desc. global" : "Por producto"}
                      </Button>
                    ))}
                  </div>
                  {discountType === "global" && (
                    <Input
                      type="number"
                      value={globalDiscount}
                      onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                      placeholder="Descuento en L"
                      min="0"
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              )}

              {/* Totales */}
              {cart.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento</span>
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

          {/* Opciones de venta */}
          {cart.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">

                {/* Cliente */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Cliente
                    <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Select
                    value={customerId?.toString() ?? "anonymous"}
                    onValueChange={(v) => setCustomerId(v === "anonymous" ? null : Number(v))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Venta anónima" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anonymous">Venta anónima</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Método de pago */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Método de pago *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Efectivo</SelectItem>
                      <SelectItem value="CARD">Tarjeta</SelectItem>
                      <SelectItem value="TRANSFER">Transferencia</SelectItem>
                      <SelectItem value="MIXED">Mixto</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cuenta destino */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Cuenta de destino *</Label>
                  <Select
                    value={accountId?.toString() ?? ""}
                    onValueChange={(v) => setAccountId(Number(v))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Seleccionar cuenta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id.toString()}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notas */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Notas <span className="text-muted-foreground">(opcional)</span></Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones..."
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={isCreating || cart.length === 0}
                >
                  {isCreating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</>
                  ) : (
                    `Confirmar venta · ${formatCurrency(total)}`
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}