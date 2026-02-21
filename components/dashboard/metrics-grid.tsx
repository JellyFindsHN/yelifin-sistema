// components/dashboard/metrics-grid.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Users, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 0 }).format(v);

function ChangeIndicator({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-muted-foreground text-xs">sin datos anteriores</span>;
  const isUp = value >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-green-600" : "text-destructive"}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}% vs anterior
    </span>
  );
}

type Props = { metrics: any; isLoading: boolean };

export function MetricsGrid({ metrics: m, isLoading }: Props) {
  const stats = [
    {
      title: "Ingresos",
      value: m ? formatCurrency(Number(m.revenue ?? 0)) : null,
      sub:   <ChangeIndicator value={m?.revenue_change ?? null} />,
      icon:  DollarSign,
    },
    {
      title: "Ganancia neta",
      value: m ? formatCurrency(Number(m.profit ?? 0)) : null,
      sub:   <ChangeIndicator value={m?.profit_change ?? null} />,
      icon:  TrendingUp,
      valueClass: "text-green-600",
    },
    {
      title: "Clientes",
      value: m ? Number(m.customers_total ?? 0) : null,
      sub:   <span className="text-xs text-muted-foreground">+{Number(m?.customers_new ?? 0)} nuevos</span>,
      icon:  Users,
    },
    {
      title: "Balance",
      value: m ? formatCurrency(Number(m.balance ?? 0)) : null,
      sub:   <span className="text-xs text-muted-foreground">todas las cuentas</span>,
      icon:  Wallet,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="pl-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
            <div className={`text-lg font-bold lg:text-xl ${(stat as any).valueClass ?? ""}`}>
              {isLoading ? <Skeleton className="h-6 w-20" /> : stat.value}
            </div>
            <div className="mt-0.5 hidden sm:block">
              {isLoading ? <Skeleton className="h-3 w-24" /> : stat.sub}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}