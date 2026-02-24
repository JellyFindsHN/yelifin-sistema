// app/(dashboard)/products/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, Plus, Layers } from "lucide-react";
import { useProducts } from "@/hooks/swr/use-products";
import { ProductGrid } from "@/components/products/product-grid";
import { CreateProductDialog } from "@/components/products/create-product-dialog";
import { EditProductDialog } from "@/components/products/edit-product-dialog";
import { DeleteProductDialog } from "@/components/products/delete-product-dialog";
import { AddInventoryDialog } from "@/components/products/add-inventory-dialog";
import { Fab } from "@/components/ui/fab";
import { Product } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsPage() {
  const router = useRouter();
  const { products, isLoading, mutate } = useProducts();
  const [search,          setSearch]          = useState("");
  const [createOpen,      setCreateOpen]      = useState(false);
  const [editProduct,     setEditProduct]     = useState<Product | null>(null);
  const [deleteProduct,   setDeleteProduct]   = useState<Product | null>(null);
  const [inventoryProduct,setInventoryProduct]= useState<Product | null>(null);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-4 pb-24">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
        <p className="text-muted-foreground text-sm">
          {isLoading ? "Cargando..." : `${products.length} producto${products.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <ProductGrid
          products={filtered}
          onEdit={setEditProduct}
          onDelete={setDeleteProduct}
          onAddInventory={setInventoryProduct}
        />
      )}

      {/* FAB */}
      <Fab
        actions={[
          {
            label:   "Nuevo producto",
            icon:    Plus,
            onClick: () => setCreateOpen(true),
          },
          {
            label:   "Registro por lotes",
            icon:    Layers,
            onClick: () => router.push("/products/batch"),
          },
        ]}
      />

      {/* Diálogos */}
      <CreateProductDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => mutate()}
      />
      <EditProductDialog
        product={editProduct}
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
        onSuccess={() => mutate()}
      />
      <DeleteProductDialog
        product={deleteProduct}
        open={!!deleteProduct}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
        onSuccess={() => mutate()}
      />
      <AddInventoryDialog
        product={inventoryProduct}
        open={!!inventoryProduct}
        onOpenChange={(open) => !open && setInventoryProduct(null)}
        onSuccess={() => mutate()}
      />
    </div>
  );
}