// components/supplies/supply-table.tsx
"use client";

import { Supply } from "@/hooks/swr/use-supplies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, PackagePlus, Boxes } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency", currency: "HNL", minimumFractionDigits: 2,
  }).format(value);

function getStatusBadge(stock: number, min: number) {
  if (stock === 0)
    return <Badge variant="destructive">Agotado</Badge>;
  if (stock < min)
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200" variant="outline">Stock bajo</Badge>;
  return <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">OK</Badge>;
}

function getStockColor(stock: number, min: number) {
  if (stock === 0) return "text-destructive font-bold";
  if (stock < min) return "text-yellow-600 font-bold";
  return "text-green-600 font-bold";
}

export function SupplyTable({
  supplies,
  onEdit,
  onDelete,
  onAddPurchase,
}: {
  supplies: Supply[];
  onEdit: (s: Supply) => void;
  onDelete: (s: Supply) => void;
  onAddPurchase: (s: Supply) => void;
}) {
  if (supplies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Boxes className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No se encontraron suministros</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* ── MOBILE: Cards ── */}
      <div className="space-y-3 md:hidden">
        {supplies.map((s) => {
          const stock = Number(s.stock ?? 0);
          const min   = Number(s.min_stock ?? 0);

          return (
            <Card key={s.id}>
              <CardContent className="p-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Unidad: <span className="font-mono">{s.unit ?? "unit"}</span>
                    </p>
                  </div>
                  {getStatusBadge(stock, min)}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center py-3 border-y mb-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Stock</p>
                    <p className={`text-base font-mono ${getStockColor(stock, min)}`}>{stock}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Mínimo</p>
                    <p className="text-base font-mono font-semibold">{min}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Costo/u</p>
                    <p className="text-base font-mono font-semibold">
                      {formatCurrency(Number(s.unit_cost ?? 0))}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => onAddPurchase(s)}
                  >
                    <PackagePlus className="h-3.5 w-3.5" />
                    Compra
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => onEdit(s)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── DESKTOP: Table ── */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Costo/u</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplies.map((s) => {
                const stock = Number(s.stock ?? 0);
                const min   = Number(s.min_stock ?? 0);

                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono">{s.unit ?? "unit"}</TableCell>
                    <TableCell className={`text-right font-mono ${getStockColor(stock, min)}`}>
                      {stock}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{min}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(Number(s.unit_cost ?? 0))}
                    </TableCell>
                    <TableCell>{getStatusBadge(stock, min)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Registrar compra"
                          onClick={() => onAddPurchase(s)}
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => onDelete(s)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}