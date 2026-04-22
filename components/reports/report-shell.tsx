// components/reports/report-shell.tsx
"use client";

import { useState } from "react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Loader2, FileSpreadsheet, FileText, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

// ── Date presets ───────────────────────────────────────────────────────

export function thisMonth()   {
  const n = new Date();
  return {
    from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10),
    to:   new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}
export function lastMonth()   {
  const n = new Date();
  return {
    from: new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().slice(0, 10),
    to:   new Date(n.getFullYear(), n.getMonth(), 0).toISOString().slice(0, 10),
  };
}
export function thisYear()    {
  const n = new Date();
  return {
    from: new Date(n.getFullYear(), 0, 1).toISOString().slice(0, 10),
    to:   new Date(n.getFullYear(), 11, 31).toISOString().slice(0, 10),
  };
}

// ── useDateRange hook ──────────────────────────────────────────────────

export function useDateRange(defaultPreset: "month" | "year" = "month") {
  const init  = defaultPreset === "year" ? thisYear() : thisMonth();
  const [from, setFrom] = useState(init.from);
  const [to,   setTo]   = useState(init.to);
  return { from, to, setFrom, setTo };
}

// ── ReportShell ───────────────────────────────────────────────────────

type Props = {
  title:         string;
  subtitle?:     string;
  from:          string;
  to:            string;
  onFromChange:  (v: string) => void;
  onToChange:    (v: string) => void;
  showDateRange?: boolean;
  onExportExcel: () => Promise<void>;
  onExportPDF:   () => Promise<void>;
  isLoading?:    boolean;
  children:      React.ReactNode;
};

export function ReportShell({
  title, subtitle, from, to, onFromChange, onToChange,
  showDateRange = true, onExportExcel, onExportPDF,
  isLoading, children,
}: Props) {
  const router = useRouter();
  const [exportingXls, setExportingXls] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleXls = async () => {
    setExportingXls(true);
    try { await onExportExcel(); } finally { setExportingXls(false); }
  };
  const handlePDF = async () => {
    setExportingPDF(true);
    try { await onExportPDF(); } finally { setExportingPDF(false); }
  };

  const busy = isLoading || exportingXls || exportingPDF;

  return (
    <div className="space-y-5 pb-10">
      {/* Top bar */}
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {/* Export buttons */}
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline" size="sm"
            className="gap-1.5"
            onClick={handleXls}
            disabled={busy}
          >
            {exportingXls
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
            }
            Excel
          </Button>
          <Button
            variant="outline" size="sm"
            className="gap-1.5"
            onClick={handlePDF}
            disabled={busy}
          >
            {exportingPDF
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <FileText className="h-3.5 w-3.5 text-red-500" />
            }
            PDF
          </Button>
        </div>
      </div>

      {/* Date range filter */}
      {showDateRange && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/20 p-3">
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: "Este mes",  ...thisMonth() },
              { label: "Mes ant.", ...lastMonth() },
              { label: "Este año",  ...thisYear()  },
            ].map((p) => (
              <Button
                key={p.label}
                variant={from === p.from && to === p.to ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => { onFromChange(p.from); onToChange(p.to); }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={from} onChange={e => onFromChange(e.target.value)} className="h-8 text-xs w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={to}   onChange={e => onToChange(e.target.value)}   className="h-8 text-xs w-36" />
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────

export function StatCard({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent?: "green" | "red" | "blue" | "amber" }) {
  const colors = {
    green: "border-green-200 bg-green-50/60 dark:bg-green-950/20",
    red:   "border-red-200   bg-red-50/60   dark:bg-red-950/20",
    blue:  "border-blue-200  bg-blue-50/60  dark:bg-blue-950/20",
    amber: "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20",
  };
  return (
    <div className={`rounded-xl border p-4 space-y-0.5 ${accent ? colors[accent] : "bg-card border-border"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
