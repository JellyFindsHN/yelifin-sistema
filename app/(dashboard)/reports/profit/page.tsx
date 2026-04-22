// app/(dashboard)/reports/profit/page.tsx
"use client";

import { useProfitReport } from "@/hooks/swr/use-reports";
import { useCurrency }     from "@/hooks/swr/use-currency";
import { exportToExcel, exportToPDF, fmtN, fmtPct } from "@/lib/export";
import { ReportShell, StatCard, useDateRange } from "@/components/reports/report-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge }    from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

export default function ProfitReportPage() {
  const { from, to, setFrom, setTo } = useDateRange("year");
  const { format, symbol }           = useCurrency();
  const { summary, byMonth, byProduct, expenses, isLoading } = useProfitReport(from, to);

  const periodLabel = `${new Date(from + "T12:00:00").toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })} — ${new Date(to + "T12:00:00").toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}`;

  // ── Exports ──────────────────────────────────────────────────────
  const handleExcelExport = async () => {
    await exportToExcel(`Rentabilidad_${from}_${to}`, [
      {
        name: "Resumen",
        columns: ["Métrica", "Valor"],
        rows: summary ? [
          ["Ingresos brutos",   fmtN(summary.revenue)],
          ["Costo mercancía",   fmtN(summary.cogs)],
          ["Utilidad bruta",    fmtN(summary.gross_profit)],
          ["Descuentos",        fmtN(summary.total_discount)],
          ["Gastos del período",fmtN(expenses?.total_expenses ?? 0)],
          ["Margen bruto %",    fmtPct(summary.margin_pct)],
          ["Ventas procesadas", summary.total_sales],
        ] : [],
      },
      {
        name: "Por mes",
        columns: ["Mes", "Ventas", `Ingresos (${symbol})`, `Costo (${symbol})`, `Utilidad (${symbol})`],
        rows: byMonth.map(m => [m.month_label, m.sales_count, fmtN(m.revenue), fmtN(m.cogs), fmtN(m.profit)]),
      },
      {
        name: "Por producto",
        columns: ["Producto", "SKU", "Cant. vendida", `Ingresos (${symbol})`, `Costo (${symbol})`, `Utilidad (${symbol})`, "Margen %"],
        rows: byProduct.map(p => [p.product_name, p.sku, p.qty_sold, fmtN(p.revenue), fmtN(p.cogs), fmtN(p.profit), fmtPct(p.margin_pct)]),
      },
    ]);
  };

  const handlePDFExport = async () => {
    await exportToPDF({
      title:     "Reporte de Rentabilidad",
      subtitle:  periodLabel,
      filename:  `Rentabilidad_${from}_${to}`,
      landscape: true,
      tables: [
        {
          title:   "Resumen",
          columns: ["Métrica", "Valor"],
          rows: summary ? [
            ["Ingresos brutos",  `${symbol} ${fmtN(summary.revenue)}`],
            ["Costo mercancía",  `${symbol} ${fmtN(summary.cogs)}`],
            ["Utilidad bruta",   `${symbol} ${fmtN(summary.gross_profit)}`],
            ["Margen bruto",     fmtPct(summary.margin_pct)],
          ] : [],
        },
        {
          title:   "Rentabilidad por producto",
          columns: ["Producto", "SKU", "Cant.", "Ingresos", "Costo", "Utilidad", "Margen"],
          rows: byProduct.slice(0, 40).map(p => [
            p.product_name, p.sku || "—", p.qty_sold,
            `${symbol} ${fmtN(p.revenue)}`,
            `${symbol} ${fmtN(p.cogs)}`,
            `${symbol} ${fmtN(p.profit)}`,
            fmtPct(p.margin_pct),
          ]),
        },
      ],
    });
  };

  return (
    <ReportShell
      title="Rentabilidad"
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
          <StatCard label="Ingresos brutos"   value={format(summary.revenue)}        accent="blue" />
          <StatCard label="Costo mercancía"   value={format(summary.cogs)}           accent="red" />
          <StatCard label="Utilidad bruta"    value={format(summary.gross_profit)}   accent="green" />
          <StatCard label="Margen bruto"      value={fmtPct(summary.margin_pct)}
            accent={summary.margin_pct >= 20 ? "green" : summary.margin_pct >= 10 ? "amber" : "red"}
            sub={`${summary.total_sales} ventas`}
          />
        </div>
      )}

      {/* Expenses note */}
      {!isLoading && expenses && expenses.total_expenses > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 text-sm flex items-center justify-between">
          <span className="text-muted-foreground">Gastos registrados en el período</span>
          <span className="font-semibold text-amber-700 dark:text-amber-400">{format(expenses.total_expenses)}</span>
        </div>
      )}

      {/* Monthly chart */}
      {!isLoading && byMonth.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold mb-3">Ingresos vs. utilidad por mes</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byMonth} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month_label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={65}
                tickFormatter={v => `${symbol}${Number(v).toLocaleString("es-HN", { maximumFractionDigits: 0 })}`}
              />
              <Tooltip
                formatter={(v: any, name: string) => [format(Number(v)), name === "revenue" ? "Ingresos" : name === "cogs" ? "Costo" : "Utilidad"]}
              />
              <Legend formatter={(v) => v === "revenue" ? "Ingresos" : v === "cogs" ? "Costo" : "Utilidad"} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              <Bar dataKey="cogs"    fill="hsl(0 84% 60%)"      radius={[4,4,0,0]} />
              <Bar dataKey="profit"  fill="hsl(142 76% 36%)"    radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By product */}
      {!isLoading && byProduct.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-sm font-semibold">Rentabilidad por producto</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/10 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2">Producto</th>
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
                    <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">
                      {p.product_name}
                      {p.sku && <span className="ml-1 text-xs text-muted-foreground">· {p.sku}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{p.qty_sold}</td>
                    <td className="px-4 py-2.5 text-right">{format(p.revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground hidden md:table-cell">{format(p.cogs)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-green-700 dark:text-green-400">{format(p.profit)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge variant="outline" className={`text-xs ${p.margin_pct >= 30 ? "border-green-200 text-green-700" : p.margin_pct >= 10 ? "border-amber-200 text-amber-700" : "border-red-200 text-red-700"}`}>
                        {fmtPct(p.margin_pct)}
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
        <p className="text-center text-muted-foreground py-16 text-sm">Sin datos de ventas en el período seleccionado.</p>
      )}
    </ReportShell>
  );
}
