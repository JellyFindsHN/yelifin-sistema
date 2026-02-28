// components/dashboard/mobile-summary.tsx
"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCurrency } from "@/hooks/swr/use-currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertTriangle } from "lucide-react";

const formatDateFull = (d: string) =>
  new Date(d).toLocaleDateString("es-HN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

type Props = { lowStock: any[]; recentSales: any[]; isLoading: boolean };

export function MobileSummary({ lowStock, recentSales, isLoading }: Props) {
  const router = useRouter();
  const { format } = useCurrency();

  return (
    <div className="space-y-3 lg:hidden">
      {(isLoading || lowStock.length > 0) && (
        <Card>
          <CardContent className="pl-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Alertas de stock</span>
            </div>
            <div className="space-y-2">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
                : lowStock.slice(0, 4).map((p: any) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="relative h-7 w-7 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                      {p.image_url
                        ? <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                        : <Package className="h-3.5 w-3.5 text-muted-foreground/40" />
                      }
                    </div>
                    <p className="text-sm flex-1 truncate">{p.name}</p>
                    <Badge variant={Number(p.stock) === 0 ? "destructive" : "secondary"} className="shrink-0 text-xs">
                      {Number(p.stock) === 0 ? "Agotado" : `${p.stock} uds`}
                    </Badge>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pl-4">
          <p className="text-sm font-medium mb-3">Últimas ventas</p>
          <div className="space-y-2">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
              : !recentSales.length
                ? <p className="text-sm text-muted-foreground text-center py-3">Sin ventas en este período</p>
                : recentSales.slice(0, 4).map((sale: any) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border cursor-pointer active:scale-[0.99] transition-transform"
                    onClick={() => router.push(`/sales/${sale.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium">{sale.sale_number}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {sale.customer_name ?? "Anónimo"} · {formatDateFull(sale.sold_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-sm">{format(Number(sale.total))}</p>
                      <p className="text-xs text-green-600">{format(Number(sale.profit))}</p>
                    </div>
                  </div>
                ))
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}