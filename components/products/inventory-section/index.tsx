// components/products/inventory-section/index.tsx
"use client";

import { useState } from "react";
import { Boxes, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PurchaseForm, PurchaseFormValue, defaultPurchaseForm } from "./purchase-form";
import { ExistingForm, ExistingFormValue, defaultExistingForm } from "./existing-form";

// ── Tipos públicos ─────────────────────────────────────────────────────
export type InventoryMode = "purchase" | "existing";

export type InventorySectionValue =
  | { mode: "purchase"; data: PurchaseFormValue }
  | { mode: "existing"; data: ExistingFormValue }
  | null; // null = no registrar inventario

type Props = {
  value:     InventorySectionValue;
  onChange:  (value: InventorySectionValue) => void;
  disabled?: boolean;
};

// ── Componente ─────────────────────────────────────────────────────────
export function InventorySection({ value, onChange, disabled }: Props) {
  const isOpen = value !== null;
  const mode   = value?.mode ?? "purchase";

  // Estado interno de cada form para no perder datos al cambiar de modo
  const [purchaseData, setPurchaseData] = useState<PurchaseFormValue>(defaultPurchaseForm());
  const [existingData, setExistingData] = useState<ExistingFormValue>(defaultExistingForm());

  // ── Toggle accordion ───────────────────────────────────────────────
  const handleToggle = () => {
    if (isOpen) {
      onChange(null);
    } else {
      // Abrir con el último modo activo (o "purchase" por defecto)
      onChange(
        mode === "existing"
          ? { mode: "existing", data: existingData }
          : { mode: "purchase", data: purchaseData },
      );
    }
  };

  // ── Cambio de modo ─────────────────────────────────────────────────
  const handleModeChange = (newMode: InventoryMode) => {
    if (newMode === "existing") {
      onChange({ mode: "existing", data: existingData });
    } else {
      onChange({ mode: "purchase", data: purchaseData });
    }
  };

  // ── Cambios en los forms ───────────────────────────────────────────
  const handlePurchaseChange = (data: PurchaseFormValue) => {
    setPurchaseData(data);
    onChange({ mode: "purchase", data });
  };

  const handleExistingChange = (data: ExistingFormValue) => {
    setExistingData(data);
    onChange({ mode: "existing", data });
  };

  return (
    <div className="rounded-xl border overflow-hidden">

      {/* Toggle header */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
            isOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}>
            <Boxes className="h-4 w-4" />
          </div>
          <span>Agregar inventario inicial</span>
          {!isOpen && (
            <span className="text-xs text-muted-foreground font-normal">opcional</span>
          )}
        </div>
        {isOpen
          ? <ChevronUp   className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>

      {/* Contenido */}
      {isOpen && (
        <div className="border-t bg-muted/10 px-4 pb-4 pt-4 space-y-4">

          {/* Selector de modo */}
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={mode === "purchase"}
              onClick={() => handleModeChange("purchase")}
              disabled={disabled}
            >
              Compra
            </ModeButton>
            <ModeButton
              active={mode === "existing"}
              onClick={() => handleModeChange("existing")}
              disabled={disabled}
            >
              Ya lo tengo
            </ModeButton>
          </div>

          {/* Form según modo */}
          {mode === "purchase" ? (
            <PurchaseForm
              value={purchaseData}
              onChange={handlePurchaseChange}
              disabled={disabled}
            />
          ) : (
            <ExistingForm
              value={existingData}
              onChange={handleExistingChange}
              disabled={disabled}
            />
          )}

        </div>
      )}
    </div>
  );
}

// ── ModeButton ─────────────────────────────────────────────────────────
function ModeButton({
  active, onClick, disabled, children,
}: {
  active:    boolean;
  onClick:   () => void;
  disabled?: boolean;
  children:  React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-10 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground hover:bg-muted border-border",
      )}
    >
      {children}
    </button>
  );
}