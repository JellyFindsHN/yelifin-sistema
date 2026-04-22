// app/(dashboard)/reports/events/page.tsx
"use client";

import { useEventsReport } from "@/hooks/swr/use-reports";
import { useCurrency }     from "@/hooks/swr/use-currency";
import { exportToExcel, exportToPDF, fmtN } from "@/lib/export";
import { ReportShell, StatCard, useDateRange } from "@/components/reports/report-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge }    from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const STATUS_LABEL: Record<string, string> = {
  PLANNED:   "Planificado",
  ONGOING:   "En curso",
  COMPLETED: "Completado",
};
const STATUS_COLOR: Record<string, string> = {
  PLANNED:   "bg-blue-100 text-blue-700 border-blue-200",
  ONGOING:   "bg-amber-100 text-amber-700 border-amber-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
};

export default function EventsReportPage() {
  const { from, to, setFrom, setTo } = useDateRange("year");
  const { format, symbol }           = useCurrency();
  const { summary, events, isLoading } = useEventsReport(from, to);

  const periodLabel = `${new Date(from + "T12:00:00").toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })} — ${new Date(to + "T12:00:00").toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}`;

  // ── Exports ──────────────────────────────────────────────────────
  const handleExcelExport = async () => {
    await exportToExcel(`Eventos_${from}_${to}`, [
      {
        name: "Resumen",
        columns: ["Métrica", "Valor"],
        rows: summary ? [
          ["Total eventos",       summary.total_events],
          ["Total ventas",        summary.total_sales],
          ["Ingresos totales",    fmtN(summary.total_revenue)],
          ["Costo mercancía",     fmtN(summary.total_cogs)],
          ["Utilidad bruta",      fmtN(summary.gross_profit)],
          ["Gastos totales",      fmtN(summary.total_expenses)],
          ["Utilidad neta",       fmtN(summary.net_profit)],
        ] : [],
      },
      {
        name: "Por evento",
        columns: ["Evento", "Lugar", "Fecha inicio", "Ventas", `Ingresos (${symbol})`, `Costo merc. (${symbol})`, `Gastos fijos (${symbol})`, `Gastos extra (${symbol})`, `Utilidad neta (${symbol})`, "Estado"],
        rows: events.map(e => [
          e.name,
          e.location,
          new Date(e.starts_at).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" }),
          e.sales_count,
          fmtN(e.total_revenue),
          fmtN(e.total_cogs),
          fmtN(e.fixed_cost),
          fmtN(e.extra_expenses),
          fmtN(e.net_profit),
          STATUS_LABEL[e.status] ?? e.status,
        ]),
      },
    ]);
  };

  const handlePDFExport = async () => {
    await exportToPDF({
      title:     "Reporte de Eventos",
      subtitle:  periodLabel,
      filename:  `Eventos_${from}_${to}`,
      landscape: true,
      tables: [
        {
          title:   "Detalle por evento",
          columns: ["Evento", "Fecha", "Ventas", "Ingresos", "Gastos", "Utilidad neta", "Estado"],
          rows: events.map(e => [
            e.name,
            new Date(e.starts_at).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" }),
            e.sales_count,
            `${symbol} ${fmtN(e.total_revenue)}`,
            `${symbol} ${fmtN(Number(e.fixed_cost) + Number(e.extra_expenses))}`,
            `${symbol} ${fmtN(e.net_profit)}`,
            STATUS_LABEL[e.status] ?? e.status,
          ]),
        },
      ],
    });
  };

  // Chart data
  const chartData = events
    .filter(e => e.status === "COMPLETED" || e.sales_count > 0)
    .slice(0, 12)
    .map(e => ({
      name:    e.name.length > 14 ? e.name.slice(0, 14) + "…" : e.name,
      ingresos: Number(e.total_revenue),
      gastos:   Number(e.fixed_cost) + Number(e.extra_expenses) + Number(e.total_cogs),
      utilidad: Number(e.net_profit),
    }))
    .reverse();

  return (
    <ReportShell
      title="Reporte de eventos"
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
          <StatCard label="Eventos"           value={String(summary.total_events)}   />
          <StatCard label="Ingresos totales"  value={format(summary.total_revenue)}  accent="blue" />
          <StatCard label="Gastos totales"    value={format(summary.total_expenses)} accent="red" />
          <StatCard label="Utilidad neta"     value={format(summary.net_profit)}
            accent={summary.net_profit >= 0 ? "green" : "red"}
            sub={`${summary.total_sales} ventas`}
          />
        </div>
      )}

      {/* Chart */}
      {!isLoading && chartData.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold mb-3">Ingresos vs. gastos por evento</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} width={65}
                tickFormatter={v => `${symbol}${Number(v).toLocaleString("es-HN", { maximumFractionDigits: 0 })}`}
              />
              <Tooltip formatter={(v: any, name: string) => [format(Number(v)), name === "ingresos" ? "Ingresos" : name === "gastos" ? "Gastos" : "Utilidad"]} />
              <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              <Bar dataKey="gastos"   fill="hsl(0 84% 60%)"       radius={[4,4,0,0]} />
              <Bar dataKey="utilidad" fill="hsl(142 76% 36%)"     radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Events table */}
      {!isLoading && events.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2">Evento</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">Fecha</th>
                  <th className="text-right px-4 py-2">Ventas</th>
                  <th className="text-right px-4 py-2">Ingresos</th>
                  <th className="text-right px-4 py-2 hidden md:table-cell">Gastos</th>
                  <th className="text-right px-4 py-2">Utilidad neta</th>
                  <th className="text-left px-4 py-2 hidden lg:table-cell">Estado</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium max-w-[160px] truncate">{e.name}</p>
                      {e.location && <p className="text-xs text-muted-foreground">{e.location}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">
                      {new Date(e.starts_at).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-right">{e.sales_count}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{format(e.total_revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground hidden md:table-cell">
                      {format(Number(e.fixed_cost) + Number(e.extra_expenses))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      <span className={Number(e.net_profit) >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive"}>
                        {Number(e.net_profit) < 0 ? "-" : ""}{format(Math.abs(Number(e.net_profit)))}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <Badge className={`${STATUS_COLOR[e.status] ?? ""} border text-xs`}>
                        {STATUS_LABEL[e.status] ?? e.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <p className="text-center text-muted-foreground py-16 text-sm">Sin eventos en el período seleccionado.</p>
      )}
    </ReportShell>
  );
}
