// components/shared/responsive-modal.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ModalWidth = "sm" | "md" | "wide" | "xl" | "2xl";
type ModalHeight = "default" | "tall" | "compact";

// Estas clases se escriben literalmente (no se interpolan) para que Tailwind
// las detecte al escanear este archivo, sin importar qué variante se use en runtime.
const WIDTH_CLASSES: Record<ModalWidth, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  wide: "sm:max-w-md lg:max-w-xl xl:max-w-xl",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-lg lg:max-w-2xl",
};

const HEIGHT_CLASSES: Record<ModalHeight, string> = {
  default: "max-h-[92dvh] sm:max-h-[88vh]",
  tall: "max-h-[92dvh] sm:max-h-[90vh]",
  compact: "max-h-[80dvh] sm:max-h-[80vh]",
};

type ResponsiveModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título simple (junto con `icon`/`subtitle` opcionales). Ignorado si se pasa `header`. */
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ElementType;
  iconClassName?: string;
  titleClassName?: string;
  /** Reemplaza por completo el header por defecto (debe incluir su propio DialogTitle). */
  header?: React.ReactNode;
  /** Contenido fijo (no scrollea) entre el header y el body, p.ej. un resumen. */
  topContent?: React.ReactNode;
  children: React.ReactNode;
  /** Botones fijos al fondo de la modal. */
  footer?: React.ReactNode;
  /** Usa "form" cuando el body debe ser un <form> (p.ej. con react-hook-form). */
  as?: "div" | "form";
  formProps?: React.ComponentPropsWithoutRef<"form">;
  width?: ModalWidth;
  height?: ModalHeight;
  /** Si es false, permite cerrar al hacer click fuera (por defecto se previene). */
  preventOutsideClose?: boolean;
  showDragHandle?: boolean;
  bodyClassName?: string;
  contentClassName?: string;
};

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  titleClassName,
  header,
  topContent,
  children,
  footer,
  as = "div",
  formProps,
  width = "md",
  height = "default",
  preventOutsideClose = true,
  showDragHandle = true,
  bodyClassName,
  contentClassName,
}: ResponsiveModalProps) {
  const bodyProps = {
    ...(as === "form" ? formProps : {}),
    className: cn("flex-1 overflow-y-auto px-5 py-4 space-y-4", bodyClassName),
    style: { scrollbarWidth: "none" } as React.CSSProperties,
    children,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0",
          "w-full max-w-full rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0",
          HEIGHT_CLASSES[height],
          "flex flex-col p-0",
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full",
          WIDTH_CLASSES[width],
          "sm:rounded-2xl sm:border",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-[48%]",
          "data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:slide-out-to-bottom-[48%]",
          "duration-300",
          contentClassName,
        )}
        onInteractOutside={preventOutsideClose ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onOpenChange(false);
        }}
      >
        {showDragHandle && (
          <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {(header || title) && (
          <DialogHeader className="shrink-0 px-5 pt-2 pb-3 sm:pt-5 border-b">
            {header ?? (
              <>
                <DialogTitle className={cn("flex items-center gap-2 text-lg font-bold", titleClassName)}>
                  {Icon && <Icon className={cn("size-4 text-primary", iconClassName)} />}
                  {title}
                </DialogTitle>
                {subtitle && (
                  <p className="text-xs text-muted-foreground text-left">{subtitle}</p>
                )}
              </>
            )}
          </DialogHeader>
        )}

        {topContent}

        {React.createElement(as, bodyProps as any)}

        {footer && (
          <div  className="shrink-0 px-5 py-4 border-t bg-transparent xl:bg-transparent md:bg-transparent sm:bg-background flex gap-3">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
