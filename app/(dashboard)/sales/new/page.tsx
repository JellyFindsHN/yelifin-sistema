// app/(dashboard)/sales/new/page.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // ⭐ NEW
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  AlertTriangle,
  X,
  ChevronRight,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { useProducts } from "@/hooks/swr/use-products";
import { useCreateSale, CartItem } from "@/hooks/swr/use-sales";
import { useAccounts } from "@/hooks/swr/use-accounts";
import { useCustomers } from "@/hooks/swr/use-costumers";
import { useSupplies } from "@/hooks/swr/use-supplies";
import { useEvents } from "@/hooks/swr/use-events";  

import { PosProductGrid } from "@/components/sales/pos/product-grid";
import { CartPanel, DiscountType } from "@/components/sales/pos/cart-panel";
import { SaleOptionsPanel } from "@/components/sales/pos/sale-options-panel";
import {
  SuppliesUsedModal,
  SupplyUsed,
} from "@/components/sales/pos/supplies-used-modal";
import { MobileCartSheet } from "@/components/sales/pos/mobile-cart-sheet";

// Deriva el método de pago del tipo de cuenta
const ACCOUNT_TYPE_TO_PAYMENT: Record<string, string> = {
  CASH: "CASH",
  BANK: "TRANSFER",
  WALLET: "TRANSFER",
  OTHER: "OTHER",
};

