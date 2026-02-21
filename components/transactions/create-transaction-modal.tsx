// components/transactions/create-transaction-modal.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateTransaction } from "@/hooks/swr/use-transactions";

const TYPE_LABELS = {
  INCOME:   "Ingreso",
  EXPENSE:  "Egreso",
  TRANSFER: "Transferencia",
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: { id: number; name: string; balance: number }[];
  onSuccess: () => void;
  defaultType?: "INCOME" | "EXPENSE" | "TRANSFER";
};

export function CreateTransactionModal({ open, onOpenChange, accounts, onSuccess, defaultType = "EXPENSE" }: Props) {
  const { createTransaction, isCreating } = useCreateTransaction();

  const [type,        setType]        = useState<"INCOME" | "EXPENSE" | "TRANSFER">(defaultType);
  const [accountId,   setAccountId]   = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount,      setAmount]      = useState("");
  const [category,    setCategory]    = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt,  setOccurredAt]  = useState(new Date().toISOString().split("T")[0]);

  const reset = () => {
    setType(defaultType); setAccountId(""); setToAccountId("");
    setAmount(""); setCategory(""); setDescription("");
    setOccurredAt(new Date().toISOString().split("T")[0]);
  };

  const onSubmit = async () => {
    if (!accountId)                     return toast.error("Selecciona una cuenta");
    if (!amount || Number(amount) <= 0) return toast.error("El monto debe ser mayor a 0");
    if (type === "TRANSFER" && !toAccountId)              return toast.error("Selecciona cuenta destino");
    if (type === "TRANSFER" && accountId === toAccountId) return toast.error("Las cuentas deben ser diferentes");

    try {
      await createTransaction({
        type,
        account_id:    Number(accountId),
        to_account_id: type === "TRANSFER" ? Number(toAccountId) : undefined,
        amount:        Number(amount),
        category:      category   || undefined,
        description:   description || undefined,
        occurred_at:   new Date(occurredAt).toISOString(),
      });
      toast.success("Transacción registrada");
      reset();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva transacción</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <div className="grid grid-cols-3 rounded-lg border overflow-hidden">
              {(["INCOME", "EXPENSE", "TRANSFER"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2 text-xs font-medium transition-colors border-l first:border-l-0 ${
                    type === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Cuenta origen */}
          <div className="space-y-2">
            <Label>{type === "TRANSFER" ? "Cuenta origen *" : "Cuenta *"}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    <span>{a.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                      {new Intl.NumberFormat("es-HN", {
                        style: "currency", currency: "HNL", minimumFractionDigits: 0,
                      }).format(Number(a.balance))}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cuenta destino — solo transferencias */}
          {type === "TRANSFER" && (
            <div className="space-y-2">
              <Label>Cuenta destino *</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona cuenta destino" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => String(a.id) !== accountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Monto */}
          <div className="space-y-2">
            <Label>Monto (HNL) *</Label>
            <Input
              type="number" step="0.01" min="0" placeholder="0.00"
              value={amount} onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label>Fecha *</Label>
            <Input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label>
              Categoría{" "}
              <span className="text-xs text-muted-foreground">opcional</span>
            </Label>
            <Input
              placeholder="Ej: Servicios, Nómina, Ventas..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label>
              Descripción{" "}
              <span className="text-xs text-muted-foreground">opcional</span>
            </Label>
            <Textarea
              placeholder="Detalle de la transacción..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isCreating}>
            {isCreating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
              : "Registrar"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}