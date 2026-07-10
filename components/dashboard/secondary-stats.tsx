// components/dashboard/secondary-stats.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Package, DollarSign } from "lucide-react";
import { useCurrency } from "@/hooks/swr/use-currency";
type Props = { metrics: any; isLoading: boolean; showCosts?: boolean };

export function SecondaryStats({ metrics: m, isLoading, showCosts = true }: Props) {
  const { format: formatCurrency } = useCurrency();
  const allStats = [
    { label: "Órdenes del período", value: Number(m?.sales_count ?? 0),                                      icon: ShoppingCart },
    { label: "Unidades en stock",   value: Number(m?.inventory?.total_units ?? 0),                           icon: Package },
    { label: "Valor inventario",    value: m ? formatCurrency(Number(m?.inventory?.total_value ?? 0)) : "—", icon: DollarSign, hiddenWhenNoCosts: true },
  ];
  const stats = allStats.filter((s) => !(s as any).hiddenWhenNoCosts || showCosts);

  return (
    <div className={`hidden lg:grid gap-3 ${stats.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <s.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold truncate">
                {isLoading ? <Skeleton className="h-6 w-16" /> : s.value}
              </div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}