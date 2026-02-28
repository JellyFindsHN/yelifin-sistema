// components/dashboard/sales-charts.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useCurrency } from "@/hooks/swr/use-currency";
function formatAxisMoney(v: number) {
  if (v >= 1_000_000) return `L${Math.round(v / 1_000_000)}M`;
  if (v >= 1_000)     return `L${Math.round(v / 1_000)}k`;
  return `L${v}`;
}

const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

type Props = {
  salesChart:     any[];
  paymentMethods: any[];
  periodLabel:    string;
  isLoading:      boolean;
};

export function SalesCharts({ salesChart, paymentMethods, periodLabel, isLoading }: Props) {
  const { format: formatCurrency } = useCurrency();
  
  return (
    <div className="hidden lg:grid gap-4 grid-cols-7">
      <Card className="col-span-4">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">Ventas vs Ganancias</CardTitle>
          <CardDescription>{periodLabel}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatAxisMoney} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={false} name="Ventas" />
                <Line type="monotone" dataKey="profit"  stroke="#10B981" strokeWidth={2} dot={false} name="Ganancia" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-3">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">Métodos de pago</CardTitle>
          <CardDescription>Distribución del período</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? <Skeleton className="h-64 w-full" /> : !paymentMethods.length ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={paymentMethods} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                  paddingAngle={5} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentMethods.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}