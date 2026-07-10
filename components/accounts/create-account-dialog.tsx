// components/accounts/create-account-dialog.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Wallet, PlusCircle } from "lucide-react";
import { toast } from "sonner";
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
    <ResponsiveModal
      open={open}
      onOpenChange={(v) => !v && handleClose()}
      title="Nueva cuenta"
      icon={Wallet}
      width="wide"
      as="form"
      formProps={{ id: "create-account-form", onSubmit: handleSubmit(onSubmit) }}
      footer={
        <>
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
              ? <><Loader2 className="size-4 animate-spin" />Creando…</>
              : <><PlusCircle className="size-4" />Crear cuenta</>
            }
          </Button>
        </>
      }
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
              <SelectTrigger className="w-full h-11 text-left">
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

    </ResponsiveModal>
  );
}