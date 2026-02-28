// components/dashboard/recent-sales-table.tsx
"use client";

import { useRouter } from "next/navigation";
import { useCurrency } from "@/hooks/swr/use-currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, CreditCard, ArrowLeftRight, HelpCircle } from "lucide-react";

const formatDateFull = (d: string) =>
  new Date(d).toLocaleDateString("es-HN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const paymentLabel: Record<string, { label: string; icon: any }> = {
  CASH:     { label: "Efectivo",      icon: Banknote },
  CARD:     { label: "Tarjeta",       icon: CreditCard },
  TRANSFER: { label: "Transferencia", icon: ArrowLeftRight },
  MIXED:    { label: "Mixto",         icon: HelpCircle },
  OTHER:    { label: "Otro",          icon: HelpCircle },
};

type Props = { recentSales: any[]; isLoading: boolean };

export function RecentSalesTable({ recentSales, isLoading }: Props) {
  const router = useRouter();
  const { format: formatCurrency } = useCurrency();

  return (
    <Card className="hidden lg:block">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base">Últimas ventas</CardTitle>
        <CardDescription>Las 5 más recientes del período</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Ganancia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !recentSales.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Sin ventas en este período
                </TableCell>
              </TableRow>
            ) : (
              recentSales.map((sale: any) => {
                const pay     = paymentLabel[sale.payment_method] ?? paymentLabel.OTHER;
                const PayIcon = pay.icon;
                return (
                  <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/sales/${sale.id}`)}>
                    <TableCell className="font-mono font-medium">{sale.sale_number}</TableCell>
                    <TableCell>{sale.customer_name ?? <span className="text-muted-foreground">Anónimo</span>}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <PayIcon className="h-3 w-3" />{pay.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateFull(sale.sold_at)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(sale.total))}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{formatCurrency(Number(sale.profit))}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}