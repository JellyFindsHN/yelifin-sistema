// components/events/delete-event-dialog.tsx
"use client";

import { useState } from "react";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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
    <ResponsiveModal
      open={open}
      onOpenChange={(v) => !v && handleClose()}
      title="Eliminar evento"
      icon={Trash2}
      iconClassName="text-destructive"
      titleClassName="text-destructive"
      width="sm"
      footer={
        <>
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
              ? <><Loader2 className="size-4 animate-spin" />Eliminando…</>
              : <><Trash2 className="size-4" />Eliminar</>
            }
          </Button>
        </>
      }
    >
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/10">
            <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">¿Eliminar "{event.name}"?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Esta acción no se puede deshacer. Se perderán todos los datos asociados al evento.
              </p>
            </div>
          </div>
    </ResponsiveModal>
  );
}