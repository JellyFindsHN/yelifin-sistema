// components/accounts/create-account-dialog.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Wallet, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateAccount } from "@/hooks/swr/use-accounts";
import { useCurrency } from "@/hooks/swr/use-currency";

const schema = z.object({
  name:    z.string().min(1, "El nombre es requerido"),
  type:    z.enum(["CASH", "BANK", "WALLET", "OTHER"]),
  balance: z.coerce.number().min(0).default(0),
});

type FormData = z.infer<typeof schema>;

const ACCOUNT_TYPES: { value: FormData["type"]; label: string }[] = [
  { value: "CASH",   label: "Efectivo" },
  { value: "BANK",   label: "Banco" },
  { value: "WALLET", label: "Billetera digital" },
  { value: "OTHER",  label: "Otro" },
];

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
};

export function CreateAccountDialog({ open, onOpenChange, onSuccess }: Props) {
  const { createAccount, isCreating } = useCreateAccount();
  const { symbol }                    = useCurrency();

  const {
    register, handleSubmit, reset, setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { balance: 0, type: "CASH" },
  });

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: FormData) => {
    try {
      await createAccount(data);
      toast.success("Cuenta creada exitosamente");
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al crear cuenta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className={cn(
          "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0",
          "w-full max-w-full rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0",
          "max-h-[92dvh] flex flex-col p-0",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-sm sm:rounded-2xl sm:border",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-[48%]",
          "data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:slide-out-to-bottom-[48%]",
          "duration-300",
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={handleClose}
      >
        {/* Handle móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <DialogHeader className="shrink-0 px-5 pt-2 pb-3 sm:pt-5 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Wallet className="h-4 w-4 text-primary" />
            Nueva cuenta
          </DialogTitle>
        </DialogHeader>

        {/* Scroll */}
        <form
          id="create-account-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Nombre <span className="text-destructive text-xs">*</span>
            </Label>
            <Input
              placeholder="Ej: Efectivo caja, Cuenta BAC..."
              {...register("name")}
              disabled={isCreating}
              className="h-11 text-base"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Tipo <span className="text-destructive text-xs">*</span>
            </Label>
            <Select
              defaultValue="CASH"
              onValueChange={(v) => setValue("type", v as FormData["type"])}
              disabled={isCreating}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Balance inicial */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Balance inicial ({symbol})
              <span className="text-xs text-muted-foreground font-normal ml-1">opcional</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {symbol}
              </span>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                {...register("balance")}
                disabled={isCreating}
                className="h-11 pl-8 text-base"
              />
            </div>
          </div>

        </form>

        {/* Footer fijo */}
        <div className="shrink-0 px-5 py-4 border-t bg-background flex gap-3">
          <Button
            type="button" variant="outline"
            onClick={handleClose} disabled={isCreating}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button
            type="submit" form="create-account-form"
            disabled={isCreating}
            className="flex-1 h-11 gap-2"
          >
            {isCreating
              ? <><Loader2 className="h-4 w-4 animate-spin" />Creando...</>
              : <><PlusCircle className="h-4 w-4" />Crear cuenta</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}