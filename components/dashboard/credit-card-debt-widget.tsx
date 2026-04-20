// components/dashboard/credit-card-debt-widget.tsx
"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink, DollarSign } from "lucide-react";
import { useCurrency } from "@/hooks/swr/use-currency";

type Props = {
  debtLocal:  number;
  debtUsd:    number;
  isLoading:  boolean;
};

export function CreditCardDebtWidget({ debtLocal, debtUsd, isLoading }: Props) {
  const { format, currency } = useCurrency();

  if (!isLoading && debtLocal === 0 && debtUsd === 0) return null;

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm font-semibold">Deuda en tarjetas de crédito</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-xs h-7">
            <Link href="/finances/credit-cards">
              Ver <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex gap-6">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-20" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {debtLocal > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">{currency}</p>
                <p className="text-2xl font-bold text-destructive">{format(debtLocal)}</p>
              </div>
            )}
            {debtUsd > 0 && (
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <DollarSign className="h-2.5 w-2.5" /> USD
                </p>
                <p className="text-2xl font-bold text-destructive">
                  {new Intl.NumberFormat("es-HN", {
                    style: "currency", currency: "USD", minimumFractionDigits: 2,
                  }).format(debtUsd)}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
