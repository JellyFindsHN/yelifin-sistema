// app/(dashboard)/sales/new/page.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useProducts } from "@/hooks/swr/use-products";
import { useCreateSale, CartItem } from "@/hooks/swr/use-sales";
import { useAccounts } from "@/hooks/swr/use-accounts";
import { useCustomers } from "@/hooks/swr/use-costumers";
import { useSupplies } from "@/hooks/swr/use-supplies";

import { PosProductGrid } from "@/components/sales/pos/product-grid";
import { CartPanel, DiscountType } from "@/components/sales/pos/cart-panel";
import { SaleOptionsPanel } from "@/components/sales/pos/sale-options-panel";
import {
  SuppliesUsedModal,
  SupplyUsed,
} from "@/components/sales/pos/supplies-used-modal";
import { MobileCartSheet } from "@/components/sales/pos/mobile-cart-sheet";

export default function NewSalePage() {
  const router = useRouter();
  const { products } = useProducts();
  const { createSale, isCreating } = useCreateSale();
  const { accounts } = useAccounts();
  const { customers } = useCustomers();
  const { supplies } = useSupplies();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [suppliesOpen, setSuppliesOpen] = useState(false);
  const [suppliesUsed, setSuppliesUsed] = useState<SupplyUsed[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // ── Confirmación de salida ─────────────────────────────────────────
  const [exitDialog, setExitDialog] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const hasCart = cart.length > 0;

  // Intercepta recarga / cierre de pestaña
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasCart) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasCart]);

  // Navegación programática con confirmación
  const safeNavigate = useCallback(
    (href: string) => {
      if (!hasCart) {
        router.push(href);
        return;
      }
      setPendingHref(href);
      setExitDialog(true);
    },
    [hasCart, router],
  );

  const confirmExit = () => {
    setExitDialog(false);
    if (pendingHref) router.push(pendingHref);
  };

  const cancelExit = () => {
    setExitDialog(false);
    setPendingHref(null);
  };

  const hasSupplies = supplies.length > 0;

  const availableProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          (p.stock ?? 0) > 0 &&
          (p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false)),
      ),
    [products, search],
  );

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= (product.stock ?? 0)) {
          toast.error(`Stock máximo: ${product.stock} unidades`);
          return prev;
        }
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          image_url: product.image_url,
          quantity: 1,
          unit_price: product.price,
          discount: 0,
        },
      ];
    });
  };

  const updateQuantity = (id: number, delta: number) =>
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_id === id ? { ...i, quantity: i.quantity + delta } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  const removeFromCart = (id: number) =>
    setCart((prev) => prev.filter((i) => i.product_id !== id));
  const updateItemPrice = (id: number, v: number) =>
    setCart((prev) =>
      prev.map((i) => (i.product_id === id ? { ...i, unit_price: v } : i)),
    );
  const updateDiscount = (id: number, v: number) =>
    setCart((prev) =>
      prev.map((i) => (i.product_id === id ? { ...i, discount: v } : i)),
    );

  const subtotal = cart.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const itemDiscounts = cart.reduce((acc, i) => acc + i.discount, 0);
  const appliedGlobal =
    discountType === "global" ? subtotal * (globalDiscount / 100) : 0;
  const appliedPerItem = discountType === "per_item" ? itemDiscounts : 0;
  const totalDiscount = appliedGlobal + appliedPerItem;
  const total = subtotal - totalDiscount;

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
        discount: appliedGlobal,
        payment_method: paymentMethod as any,
        account_id: accountId,
        notes: notes || undefined,
        supplies_used:
          suppliesUsed.length > 0
            ? suppliesUsed.map((s) => ({
                supply_id: s.supply_id,
                quantity: s.quantity,
                unit_cost: s.unit_cost,
              }))
            : undefined,
      });
      toast.success(`Venta ${result.data.sale_number} registrada`);
      // Limpiar carrito antes de navegar para no disparar el dialog
      setCart([]);
      router.push("/sales");
    } catch (err: any) {
      toast.error(err.message || "Error al registrar la venta");
    }
  };

  const cartProps = {
    cart,
    discountType,
    globalDiscount,
    subtotal,
    totalDiscount,
    total,
    onQuantity: updateQuantity,
    onRemove: removeFromCart,
    onPriceChange: updateItemPrice,
    onDiscountChange: updateDiscount,
    onDiscountTypeChange: setDiscountType,
    onGlobalDiscountChange: setGlobalDiscount,
  };

  const optionsProps = {
    customers,
    accounts,
    hasSupplies,
    customerId,
    paymentMethod,
    accountId,
    notes,
    total,
    isCreating,
    onCustomerChange: setCustomerId,
    onPaymentMethodChange: setPaymentMethod,
    onAccountChange: setAccountId,
    onNotesChange: setNotes,
    onCheckout: handleCheckout,
    onOpenSupplies: () => setSuppliesOpen(true),
  };

  return (
    <>
      {/* ── Layout móvil ── */}
      <div className="lg:hidden fixed inset-0 top-16 flex flex-col bg-background">
        {/* Header fijo */}
        <div className="shrink-0 px-4 pt-3 pb-3 space-y-3 bg-background z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => safeNavigate("/sales")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight">Nueva Venta</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Productos */}
        <div className="flex-1 overflow-y-auto px-4 pb-20">
          <PosProductGrid
            products={availableProducts}
            cart={cart}
            onAdd={addToCart}
            search={search}
          />
        </div>

        <MobileCartSheet
          open={cartOpen}
          onOpenChange={setCartOpen}
          cart={cart}
          total={total}
          cartProps={cartProps}
          optionsProps={optionsProps}
        />
      </div>

      {/* ── Layout desktop ── */}
      <div className="hidden lg:block space-y-4 pb-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => safeNavigate("/sales")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nueva Venta</h1>
            <p className="text-muted-foreground text-sm">
              POS · {cart.length} producto{cart.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
              <PosProductGrid
                products={availableProducts}
                cart={cart}
                onAdd={addToCart}
                search={search}
              />
            </div>
          </div>
          <div className="col-span-2 space-y-3">
            <CartPanel {...cartProps} />
            {cart.length > 0 && <SaleOptionsPanel {...optionsProps} />}
          </div>
        </div>
      </div>

      <SuppliesUsedModal
        open={suppliesOpen}
        onOpenChange={setSuppliesOpen}
        onConfirm={setSuppliesUsed}
        initialSupplies={suppliesUsed}
      />

      {/* ── Dialog confirmación de salida ── */}
      <Dialog open={exitDialog} onOpenChange={cancelExit}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <DialogTitle>¿Salir de la venta?</DialogTitle>
            </div>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Tienes{" "}
            <span className="font-semibold text-foreground">
              {cart.length} producto{cart.length !== 1 ? "s" : ""}
            </span>{" "}
            en el carrito. Si salís ahora, se perderán los datos de la venta en
            proceso.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelExit}>
              Seguir en la venta
            </Button>
            <Button variant="destructive" onClick={confirmExit}>
              Sí, salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