export default function NewSalePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const eventIdParam = searchParams.get("event_id");
  const eventId = eventIdParam ? Number(eventIdParam) : null;

  const backHref = eventId ? "/events" : "/sales";

  const { products } = useProducts();
  const { createSale, isCreating } = useCreateSale();
  const { accounts } = useAccounts();
  const { customers } = useCustomers();
  const { supplies } = useSupplies();
  const { mutate: mutateEvents }   = useEvents();    


  // ── Estado principal ───────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [suppliesOpen, setSuppliesOpen] = useState(false);
  const [suppliesUsed, setSuppliesUsed] = useState<SupplyUsed[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // ── Desktop: paso 1 = productos | paso 2 = detalle de venta ───────
  const [desktopStep, setDesktopStep] = useState<1 | 2>(1);

  // ── Confirmación de salida ─────────────────────────────────────────
  const [exitDialog, setExitDialog] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const hasCart = cart.length > 0;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasCart) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasCart]);

  const safeNavigate = useCallback(
    (href: string) => {
      if (!hasCart) {
        router.push(href);
        return;
      }
      setPendingHref(href);
      setExitDialog(true);
    },
    [hasCart, router]
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
            (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false))
      ),
    [products, search]
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
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
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
          i.product_id === id ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  const removeFromCart = (id: number) =>
    setCart((prev) => prev.filter((i) => i.product_id !== id));
  const updateItemPrice = (id: number, v: number) =>
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === id ? { ...i, unit_price: v } : i
      )
    );
  const updateDiscount = (id: number, v: number) =>
    setCart((prev) =>
      prev.map((i) => (i.product_id === id ? { ...i, discount: v } : i))
    );

  // ── Cuenta → método de pago derivado en checkout ─────────────────
  const handleAccountChange = (id: number) => setAccountId(id);

  // ── Suministros inline ─────────────────────────────────────────────
  const updateSupplyQty = (id: number, qty: number) =>
    setSuppliesUsed((prev) =>
      prev.map((s) => (s.supply_id === id ? { ...s, quantity: qty } : s))
    );
  const removeSupply = (id: number) =>
    setSuppliesUsed((prev) => prev.filter((s) => s.supply_id !== id));

  // ── Cálculos ───────────────────────────────────────────────────────
  const subtotal = cart.reduce(
    (acc, i) => acc + i.unit_price * i.quantity,
    0
  );
  const itemDiscounts = cart.reduce((acc, i) => acc + i.discount, 0);
  const appliedGlobal =
    discountType === "global" ? subtotal * (globalDiscount / 100) : 0;
  const appliedPerItem = discountType === "per_item" ? itemDiscounts : 0;
  const totalDiscount = appliedGlobal + appliedPerItem;
  const total = subtotal - totalDiscount;
  const grandTotal = total + shippingCost;

  // ── Checkout ───────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error("El carrito está vacío");
    if (!accountId) return toast.error("Selecciona una cuenta de destino");

    const account = accounts.find(
      (a) => Number(a.id) === Number(accountId)
    );
    const paymentMethod =
      ACCOUNT_TYPE_TO_PAYMENT[account?.type ?? "OTHER"] ?? "OTHER";

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
        shipping_cost: shippingCost > 0 ? shippingCost : undefined,
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
        ...(eventId && { event_id: eventId }), // 
      });

       if (eventId) {
        await mutateEvents();
      }

      toast.success(`Venta ${result.data.sale_number} registrada`);
      setCart([]);
      router.push(backHref);
    } catch (err: any) {
      toast.error(err.message || "Error al registrar la venta");
    }
  };

  // ── Props agrupados ────────────────────────────────────────────────
  const cartProps = {
    cart,
    discountType,
    globalDiscount,
    subtotal,
    totalDiscount,
    total,
    shippingCost,
    suppliesUsed,
    onQuantity: updateQuantity,
    onRemove: removeFromCart,
    onPriceChange: updateItemPrice,
    onDiscountChange: updateDiscount,
    onDiscountTypeChange: setDiscountType,
    onGlobalDiscountChange: setGlobalDiscount,
    onSupplyQtyChange: updateSupplyQty,
    onSupplyRemove: removeSupply,
  };

  const optionsProps = {
    customers,
    accounts,
    hasSupplies,
    customerId,
    accountId,
    notes,
    grandTotal,
    shippingCost,
    isCreating,
    onCustomerChange: setCustomerId,
    onAccountChange: handleAccountChange,
    onNotesChange: setNotes,
    onShippingCostChange: setShippingCost,
    onCheckout: handleCheckout,
    onOpenSupplies: () => setSuppliesOpen(true),
  };

  // ── Buscador ───────────────────────────────────────────────────────
  const SearchBar = () => (
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
  );

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════
          LAYOUT MÓVIL
      ════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden fixed inset-0 top-16 flex flex-col bg-background">
        {/* Header + buscador fijos */}
        <div className="shrink-0 px-4 pt-3 pb-3 space-y-3 bg-background z-10 border-b">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => safeNavigate(backHref)} // ⭐ NEW
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight flex-1">
              Nueva Venta
            </h1>
            {cart.length > 0 && (
              <Badge variant="secondary" className="shrink-0">
                {cart.reduce((acc, i) => acc + i.quantity, 0)} uds
              </Badge>
            )}
          </div>
          <SearchBar />
        </div>

        {/* Solo productos, scroll independiente */}
        <div
          className="flex-1 overflow-y-auto px-4 pt-3 pb-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          <PosProductGrid
            products={availableProducts}
            cart={cart}
            onAdd={addToCart}
            search={search}
          />
        </div>

        {/* Sheet del carrito */}
        <MobileCartSheet
          open={cartOpen}
          onOpenChange={setCartOpen}
          cart={cart}
          total={grandTotal}
          cartProps={cartProps}
          optionsProps={optionsProps}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════
          LAYOUT DESKTOP — 2 pasos
      ════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col h-[calc(100vh-4rem)] pb-4">
        {/* Header desktop */}
        <div className="shrink-0 flex items-center gap-3 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => safeNavigate(backHref)} // ⭐ NEW
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Nueva Venta</h1>
            <p className="text-muted-foreground text-sm">
              {cart.length} producto{cart.length !== 1 ? "s" : ""}
              {suppliesUsed.length > 0 &&
                ` · ${suppliesUsed.length} suministro${
                  suppliesUsed.length !== 1 ? "s" : ""
                }`}
              {shippingCost > 0 && " · envío incluido"}
            </p>
          </div>

          {/* Indicador de pasos */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setDesktopStep(1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                desktopStep === 1
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Productos
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => cart.length > 0 && setDesktopStep(2)}
              disabled={cart.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                cart.length === 0
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : desktopStep === 2
                  ? "bg-primary text-primary-foreground cursor-pointer"
                  : "text-muted-foreground hover:bg-muted cursor-pointer"
              }`}
            >
              Detalle
            </button>
          </div>
        </div>

        {/* ── Paso 1: Productos ── */}
        {desktopStep === 1 && (
          <div className="flex-1 min-h-0 grid grid-cols-5 gap-4">
            {/* Productos scrolleables */}
            <div className="col-span-3 flex flex-col min-h-0 gap-3">
              <SearchBar />
              <div
                className="flex-1 overflow-y-auto"
                style={{ scrollbarWidth: "none" } as React.CSSProperties}
              >
                <PosProductGrid
                  products={availableProducts}
                  cart={cart}
                  onAdd={addToCart}
                  search={search}
                />
              </div>
            </div>

            {/* Panel derecho: carrito */}
            <div
              className="col-span-2 flex flex-col min-h-0 gap-3 overflow-y-auto"
              style={{ scrollbarWidth: "none" } as React.CSSProperties}
            >
              <CartPanel {...cartProps} />
              {cart.length > 0 && (
                <Button
                  className="w-full gap-2"
                  onClick={() => setDesktopStep(2)}
                >
                  Continuar al detalle
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Paso 2: Detalle de venta ── */}
        {desktopStep === 2 && (
          <div className="flex-1 min-h-0 grid grid-cols-5 gap-4">
            {/* Izquierda: carrito editable */}
            <div
              className="col-span-3 flex flex-col min-h-0 gap-3 overflow-y-auto"
              style={{ scrollbarWidth: "none" } as React.CSSProperties}
            >
              <CartPanel {...cartProps} />
            </div>

            {/* Derecha: opciones de la venta */}
            <div
              className="col-span-2 flex flex-col min-h-0 gap-3 overflow-y-auto"
              style={{ scrollbarWidth: "none" } as React.CSSProperties}
            >
              <SaleOptionsPanel {...optionsProps} />
            </div>
          </div>
        )}
      </div>

      {/* Modal suministros */}
      <SuppliesUsedModal
        open={suppliesOpen}
        onOpenChange={setSuppliesOpen}
        onConfirm={setSuppliesUsed}
        initialSupplies={suppliesUsed}
      />

      {/* ── Modal confirmación de salida ── */}
      {exitDialog && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={cancelExit}
        >
          <div
            className="bg-background rounded-2xl w-full sm:max-w-sm shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <h2 className="text-base font-semibold">¿Salir de la venta?</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tenés{" "}
                <span className="font-semibold text-foreground">
                  {cart.length} producto{cart.length !== 1 ? "s" : ""}
                </span>{" "}
                en el carrito. Si salís ahora, se perderán los datos de la
                venta en proceso.
              </p>
            </div>
            <div className="flex flex-col gap-2 px-6 pb-6">
              <button
                onClick={confirmExit}
                className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors cursor-pointer"
              >
                Sí, salir
              </button>
              <button
                onClick={cancelExit}
                className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                Seguir en la venta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}