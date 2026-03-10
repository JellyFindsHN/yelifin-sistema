// app/(dashboard)/supplies/page.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Box } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

import { useSupplies, Supply } from "@/hooks/swr/use-supplies";
import { SupplyTable } from "@/components/supplies/supply-table";
import { CreateSupplyDialog } from "@/components/supplies/create-supply-dialog";
import { EditSupplyDialog } from "@/components/supplies/edit-supply-dialog";
import { DeleteSupplyDialog } from "@/components/supplies/delete-supply-dialog";
import { AddSupplyPurchaseDialog } from "@/components/supplies/add-supply-purchase-dialog";
import { Fab } from "@/components/ui/fab";
import { SearchBar } from "@/components/shared/search-bar";

export default function SuppliesPage() {
  const [search, setSearch] = useState("");
  const { supplies, isLoading, mutate } = useSupplies({ search });

  const [createOpen, setCreateOpen] = useState(false);
  const [editSupply, setEditSupply] = useState<Supply | null>(null);
  const [deleteSupply, setDeleteSupply] = useState<Supply | null>(null);
  const [purchaseSupply, setPurchaseSupply] = useState<Supply | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suministros</h1>
          <p className="text-muted-foreground">
            {isLoading ? "Cargando..." : `${supplies.length} suministro${supplies.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre..." />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : supplies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay suministros todavía.
          </CardContent>
        </Card>
      ) : (
            <SupplyTable
              supplies={supplies}
              onEdit={setEditSupply}
              onDelete={setDeleteSupply}
              onAddPurchase={setPurchaseSupply}
            />
      )}

      {/* Dialogs */}
      <CreateSupplyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => mutate()}
      />

      <EditSupplyDialog
        supply={editSupply}
        open={!!editSupply}
        onOpenChange={(open) => !open && setEditSupply(null)}
        onSuccess={() => mutate()}
      />

      <DeleteSupplyDialog
        supply={deleteSupply}
        open={!!deleteSupply}
        onOpenChange={(open) => !open && setDeleteSupply(null)}
        onSuccess={() => mutate()}
      />

      <AddSupplyPurchaseDialog
        supply={purchaseSupply}
        open={!!purchaseSupply}
        onOpenChange={(open) => !open && setPurchaseSupply(null)}
        onSuccess={() => mutate()}
      />

      <Fab
        actions={[
          {
            label: "Nuevo Cliente",
            icon: Box,
            onClick: () => setCreateOpen(true),
          }
        ]}/>
    </div>
  );
}
