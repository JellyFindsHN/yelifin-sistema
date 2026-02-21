// components/ui/fab.tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type FabAction = {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: "default" | "destructive";
};

type Props = {
  actions: FabAction[];
};

export function Fab({ actions }: Props) {
  const [open, setOpen] = useState(false);

  // Si solo hay una acción, ejecutar directo
  if (actions.length === 1) {
    const Icon = actions[0].icon;
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={actions[0].onClick}
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        >
          <Icon className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Acciones */}
        <div className="flex flex-col items-end gap-2.5">
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <div
                key={action.label}
                className={cn(
                  "flex items-center gap-2 transition-all duration-200",
                  open
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-3 pointer-events-none"
                )}
                style={{
                  transitionDelay: open ? `${(actions.length - 1 - i) * 50}ms` : "0ms",
                }}
              >
                <span className="bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-md border whitespace-nowrap">
                  {action.label}
                </span>
                <button
                  onClick={() => { action.onClick(); setOpen(false); }}
                  className={cn(
                    "h-10 w-10 rounded-full shadow-lg flex items-center justify-center transition-colors shrink-0",
                    action.variant === "destructive"
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "bg-background border text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Botón principal */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:bg-primary/90 transition-colors"
          style={{
            transform:  open ? "rotate(405deg)" : "rotate(0deg)",
            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}