// app/(dashboard)/reports/sales/page.tsx
"use client";

import { useSalesReport } from "@/hooks/swr/use-reports";
import { useCurrency }    from "@/hooks/swr/use-currency";
import { exportToExcel, exportToPDF, fmtN } from "@/lib/export";
import { ReportShell, StatCard, useDateRange } from "@/components/reports/report-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge }    from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const PAYMENT_LABEL: Record<string, string> = {
  CASH:          "Efectivo",
  CARD:          "Tarjeta",
  TRANSFER:      "Transferencia",
  CREDIT:        "Crédito",
  CREDIT_CARD:   "Tarjeta crédito",
};

export default function SalesReportPage() {
  const { from, to, setFrom, setTo } = useDateRange("month");
  const { format, symbol }           = useCurrency();
  const { summary, byDay, byProduct, detail, isLoading } = useSalesReport(from, to);

  const periodLabel = `${new Date(from + "T12:00:00").toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })} — ${new Date(to + "T12:00:00").toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}`;

  // ── Exports ──────────────────────────────────────────────────────
  const handleExcelExport = async () => {
    await exportToExcel(`Ventas_${from}_${to}`, [
      {
        name: "Resumen",
        columns: ["Métrica", "Valor"],
        rows: summary ? [
          ["Ventas totales",  summary.total_sales],
          ["Ingresos",        fmtN(summary.total_revenue)],
          ["Descuentos",      fmtN(summary.total_discount)],
          ["Costo mercancía", fmtN(summary.total_cogs)],
          ["Utilidad bruta",  fmtN(summary.gross_profit)],
          ["Margen %",        summary.total_revenue > 0
            ? fmtN(100 * summary.gross_profit / summary.total_revenue, 1) + "%"
            : "0%"],
        ] : [],
      },
      {
        name: "Por producto",
        columns: ["Producto", "SKU", "Cant. vendida", `Ingresos (${symbol})`, `Costo (${symbol})`, `Utilidad (${symbol})`, "Margen %"],
        rows: byProduct.map(p => [p.product_name, p.sku, p.qty_sold, fmtN(p.revenue), fmtN(p.cogs), fmtN(p.profit), fmtN(p.margin_pct, 1) + "%"]),
      },
      {
        name: "Detalle ventas",
        columns: ["#", "Fecha", "Cliente", "Pago", "Cuenta", "Artículos", `Descuento (${symbol})`, `Total (${symbol})`, `Utilidad (${symbol})`],
        rows: detail.map(s => [s.sale_number, s.date, s.customer, PAYMENT_LABEL[s.payment_method] ?? s.payment_method, s.account_name, s.items_count, fmtN(s.discount), fmtN(s.total), fmtN(s.profit)]),
      },
      {
        name: "Por día",
        columns: ["Fecha", "Ventas", `Ingresos (${symbol})`, `Utilidad (${symbol})`],
        rows: byDay.map(d => [d.date, d.sales_count, fmtN(d.revenue), fmtN(d.profit)]),
      },
    ]);
  };

  const handlePDFExport = async () => {
    await exportToPDF({
      title:     "Reporte de Ventas",
      subtitle:  periodLabel,
      filename:  `Ventas_${from}_${to}`,
      landscape: true,
      tables: [
        {
          title:   "Resumen del período",
          columns: ["Métrica", "Valor"],
          rows: summary ? [
            ["Ventas totales",  summary.total_sales],
            ["Ingresos",        `${symbol} ${fmtN(summary.total_revenue)}`],
            ["Costo mercancía", `${symbol} ${fmtN(summary.total_cogs)}`],
            ["Utilidad bruta",  `${symbol} ${fmtN(summary.gross_profit)}`],
            ["Margen",          summary.total_revenue > 0 ? fmtN(100 * summary.gross_profit / summary.total_revenue, 1) + "%" : "0%"],
          ] : [],
        },
        {
          title:   "Top productos por ingresos",
          columns: ["Producto", "SKU", "Cant.", "Ingresos", "Utilidad", "Margen"],
          rows: byProduct.slice(0, 30).map(p => [
            p.product_name, p.sku, p.qty_sold,
            `${symbol} ${fmtN(p.revenue)}`,
            `${symbol} ${fmtN(p.profit)}`,
            fmtN(p.margin_pct, 1) + "%",
          ]),
        },
      ],
    });
  };

  const marginPct = summary && summary.total_revenue > 0
    ? 100 * summary.gross_profit / summary.total_revenue
    : 0;

  return (
    <ReportShell
      title="Reporte de ventas"
      subtitle={periodLabel}
      from={from} to={to}
      onFromChange={setFrom} onToChange={setTo}
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
          <StatCard label="Ventas"           value={String(summary.total_sales)}          />
          <StatCard label="Ingresos"         value={format(summary.total_revenue)}        accent="blue"  />
          <StatCard label="Utilidad bruta"   value={format(summary.gross_profit)}         accent="green" />
          <StatCard label="Margen"           value={`${fmtN(marginPct, 1)}%`}             accent={marginPct >= 20 ? "green" : "amber"} sub={`Descuentos: ${format(summary.total_discount)}`} />
        </div>
      )}

      {/* Chart */}
      {!isLoading && byDay.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold mb-3">Ingresos y utilidad por día</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDay} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }}
                tickFormatter={d => new Date(d + "T12:00:00").toLocaleDateString("es-HN", { day: "numeric", month: "short" })}
              />
              <YAxis tick={{ fontSize: 10 }} width={60}
                tickFormatter={v => `${symbol}${Number(v).toLocaleString("es-HN", { maximumFractionDigits: 0 })}`}
              />
              <Tooltip
                formatter={(v: any, name: string) => [format(Number(v)), name === "revenue" ? "Ingresos" : "Utilidad"]}
                labelFormatter={l => new Date(l + "T12:00:00").toLocaleDateString("es-HN", { day: "numeric", month: "long" })}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))"    radius={[4,4,0,0]} name="revenue" />
              <Bar dataKey="profit"  fill="hsl(142 76% 36%)"       radius={[4,4,0,0]} name="profit"  />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top products */}
      {!isLoading && byProduct.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-sm font-semibold">Productos más vendidos</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/10 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2">Producto</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">SKU</th>
                  <th className="text-right px-4 py-2">Cant.</th>
                  <th className="text-right px-4 py-2">Ingresos</th>
                  <th className="text-right px-4 py-2 hidden md:table-cell">Costo</th>
                  <th className="text-right px-4 py-2">Utilidad</th>
                  <th className="text-right px-4 py-2">Margen</th>
                </tr>
              </thead>
              <tbody>
                {byProduct.map((p, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">{p.product_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{p.sku || "—"}</td>
                    <td className="px-4 py-2.5 text-right">{p.qty_sold}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{format(p.revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground hidden md:table-cell">{format(p.cogs)}</td>
                    <td className="px-4 py-2.5 text-right text-green-700 dark:text-green-400 font-medium">{format(p.profit)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge variant="outline" className={`text-xs ${p.margin_pct >= 30 ? "border-green-200 text-green-700" : p.margin_pct >= 10 ? "border-amber-200 text-amber-700" : "border-red-200 text-red-700"}`}>
                        {fmtN(p.margin_pct, 1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && !summary && (
        <p className="text-center text-muted-foreground py-16 text-sm">Sin ventas en el período seleccionado.</p>
      )}
    </ReportShell>
  );
}
