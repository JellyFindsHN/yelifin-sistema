// components/products/delete-product-dialog.tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteProduct } from "@/hooks/swr/use-products";
import { Product } from "@/types";

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function DeleteProductDialog({ product, open, onOpenChange, onSuccess }: Props) {
  const { deleteProduct, isDeleting } = useDeleteProduct(product?.id ?? null);

  const handleDelete = async () => {
    try {
      await deleteProduct();
      toast.success("Producto eliminado correctamente");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el producto");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar{" "}
            <span className="font-medium text-foreground">{product?.name}</span>.
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando...</>
            ) : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}