// components/accounts/create-account-dialog.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateAccount } from "@/hooks/swr/use-accounts";

const schema = z.object({
  name:    z.string().min(1, "El nombre es requerido"),
  type:    z.enum(["CASH", "BANK", "WALLET", "OTHER"]),
  balance: z.coerce.number().min(0).default(0),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

const accountTypeLabels: Record<string, string> = {
  CASH: "Efectivo",
  BANK: "Banco",
  WALLET: "Billetera digital",
  OTHER: "Otro",
};

export function CreateAccountDialog({ open, onOpenChange, onSuccess }: Props) {
  const { createAccount, isCreating } = useCreateAccount();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { balance: 0, type: "CASH" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createAccount(data);
      toast.success("Cuenta creada exitosamente");
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al crear cuenta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nueva cuenta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" placeholder="Ej: Efectivo caja, Cuenta BAC..." {...register("name")} disabled={isCreating} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select defaultValue="CASH" onValueChange={(v) => setValue("type", v as any)} disabled={isCreating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(accountTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance">
              Balance inicial (L)
              <span className="text-muted-foreground text-xs ml-2">opcional</span>
            </Label>
            <Input id="balance" type="number" step="0.01" min="0" placeholder="0.00" {...register("balance")} disabled={isCreating} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>Cancelar</Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : "Crear cuenta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}