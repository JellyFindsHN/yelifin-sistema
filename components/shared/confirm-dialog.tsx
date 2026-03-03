// components/shared/confirm-dialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

type ConfirmDialogVariant = "default" | "danger" | "warning";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  isLoading = false,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  const Icon =
    variant === "danger"
      ? AlertTriangle
      : variant === "warning"
      ? Clock
      : CheckCircle2;

  const iconStyles = isDanger
    ? "bg-destructive/10 text-destructive"
    : isWarning
    ? "bg-amber-500/10 text-amber-600"
    : "bg-primary/10 text-primary";

  const confirmVariant = isDanger
    ? "destructive"
    : isWarning
    ? "secondary"
    : "default";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center ${iconStyles}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base">
              {title}
            </DialogTitle>
          </div>

          {description && (
            <DialogDescription className="text-xs text-muted-foreground mt-1 ml-11">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={confirmVariant as any}
            className={`w-full sm:w-auto ${
              isWarning ? "bg-amber-500 hover:bg-amber-600 text-white" : ""
            }`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}