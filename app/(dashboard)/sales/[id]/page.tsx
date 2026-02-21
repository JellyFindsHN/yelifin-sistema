// app/(dashboard)/sales/[id]/page.tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Receipt,
  User,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  HelpCircle,
  Package,
  TrendingUp,
  Tag,
  Building2,
} from "lucide-react";
import Image from "next/image";
import { useSale } from "@/hooks/swr/use-sales";
import Link from "next/link";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("es-HN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

type Props = { params: Promise<{ id: string }> };

export default function SaleDetailPage({ params }: Props) {
  const { id } = use(params);
  const { sale, isLoading } = useSale(Number(id));
  const router = useRouter();

  if (isLoading) return <SaleDetailSkeleton />;

  if (!sale)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Receipt className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Venta no encontrada</p>
        <Button variant="outline" asChild>
          <Link href="/sales">Volver a ventas</Link>
        </Button>
      </div>
    );

  const totalCost = sale.items.reduce(
    (acc, i) => acc + Number(i.unit_cost) * i.quantity,
    0
  );
  const totalProfit = Number(sale.total) - totalCost;
  const margin =
    Number(sale.total) > 0 ? (totalProfit / Number(sale.total)) * 100 : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight font-mono">
            {sale.sale_number}
          </h1>
         <p className="text-muted-foreground text-sm">
            {new Date(sale.sold_at).toLocaleDateString("es-HN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Info general */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cliente */}
        <Card>
          <CardContent className="pl-3 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium text-sm truncate">
                {sale.customer_name ?? "Anónimo"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cuenta */}
        <Card>
          <CardContent className="pl-3 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Cuenta</p>
              <p className="font-medium text-sm truncate">
                {sale.account_name ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pl-3.5 text-center">
            <p className="text-xs text-muted-foreground">Total venta</p>
            <p className="text-lg md:text-xl font-bold mt-0.5">
              {formatCurrency(Number(sale.total))}
            </p>
          </CardContent>
        </Card>
      
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pl-3.5 text-center">
            <p className="text-xs text-muted-foreground">Ganancia neta</p>
            <p className="text-lg md:text-xl font-bold mt-0.5 text-green-600">
              {formatCurrency(totalProfit)}
            </p>
            <p className="text-xs text-green-600">
              {margin.toFixed(1)}% margen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Productos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos vendidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {sale.items.map((item) => {
            const itemCost = Number(item.unit_cost) * item.quantity;
            const itemProfit = Number(item.line_total) - itemCost;
            const itemMargin =
              Number(item.line_total) > 0
                ? (itemProfit / Number(item.line_total)) * 100
                : 0;

            return (
              <div key={item.id} className="flex gap-3 p-3 rounded-lg border">
                {/* Imagen */}
                <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.product_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    <span>
                      {item.quantity} ×{" "}
                      {formatCurrency(Number(item.unit_price))}
                    </span>
                    <span>
                      Costo: {formatCurrency(Number(item.unit_cost))}/u
                    </span>
                  </div>
                </div>

                {/* Totales por item */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">
                    {formatCurrency(Number(item.line_total))}
                  </p>
                  <p className="text-xs text-green-600 font-medium">
                    +{formatCurrency(itemProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {itemMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Desglose de totales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Desglose
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(Number(sale.subtotal))}</span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento</span>
              <span>-{formatCurrency(Number(sale.discount))}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatCurrency(Number(sale.total))}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Costo de venta</span>
            <span>-{formatCurrency(totalCost)}</span>
          </div>
          <div className="flex justify-between font-bold text-green-600">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Ganancia neta
            </span>
            <span>{formatCurrency(totalProfit)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notas */}
      {sale.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Notas</p>
            <p className="text-sm">{sale.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SaleDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
    </div>
  );
}
