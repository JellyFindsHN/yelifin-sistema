// components/customers/loyalty-policies-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Star, Plus, Pencil, Trash2, Loader2,
  ChevronLeft, ShoppingCart, Banknote,
} from "lucide-react";
import { toast } from "sonner";
import {
  useLoyaltyPolicies, useCreateLoyaltyPolicy, useUpdateLoyaltyPolicy, useDeleteLoyaltyPolicy,
  TIER_COLORS, TIER_COLOR_CLASSES,
  type LoyaltyPolicy,
} from "@/hooks/swr/use-costumers";
import { useCurrency } from "@/hooks/swr/use-currency";

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
};

type FormState = {
  tier_name:    string;
  color:        string;
  use_orders:   boolean;
  use_spent:    boolean;
  min_orders:   string;
  min_spent:    string;
  discount_pct: string;
};

const EMPTY_FORM: FormState = {
  tier_name: "", color: "amber",
  use_orders: true, use_spent: false,
  min_orders: "", min_spent: "", discount_pct: "",
};

export function LoyaltyPoliciesDialog({ open, onOpenChange }: Props) {
  const { policies, isLoading, mutate } = useLoyaltyPolicies();
  const { create, isSaving: isCreating }  = useCreateLoyaltyPolicy();
  const { update, isSaving: isUpdating }  = useUpdateLoyaltyPolicy();
  const { remove, isDeleting }            = useDeleteLoyaltyPolicy();
  const { format }                        = useCurrency();

  const [mode,        setMode]        = useState<"list" | "form">("list");
  const [editPolicy,  setEditPolicy]  = useState<LoyaltyPolicy | null>(null);
  const [form,        setForm]        = useState<FormState>(EMPTY_FORM);
  const [deleteId,    setDeleteId]    = useState<number | null>(null);

  const isSaving = isCreating || isUpdating;

  // Populate form when editing
  useEffect(() => {
    if (editPolicy) {
      setForm({
        tier_name:    editPolicy.tier_name,
        color:        editPolicy.color,
        use_orders:   editPolicy.min_orders != null,
        use_spent:    editPolicy.min_spent  != null,
        min_orders:   editPolicy.min_orders != null ? String(editPolicy.min_orders) : "",
        min_spent:    editPolicy.min_spent  != null ? String(editPolicy.min_spent)  : "",
        discount_pct: String(editPolicy.discount_pct),
      });
    }
  }, [editPolicy]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditPolicy(null);
    setMode("list");
  };

  const handleOpenForm = (policy?: LoyaltyPolicy) => {
    if (policy) setEditPolicy(policy);
    else { setForm(EMPTY_FORM); setEditPolicy(null); }
    setMode("form");
  };

  const handleSave = async () => {
    if (!form.tier_name.trim()) return toast.error("El nombre del nivel es requerido");
    if (!form.use_orders && !form.use_spent) return toast.error("Debe marcar al menos una condición");
    const discountNum = Number(form.discount_pct);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100)
      return toast.error("El descuento debe estar entre 0 y 100");

    const payload = {
      tier_name:    form.tier_name.trim(),
      color:        form.color,
      min_orders:   form.use_orders && form.min_orders ? Number(form.min_orders) : null,
      min_spent:    form.use_spent  && form.min_spent  ? Number(form.min_spent)  : null,
      discount_pct: discountNum,
      is_active:    true,
      sort_order:   editPolicy?.sort_order ?? policies.length,
    };

    try {
      if (editPolicy) {
        await update(editPolicy.id, payload);
        toast.success("Nivel actualizado");
      } else {
        await create(payload);
        toast.success("Nivel creado");
      }
      await mutate();
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      await mutate();
      toast.success("Nivel eliminado");
      setDeleteId(null);
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0",
          "w-full max-w-full rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0",
          "max-h-[92dvh] flex flex-col p-0",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-md",
          "sm:rounded-2xl sm:border",
          "sm:max-h-[88vh]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-[48%]",
          "data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:slide-out-to-bottom-[48%]",
          "duration-300",
        )}
      >
        {/* Handle móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <DialogHeader className="shrink-0 px-5 pt-2 pb-3 sm:pt-5 border-b">
          <div className="flex items-center gap-3">
            {mode === "form" && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={resetForm}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Star className="h-4 w-4 text-primary" />
                Programa de Fidelización
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode === "list"
                  ? "Define niveles para recompensar a tus clientes frecuentes"
                  : editPolicy ? "Editar nivel de fidelización" : "Nuevo nivel de fidelización"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {/* ── LIST MODE ── */}
          {mode === "list" && (
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
              ) : policies.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground space-y-2">
                  <Star className="h-9 w-9 mx-auto opacity-30" />
                  <p className="text-sm">No tienes niveles configurados</p>
                  <p className="text-xs">Crea tu primer nivel para empezar a fidelizar clientes</p>
                </div>
              ) : (
                policies.map((policy) => {
                  const colors = TIER_COLOR_CLASSES[policy.color] ?? TIER_COLOR_CLASSES.amber;
                  return (
                    <div key={policy.id} className={cn("rounded-xl border px-4 py-3 flex items-start gap-3", colors.border, colors.bg)}>
                      <div className={cn("mt-0.5 h-3 w-3 rounded-full shrink-0", colors.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("text-sm font-semibold", colors.text)}>{policy.tier_name}</p>
                          <span className={cn("text-xs font-bold", colors.text)}>{policy.discount_pct}% desc.</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[
                            policy.min_orders != null && `≥ ${policy.min_orders} órdenes`,
                            policy.min_spent  != null && `≥ compras acumuladas`,
                          ].filter(Boolean).join(" · ") || "Sin condiciones"}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {deleteId === policy.id ? (
                          <div className="flex gap-1 items-center">
                            <Button
                              variant="destructive" size="sm" className="h-7 text-xs"
                              disabled={isDeleting}
                              onClick={() => handleDelete(policy.id)}
                            >
                              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDeleteId(null)}>
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenForm(policy)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(policy.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── FORM MODE ── */}
          {mode === "form" && (
            <div className="space-y-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Nombre del nivel <span className="text-destructive text-xs">*</span>
                </Label>
                <Input
                  value={form.tier_name}
                  onChange={(e) => setForm(f => ({ ...f, tier_name: e.target.value }))}
                  placeholder="Ej: Bronce, Plata, VIP..."
                  className="h-11 text-base"
                  disabled={isSaving}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {TIER_COLORS.map((c) => {
                    const cls = TIER_COLOR_CLASSES[c.value];
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, color: c.value }))}
                        disabled={isSaving}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                          cls.bg, cls.text, cls.border,
                          form.color === c.value ? "ring-2 ring-offset-1 ring-current scale-105" : "opacity-60 hover:opacity-100"
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full", cls.dot)} />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Condiciones */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Condiciones para alcanzar este nivel <span className="text-destructive text-xs">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">El cliente debe cumplir las condiciones que marques.</p>

                <label className="flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={form.use_orders}
                    onChange={(e) => setForm(f => ({ ...f, use_orders: e.target.checked }))}
                    disabled={isSaving}
                  />
                  <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm">Mínimo de órdenes</span>
                    {form.use_orders && (
                      <Input
                        type="number"
                        min="1"
                        value={form.min_orders}
                        onChange={(e) => setForm(f => ({ ...f, min_orders: e.target.value }))}
                        placeholder="Ej: 10"
                        className="h-8 w-24 text-sm"
                        disabled={isSaving}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </label>

                <label className="flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={form.use_spent}
                    onChange={(e) => setForm(f => ({ ...f, use_spent: e.target.checked }))}
                    disabled={isSaving}
                  />
                  <Banknote className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm">Monto mínimo acumulado</span>
                    {form.use_spent && (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.min_spent}
                        onChange={(e) => setForm(f => ({ ...f, min_spent: e.target.value }))}
                        placeholder="Ej: 5000"
                        className="h-8 w-28 text-sm"
                        disabled={isSaving}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </label>
              </div>

              {/* Descuento */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Descuento a aplicar (%) <span className="text-destructive text-xs">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.discount_pct}
                    onChange={(e) => setForm(f => ({ ...f, discount_pct: e.target.value }))}
                    placeholder="Ej: 10"
                    className="h-11 text-base pr-8"
                    disabled={isSaving}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Este descuento se sugerirá automáticamente al seleccionar este cliente en una venta.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t flex gap-3">
          {mode === "list" ? (
            <>
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button className="flex-1 gap-2" onClick={() => handleOpenForm()}>
                <Plus className="h-4 w-4" /> Agregar nivel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={resetForm} disabled={isSaving}>
                Cancelar
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={isSaving}>
                {isSaving
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
                  : editPolicy ? "Guardar cambios" : "Crear nivel"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
