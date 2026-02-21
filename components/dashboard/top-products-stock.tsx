// components/dashboard/top-products-stock.tsx
"use client";

import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

type Props = { topProducts: any[]; lowStock: any[]; isLoading: boolean };

export function TopProductsStock({ topProducts, lowStock, isLoading }: Props) {
  return (
    <div className="hidden lg:grid grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">Top productos</CardTitle>
          <CardDescription>Por unidades vendidas en el período</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? <Skeleton className="h-56 w-full" /> : !topProducts.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin ventas en el período</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="units_sold" radius={[0, 4, 4, 0]} name="Unidades">
                  {topProducts.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Alertas de stock
          </CardTitle>
          <CardDescription>Productos con stock bajo</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
          ) : !lowStock.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin alertas de stock</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border">
                  <div className="relative h-8 w-8 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {p.image_url
                      ? <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                      : <Package className="h-4 w-4 text-muted-foreground/40" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.sku && <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>}
                  </div>
                  <Badge variant={Number(p.stock ?? 0) <= 5 ? "destructive" : "secondary"}>
                    {Number(p.stock ?? 0) === 0 ? "Agotado" : `${p.stock} uds`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}