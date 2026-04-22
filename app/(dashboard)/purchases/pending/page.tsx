// app/(dashboard)/purchases/pending/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Clock, PackageCheck, Package,
  Wallet, CalendarDays, StickyNote, Truck,
} from "lucide-react";

import { usePurchases, Purchase } from "@/hooks/swr/use-purchases";
import { useAccounts }            from "@/hooks/swr/use-accounts";
import { useInventory }           from "@/hooks/swr/use-inventory";
import { useCurrency }            from "@/hooks/swr/use-currency";
import { ConfirmPurchaseArrivalDialog } from "@/components/products/confirm-purchase-arrival-dialog";

export default function PendingPurchasesPage() {
  const router = useRouter();
  const { purchases, isLoading, mutate: mutatePurchases } = usePurchases();
  const { mutate: mutateInventory } = useInventory();
  const { accounts, mutate: mutateAccounts } = useAccounts();
  const { format } = useCurrency();

  const [selected, setSelected] = useState<Purchase | null>(null);

  const pending = purchases.filter((p) => p.status === "PENDING");

  const handleSuccess = () => {
    mutatePurchases();
    mutateInventory();
    mutateAccounts();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Compras pendientes</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading
              ? "Cargando..."
              : pending.length === 0
                ? "Sin compras pendientes"
                : `${pending.length} compra${pending.length !== 1 ? "s" : ""} esperando llegada de mercancía`
            }
          </p>
        </div>
        {!isLoading && pending.length > 0 && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 shrink-0">
            {pending.length} pendiente{pending.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && pending.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <PackageCheck className="h-7 w-7 opacity-40" />
          </div>
          <p className="text-sm">No hay compras pendientes de llegada</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/inventory")}>
            Ir a inventario
          </Button>
        </div>
      )}

      {/* Lista */}
      {!isLoading && pending.map((p) => (
        <PurchaseCard
          key={p.id}
          purchase={p}
          format={format}
          onConfirm={() => setSelected(p)}
        />
      ))}

      {/* Dialog de confirmación */}
      <ConfirmPurchaseArrivalDialog
        purchase={selected}
        accounts={accounts}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

// ── Tarjeta de compra pendiente ────────────────────────────────────────

function PurchaseCard({
  purchase: p,
  format,
  onConfirm,
}: {
  purchase: Purchase;
  format: (v: number) => string;
  onConfirm: () => void;
}) {
  const date = new Date(p.purchased_at).toLocaleDateString("es-HN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <Card className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-800/30">
      <CardContent className="p-4 space-y-3">

        {/* Fila superior */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">
                {p.items_count} producto{p.items_count !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">Pendiente de llegada</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-bold">{format(Number(p.total))}</p>
            <p className="text-xs text-muted-foreground">{p.currency}</p>
          </div>
        </div>

        {/* Detalles */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span>{date}</span>
          </div>
          {p.account_name && (
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.account_name}</span>
            </div>
          )}
          {Number(p.shipping) > 0 && (
            <div className="flex items-center gap-1.5">
              <Truck className="h-3 w-3 shrink-0" />
              <span>Envío: {format(Number(p.shipping))}</span>
            </div>
          )}
          {p.notes && (
            <div className="flex items-center gap-1.5 col-span-2">
              <StickyNote className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.notes}</span>
            </div>
          )}
        </div>

        {/* Aviso */}
        <div className="rounded-lg bg-amber-100/60 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          El dinero ya fue debitado de la cuenta. Al confirmar la llegada, el stock se acreditará al inventario.
        </div>

        {/* Acción */}
        <Button
          className="w-full gap-2"
          onClick={onConfirm}
        >
          <PackageCheck className="h-4 w-4" />
          Confirmar llegada
        </Button>
      </CardContent>
    </Card>
  );
}
