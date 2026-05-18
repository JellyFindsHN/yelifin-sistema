// app/(dashboard)/supplies/page.tsx
"use client";

import { useState, useEffect } from "react";
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
import { useDebounce } from "@/hooks/use-debounce";
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";

export default function SuppliesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageLimit = 15;

  const debouncedSearch = useDebounce(search, 300);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const { supplies, total, totalPages, isLoading, mutate } = useSupplies({
    search: debouncedSearch || undefined,
    page,
    limit: pageLimit,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editSupply, setEditSupply] = useState<Supply | null>(null);
  const [deleteSupply, setDeleteSupply] = useState<Supply | null>(null);
  const [purchaseSupply, setPurchaseSupply] = useState<Supply | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suministros</h1>
          <p className="text-muted-foreground">
            {isLoading ? "Cargando..." : `${total} suministro${total !== 1 ? "s" : ""}`}
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            {total} suministro{total !== 1 ? "s" : ""} · página {page} de {totalPages}
          </p>
          <Pagination className="order-1 sm:order-2 w-auto mx-0 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-disabled={page === 1}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <PaginationItem key={`ellipsis-${i}`}><PaginationEllipsis /></PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink isActive={p === page} onClick={() => setPage(p as number)} className="cursor-pointer">
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-disabled={page === totalPages}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
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
