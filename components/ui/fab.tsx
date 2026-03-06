// components/ui/fab.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type FabAction = {
  label:    string;
  icon:     React.ElementType;
  onClick:  () => void;
  variant?: "default" | "destructive";
};

type Props = { actions: FabAction[] };

export function Fab({ actions }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
      {/* Backdrop con desenfoque */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-all duration-500",
          open
            ? "backdrop-blur-[2px] bg-black/10 pointer-events-auto"
            : "backdrop-blur-none bg-transparent pointer-events-none"
        )}
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={() => setOpen(false)}
      />

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">

        {/* Acciones */}
        <div className={cn("flex flex-col items-end gap-3", !open && "pointer-events-none h-0 overflow-hidden")}>
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <div
                key={action.label}
                className={cn(
                  "flex items-center gap-3 transition-all duration-200",
                  open
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-4 pointer-events-none"
                )}
                style={{
                  transitionDelay: open ? `${(actions.length - 1 - i) * 55}ms` : "0ms",
                }}
              >
                <span className="pointer-events-auto bg-popover text-popover-foreground text-sm font-semibold px-4 py-2 rounded-xl shadow-lg border whitespace-nowrap">
                  {action.label}
                </span>
                <button
                  onClick={() => { action.onClick(); setOpen(false); }}
                  className={cn(
                    "pointer-events-auto h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-colors shrink-0",
                    action.variant === "destructive"
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "bg-background border-2 text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Botón principal */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="pointer-events-auto h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:bg-primary/90 transition-colors"
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