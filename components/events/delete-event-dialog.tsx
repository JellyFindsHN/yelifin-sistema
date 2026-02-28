// components/events/delete-event-dialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDeleteEvent, Event } from "@/hooks/swr/use-events";

type Props = {
  event:        Event | null;
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
};

export function DeleteEventDialog({ event, open, onOpenChange, onSuccess }: Props) {
  const { deleteEvent }  = useDeleteEvent();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose  = () => onOpenChange(false);

  const handleDelete = async () => {
    if (!event) return;
    setIsDeleting(true);
    try {
      await deleteEvent(event.id);
      toast.success("Evento eliminado");
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar evento");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!event) return null;

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
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <DialogHeader className="shrink-0 px-5 pt-2 pb-3 sm:pt-5 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-destructive">
            <Trash2 className="h-4 w-4" />
            Eliminar evento
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 px-5 py-5 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">¿Eliminar "{event.name}"?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Esta acción no se puede deshacer. Se perderán todos los datos asociados al evento.
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 px-5 py-4 border-t bg-background flex gap-3">
          <Button
            type="button" variant="outline"
            onClick={handleClose} disabled={isDeleting}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete} disabled={isDeleting}
            className="flex-1 h-11 gap-2"
          >
            {isDeleting
              ? <><Loader2 className="h-4 w-4 animate-spin" />Eliminando...</>
              : <><Trash2 className="h-4 w-4" />Eliminar</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}