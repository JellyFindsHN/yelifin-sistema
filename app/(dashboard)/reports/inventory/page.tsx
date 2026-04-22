// app/(dashboard)/reports/inventory/page.tsx
"use client";

import { useState } from "react";
import { useInventoryReport } from "@/hooks/swr/use-reports";
import { useCurrency }        from "@/hooks/swr/use-currency";
import { exportToExcel, exportToPDF, fmtN } from "@/lib/export";
import { ReportShell, StatCard } from "@/components/reports/report-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge }    from "@/components/ui/badge";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const MOVE_LABEL: Record<string, string> = { IN: "Entrada", OUT: "Salida", ADJUST: "Ajuste" };
const MOVE_COLOR: Record<string, string> = {
  IN:     "bg-green-100 text-green-700 border-green-200",
  OUT:    "bg-red-100   text-red-700   border-red-200",
  ADJUST: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function InventoryReportPage() {
  const router = useRouter();
  const { format, symbol }                          = useCurrency();
  const { summary, products, movements, isLoading } = useInventoryReport();
  const [search, setSearch] = useState("");
  const [tab,    setTab]    = useState<"stock" | "movements">("stock");

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  // ── Exports ──────────────────────────────────────────────────────
  const handleExcelExport = async () => {
    await exportToExcel(`Inventario_${new Date().toISOString().slice(0, 10)}`, [
      {
        name: "Stock actual",
        columns: ["Producto", "SKU", "Stock", `Precio (${symbol})`, `Costo promedio (${symbol})`, `Valor en inventario (${symbol})`, "Margen %"],
        rows: products.map(p => [p.name, p.sku, p.stock, fmtN(p.price), fmtN(p.avg_cost), fmtN(p.stock_value), p.margin_pct != null ? fmtN(p.margin_pct, 1) + "%" : "—"]),
      },
      {
        name: "Movimientos (30 días)",
        columns: ["Fecha", "Tipo", "Producto", "SKU", "Cantidad", "Referencia", "Notas"],
        rows: movements.map(m => [
          new Date(m.created_at).toLocaleDateString("es-HN"),
          MOVE_LABEL[m.movement_type] ?? m.movement_type,
          m.product_name, m.sku, m.quantity, m.reference_type, m.notes ?? "",
        ]),
      },
    ]);
  };

  const handlePDFExport = async () => {
    await exportToPDF({
      title:    "Reporte de Inventario",
      subtitle: `Generado el ${new Date().toLocaleDateString("es-HN", { day: "numeric", month: "long", year: "numeric" })}`,
      filename: `Inventario_${new Date().toISOString().slice(0, 10)}`,
      landscape: true,
      tables: [
        {
          title:   "Stock actual por producto",
          columns: ["Producto", "SKU", "Stock", "Precio", "Costo prom.", "Valor inv.", "Margen"],
          rows: products.map(p => [
            p.name, p.sku, p.stock,
            `${symbol} ${fmtN(p.price)}`,
            `${symbol} ${fmtN(p.avg_cost)}`,
            `${symbol} ${fmtN(p.stock_value)}`,
            p.margin_pct != null ? fmtN(p.margin_pct, 1) + "%" : "—",
          ]),
        },
      ],
    });
  };

  return (
    <ReportShell
      title="Reporte de inventario"
      subtitle="Snapshot actual del inventario"
      from="" to=""
      onFromChange={() => {}} onToChange={() => {}}
      showDateRange={false}
      onExportExcel={handleExcelExport}
      onExportPDF={handlePDFExport}
      isLoading={isLoading}
    >
      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Productos activos"  value={String(summary.total_products)} />
          <StatCard label="Unidades totales"   value={summary.total_stock.toLocaleString("es-HN")} accent="blue" />
          <StatCard label="Valor en inventario" value={format(summary.total_stock_value)} accent="green" />
          <StatCard label="Stock bajo / agotado"
            value={`${summary.low_stock_count} / ${summary.zero_stock_count}`}
            accent={summary.low_stock_count + summary.zero_stock_count > 0 ? "red" : "green"}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["stock", "movements"] as const).map(t => (
          <Button
            key={t} variant={tab === t ? "default" : "outline"} size="sm"
            onClick={() => setTab(t)}
          >
            {t === "stock" ? "Stock por producto" : "Movimientos (30 días)"}
          </Button>
        ))}
      </div>

      {/* Search */}
      {tab === "stock" && (
        <Input
          placeholder="Buscar producto o SKU..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
      )}

      {/* Stock table */}
      {tab === "stock" && !isLoading && (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2">Producto</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">SKU</th>
                  <th className="text-right px-4 py-2">Stock</th>
                  <th className="text-right px-4 py-2 hidden md:table-cell">Precio</th>
                  <th className="text-right px-4 py-2 hidden md:table-cell">Costo prom.</th>
                  <th className="text-right px-4 py-2">Valor inv.</th>
                  <th className="text-right px-4 py-2 hidden lg:table-cell">Margen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium max-w-[180px] truncate">{p.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{p.sku || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={p.stock === 0 ? "text-destructive font-medium" : p.stock <= 5 ? "text-amber-600 font-medium" : ""}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell">{format(p.price)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground hidden md:table-cell">{format(p.avg_cost)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{format(p.stock_value)}</td>
                    <td className="px-4 py-2.5 text-right hidden lg:table-cell">
                      {p.margin_pct != null ? (
                        <Badge variant="outline" className={`text-xs ${p.margin_pct >= 30 ? "border-green-200 text-green-700" : p.margin_pct >= 10 ? "border-amber-200 text-amber-700" : "border-red-200 text-red-700"}`}>
                          {fmtN(p.margin_pct, 1)}%
                        </Badge>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movements table */}
      {tab === "movements" && !isLoading && (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2">Fecha</th>
                  <th className="text-left px-4 py-2">Tipo</th>
                  <th className="text-left px-4 py-2">Producto</th>
                  <th className="text-right px-4 py-2">Cantidad</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {new Date(m.created_at).toLocaleDateString("es-HN", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={`${MOVE_COLOR[m.movement_type] ?? ""} border text-xs`}>
                        {MOVE_LABEL[m.movement_type] ?? m.movement_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-medium max-w-[160px] truncate">{m.product_name}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{m.quantity}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{m.reference_type}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Sin movimientos en los últimos 30 días</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
