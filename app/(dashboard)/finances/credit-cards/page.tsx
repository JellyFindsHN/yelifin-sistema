// app/(dashboard)/finances/credit-cards/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard, Plus, ChevronRight, Trash2,
  CalendarDays, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { useCreditCards, useDeleteCreditCard } from "@/hooks/swr/use-credit-cards";
import { useAccounts } from "@/hooks/swr/use-accounts";
import { useCurrency } from "@/hooks/swr/use-currency";
import { CreateCreditCardDialog } from "@/components/credit-cards/create-credit-card-dialog";
import { PayCreditCardDialog } from "@/components/credit-cards/pay-credit-card-dialog";
import { Fab } from "@/components/ui/fab";
import { CreditCard as CreditCardType } from "@/hooks/swr/use-credit-cards";

export default function CreditCardsPage() {
  const { creditCards, isLoading, mutate } = useCreditCards();
  const { accounts } = useAccounts();
  const { format, currency } = useCurrency();
  const { deleteCreditCard } = useDeleteCreditCard();

  const [createOpen, setCreateOpen] = useState(false);
  const [payCard, setPayCard] = useState<CreditCardType | null>(null);

  const totalDebtLocal = creditCards.reduce((a, c) => a + Number(c.balance), 0);
  const totalDebtUsd   = creditCards.reduce((a, c) => a + Number(c.balance_usd), 0);

  const handleDelete = async (card: CreditCardType) => {
    if (Number(card.balance) !== 0 || Number(card.balance_usd) !== 0) {
      toast.error("No puedes eliminar una tarjeta con saldo pendiente");
      return;
    }
    try {
      await deleteCreditCard(card.id);
      toast.success("Tarjeta eliminada");
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar tarjeta");
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarjetas de crédito</h1>
          <p className="text-muted-foreground text-sm">{creditCards.length} tarjeta{creditCards.length !== 1 ? "s" : ""} activa{creditCards.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Resumen de deuda total */}
      {(totalDebtLocal > 0 || totalDebtUsd > 0) && !isLoading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 pt-0 pb-0">
            <p className="text-xs font-medium text-muted-foreground mb-2">Deuda total en tarjetas</p>
            <div className="flex flex-wrap gap-4">
              {totalDebtLocal > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">{currency}</p>
                  <p className="text-xl font-bold text-destructive">{format(totalDebtLocal)}</p>
                </div>
              )}
              {totalDebtUsd > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">USD</p>
                  <p className="text-xl font-bold text-destructive">
                    {new Intl.NumberFormat("es-HN", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(totalDebtUsd)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de tarjetas */}
      <Card className="pt-1 pb-1">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : creditCards.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <CreditCard className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin tarjetas de crédito</p>
              <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Agregar tarjeta
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {creditCards.map((card) => (
                <div key={card.id} className="flex items-center gap-3 p-3.5">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium truncate">{card.name}</p>
                      {card.last_four && (
                        <Badge variant="outline" className="text-[10px] font-mono">···· {card.last_four}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {Number(card.balance) > 0 && (
                        <span className="text-xs text-destructive font-medium">{format(Number(card.balance))}</span>
                      )}
                      {Number(card.balance_usd) > 0 && (
                        <span className="text-xs text-destructive font-medium flex items-center gap-0.5">
                          <DollarSign className="h-2.5 w-2.5" />
                          {Number(card.balance_usd).toFixed(2)} USD
                        </span>
                      )}
                      {Number(card.balance) === 0 && Number(card.balance_usd) === 0 && (
                        <span className="text-xs text-muted-foreground">Sin deuda</span>
                      )}
                      {card.payment_due_day && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <CalendarDays className="h-2.5 w-2.5" />
                          Pago día {card.payment_due_day}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="sm" className="h-8 text-xs gap-1"
                      onClick={() => setPayCard(card)}
                      disabled={Number(card.balance) === 0 && Number(card.balance_usd) === 0}
                    >
                      Pagar
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(card)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Link href={`/finances/credit-cards/${card.id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Fab
        actions={[
          { label: "Nueva tarjeta", icon: CreditCard, onClick: () => setCreateOpen(true) },
        ]}
      />

      <CreateCreditCardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => mutate()}
      />

      <PayCreditCardDialog
        open={!!payCard}
        onOpenChange={(v) => !v && setPayCard(null)}
        card={payCard}
        accounts={accounts}
        onSuccess={() => { mutate(); setPayCard(null); }}
      />
    </div>
  );
}
