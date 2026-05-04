"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, SlidersHorizontal,
  TrendingUp, TrendingDown, MoreVertical, Pencil, Trash2, CreditCard,
  Banknote, Building2, Wallet,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  useTransactions, useTransactionPeriods, useDeleteTransaction,
  Transaction,
} from "@/hooks/swr/use-transactions";
import { useSWRConfig } from "swr";
import { Fab } from "@/components/ui/fab";
import { useAccounts } from "@/hooks/swr/use-accounts";
import { useCurrency } from "@/hooks/swr/use-currency";
import { useCreditCards, useAllCreditCardTransactions, AllCardTransaction } from "@/hooks/swr/use-credit-cards";
import { CreateTransactionModal } from "@/components/transactions/create-transaction-modal";
import { EditTransactionModal } from "@/components/transactions/edit-transaction-modal";
import { toast } from "sonner";

// ── Helpers ────────────────────────────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-HN", {
    day: "numeric", month: "short", year: "numeric",
  });

const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TYPE_CONFIG = {
  INCOME: {
    label: "Ingreso",
    icon: ArrowDownCircle,
    color: "text-green-600",
    badge: "bg-green-100 text-green-700 border-green-200",
    sign: "+",
  },
  EXPENSE: {
    label: "Egreso",
    icon: ArrowUpCircle,
    color: "text-destructive",
    badge: "bg-red-100 text-red-700 border-red-200",
    sign: "-",
  },
  TRANSFER: {
    label: "Transferencia",
    icon: ArrowLeftRight,
    color: "text-blue-600",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    sign: "",
  },
};

const CC_TYPE_CONFIG = {
  CHARGE: {
    label: "Cargo CC",
    icon: CreditCard,
    color: "text-destructive",
    badge: "bg-red-100 text-red-700 border-red-200",
    sign: "-",
  },
  PAYMENT: {
    label: "Pago CC",
    icon: CreditCard,
    color: "text-green-600",
    badge: "bg-green-100 text-green-700 border-green-200",
    sign: "+",
  },
};

const REF_LABELS: Record<string, string> = {
  SALE: "Venta",
  PURCHASE: "Compra inventario",
  SUPPLY_PURCHASE: "Compra suministros",
  EVENT: "Evento",
  OTHER: "Manual",
  CREDIT_CARD_PAYMENT: "Pago tarjeta",
};

// ── Unified row type ───────────────────────────────────────────────────
type Row =
  | { _src: "account"; data: Transaction }
  | { _src: "cc"; data: AllCardTransaction };

// ── Page ───────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate: globalMutate } = useSWRConfig();
  const now = new Date();

  const [filterMode,    setFilterMode]    = useState<"month" | "date">("month");
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [specificDate,  setSpecificDate]  = useState("");
  const [sourceFilter,  setSourceFilter]  = useState<string>(() => {
    const accountId = searchParams.get("account_id");
    return accountId ? accountId : "all";
  }); // "all" | "cc-{id}" | account_id
  const [typeFilter,    setTypeFilter]    = useState("all");
  const [modalOpen,     setModalOpen]     = useState(false);

  const [editingTx,     setEditingTx]     = useState<Transaction | null>(null);
  const [deletingTx,    setDeletingTx]    = useState<Transaction | null>(null);
  const [analyticsTab,  setAnalyticsTab]  = useState<"expense" | "income">("expense");

  const { deleteTransaction, isDeleting } = useDeleteTransaction();

  const periodParams = {
    month: filterMode === "month" ? selectedMonth : undefined,
    year:  filterMode === "month" ? selectedYear  : undefined,
    date:  filterMode === "date" && specificDate ? specificDate : undefined,
  };

  const isCardFilter    = sourceFilter.startsWith("cc-");
  const selectedCardId  = isCardFilter ? Number(sourceFilter.replace("cc-", "")) : undefined;
  const isAccountFilter = !isCardFilter && sourceFilter !== "all";

  const { transactions, totals, isLoading: loadingAcc, mutate } = useTransactions({
    account_id: isAccountFilter ? Number(sourceFilter) : undefined,
    ...periodParams,
  });

  const { transactions: ccTxs, isLoading: loadingCC } = useAllCreditCardTransactions({
    card_id: selectedCardId,
    ...periodParams,
  });

  const { periods }     = useTransactionPeriods();
  const { accounts }    = useAccounts();
  const { creditCards } = useCreditCards();
  const { format } = useCurrency();

  const isLoading = loadingAcc || loadingCC;

  const availableYears = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a);
  const monthsForYear  = (y: number) =>
    periods.filter((p) => p.year === y).map((p) => p.month).sort((a, b) => b - a);

  const neto = totals.income - totals.expense;

  const periodLabel = filterMode === "date" && specificDate
    ? formatDate(specificDate)
    : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  // ── Merge & filter ─────────────────────────────────────────────────
  const rows = useMemo<Row[]>(() => {
    const accRows: Row[] = (isCardFilter ? [] : transactions)
      .filter((t) => typeFilter === "all" || t.type === typeFilter)
      .map((t) => ({ _src: "account" as const, data: t }));

    const ccRows: Row[] = (isAccountFilter ? [] : ccTxs)
      .filter((t) => {
        if (typeFilter === "all") return true;
        if (typeFilter === "EXPENSE") return t.type === "CHARGE";
        if (typeFilter === "INCOME")  return t.type === "PAYMENT";
        return false;
      })
      .map((t) => ({ _src: "cc" as const, data: t }));

    return [...accRows, ...ccRows].sort(
      (a, b) =>
        new Date(b.data.occurred_at).getTime() -
        new Date(a.data.occurred_at).getTime()
    );
  }, [transactions, ccTxs, typeFilter, isCardFilter, isAccountFilter]);

  const PIE_COLORS = ["#6366f1","#f59e0b","#10b981","#3b82f6","#ec4899","#8b5cf6","#f97316","#14b8a6"];

  const categoryData = useMemo(() => {
    const expenseMap = new Map<string, number>();
    const incomeMap  = new Map<string, number>();

    for (const row of rows) {
      if (row._src === "account") {
        const t = row.data;
        const label = t.category?.trim() || "Sin categoría";
        if (t.type === "EXPENSE") {
          expenseMap.set(label, (expenseMap.get(label) ?? 0) + Number(t.amount));
        } else if (t.type === "INCOME") {
          incomeMap.set(label, (incomeMap.get(label) ?? 0) + Number(t.amount));
        }
      } else {
        const t = row.data;
        const label = t.category?.trim() || "Sin categoría";
        if (t.type === "CHARGE") {
          expenseMap.set(label, (expenseMap.get(label) ?? 0) + Number(t.amount));
        } else {
          incomeMap.set(label, (incomeMap.get(label) ?? 0) + Number(t.amount));
        }
      }
    }

    const toArr = (map: Map<string, number>) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }));

    return { expenses: toArr(expenseMap), income: toArr(incomeMap) };
  }, [rows]);

  const handleTransactionClick = (t: Transaction) => {
    if (t.reference_type === "SALE" && t.reference_id) {
      router.push(`/sales/${t.reference_id}`);
    }
  };

  const invalidateAll = () => {
    globalMutate((key) =>
      typeof key === "string" && (
        key.startsWith("/api/transactions") ||
        key.startsWith("/api/accounts") ||
        key.startsWith("/api/finances") ||
        key.startsWith("/api/credit-card-transactions")
      )
    );
  };

  const handleDelete = async () => {
    if (!deletingTx) return;
    try {
      await deleteTransaction(deletingTx.id);
      toast.success("Transacción eliminada");
      setDeletingTx(null);
      invalidateAll();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar");
    }
  };

  const isEditable = (t: Transaction) => t.reference_type === "OTHER" || !t.reference_type;

  // ── Actions menu (solo transacciones de cuenta) ────────────────────
  const ActionsMenu = ({ t }: { t: Transaction }) => {
    if (!isEditable(t)) return <div className="w-8" />;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingTx(t); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => { e.stopPropagation(); setDeletingTx(t); }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // ── Row renderers ──────────────────────────────────────────────────
  const renderMobileCard = (row: Row, i: number) => {
    if (row._src === "account") {
      const t = row.data;
      const cfg = TYPE_CONFIG[t.type];
      const Icon = cfg.icon;
      const clickable = t.reference_type === "SALE" && t.reference_id;
      return (
        <Card
          key={`acc-${t.id}`}
          className={`pt-3 pb-2.5 ${clickable ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
          onClick={() => handleTransactionClick(t)}
        >
          <CardContent className="pl-3.5">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon className={`h-4 w-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t.description || REF_LABELS[t.reference_type ?? "OTHER"] || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.account_name}
                      {t.to_account_name && <span> → {t.to_account_name}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.occurred_at)}</p>
                  </div>
                  <div className="flex items-start gap-1 shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${cfg.color}`}>
                        {cfg.sign}{format(Number(t.amount))}
                      </p>
                      <Badge className={`text-[10px] mt-0.5 ${cfg.badge}`} variant="outline">
                        {cfg.label}
                      </Badge>
                    </div>
                    <ActionsMenu t={t} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // CC transaction
    const t = row.data;
    const cfg = CC_TYPE_CONFIG[t.type];
    const Icon = cfg.icon;
    const isUsd = t.currency === "USD";
    return (
      <Card key={`cc-${t.id}`} className="pt-3 pb-2.5">
        <CardContent className="pl-3.5">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Icon className={`h-4 w-4 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {t.description || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.card_name}{t.last_four ? ` ···· ${t.last_four}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(t.occurred_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${cfg.color}`}>
                    {cfg.sign}{isUsd
                      ? `$${Number(t.amount).toFixed(2)}`
                      : format(Number(t.amount))
                    }
                  </p>
                  {isUsd && t.amount_local != null && (
                    <p className="text-[10px] text-muted-foreground">
                      ≈ {format(Number(t.amount_local))}
                    </p>
                  )}
                  <Badge className={`text-[10px] mt-0.5 ${cfg.badge}`} variant="outline">
                    {cfg.label}
                    {isUsd && <span className="ml-1">USD</span>}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDesktopRow = (row: Row) => {
    if (row._src === "account") {
      const t = row.data;
      const cfg = TYPE_CONFIG[t.type];
      const Icon = cfg.icon;
      const clickable = t.reference_type === "SALE" && t.reference_id;
      return (
        <TableRow
          key={`acc-${t.id}`}
          className={clickable ? "cursor-pointer hover:bg-muted/50" : ""}
          onClick={() => handleTransactionClick(t)}
        >
          <TableCell>
            <Badge className={`gap-1 ${cfg.badge}`} variant="outline">
              <Icon className="h-3 w-3" />
              {cfg.label}
            </Badge>
          </TableCell>
          <TableCell className="max-w-48 truncate text-sm">
            {t.description || "—"}
          </TableCell>
          <TableCell className="text-sm">
            {t.account_name}
            {t.to_account_name && (
              <span className="text-muted-foreground"> → {t.to_account_name}</span>
            )}
          </TableCell>
          <TableCell>
            <Badge variant="secondary" className="text-xs">
              {REF_LABELS[t.reference_type ?? "OTHER"] ?? "Manual"}
            </Badge>
          </TableCell>
          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
            {formatDate(t.occurred_at)}
          </TableCell>
          <TableCell className={`text-right font-bold ${cfg.color}`}>
            {cfg.sign}{format(Number(t.amount))}
          </TableCell>
          <TableCell>
            <ActionsMenu t={t} />
          </TableCell>
        </TableRow>
      );
    }

    // CC transaction
    const t = row.data;
    const cfg = CC_TYPE_CONFIG[t.type];
    const Icon = cfg.icon;
    const isUsd = t.currency === "USD";
    return (
      <TableRow key={`cc-${t.id}`}>
        <TableCell>
          <Badge className={`gap-1 ${cfg.badge}`} variant="outline">
            <Icon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        </TableCell>
        <TableCell className="max-w-48 truncate text-sm">
          {t.description || "—"}
        </TableCell>
        <TableCell className="text-sm">
          <span className="flex items-center gap-1">
            <CreditCard className="h-3 w-3 text-muted-foreground shrink-0" />
            {t.card_name}{t.last_four ? ` ···· ${t.last_four}` : ""}
          </span>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs">
            Tarjeta crédito
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
          {formatDate(t.occurred_at)}
        </TableCell>
        <TableCell className={`text-right font-bold ${cfg.color}`}>
          <span>
            {cfg.sign}{isUsd
              ? `$${Number(t.amount).toFixed(2)} USD`
              : format(Number(t.amount))
            }
          </span>
          {isUsd && t.amount_local != null && (
            <p className="text-[10px] font-normal text-muted-foreground">
              ≈ {format(Number(t.amount_local))}
            </p>
          )}
        </TableCell>
        <TableCell>
          <div className="w-8" />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transacciones</h1>
          <p className="text-muted-foreground text-sm">{periodLabel}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { label: "Ingresos",  value: totals.income,  color: "text-green-600",   icon: TrendingUp },
          { label: "Egresos",   value: totals.expense, color: "text-destructive", icon: TrendingDown },
          { label: "Neto",      value: neto, color: neto >= 0 ? "text-green-600" : "text-destructive", icon: ArrowLeftRight },
        ].map((s, index) => (
          <Card key={s.label} className={index === 2 ? "col-span-2 sm:col-span-1" : ""}>
            <CardContent className="pl-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
                <s.icon className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
              <div className={`text-sm font-bold ${s.color}`}>
                {isLoading ? <Skeleton className="h-4 w-16" /> : format(s.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Banner de cuenta/tarjeta seleccionada */}
      {sourceFilter !== "all" && (() => {
        if (isAccountFilter) {
          const selectedAccount = accounts.find((a) => String(a.id) === sourceFilter);
          if (!selectedAccount) return null;
          const BANNER_ICONS: Record<string, React.ElementType> = {
            CASH: Banknote, BANK: Building2, WALLET: CreditCard, OTHER: Wallet,
          };
          const Icon = BANNER_ICONS[selectedAccount.type] ?? Wallet;
          const ACCOUNT_TYPE_LABELS: Record<string, string> = {
            CASH: "Efectivo", BANK: "Banco", WALLET: "Billetera digital", OTHER: "Otro",
          };
          return (
            <Card className="bg-muted/40">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{selectedAccount.name}</p>
                  <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[selectedAccount.type] ?? "Cuenta"}</p>
                </div>
                <p className="text-sm font-bold shrink-0">{format(Number(selectedAccount.balance))}</p>
              </CardContent>
            </Card>
          );
        }
        if (isCardFilter) {
          const selectedCard = creditCards.find((c) => c.id === selectedCardId);
          if (!selectedCard) return null;
          return (
            <Card className="bg-muted/40">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">{selectedCard.name}</p>
                    {selectedCard.last_four && (
                      <Badge variant="outline" className="font-mono text-[10px]">···· {selectedCard.last_four}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedCard.balance > 0 && (
                      <span className="text-destructive">{format(Number(selectedCard.balance))}</span>
                    )}
                    {selectedCard.balance > 0 && selectedCard.balance_usd > 0 && " · "}
                    {selectedCard.balance_usd > 0 && (
                      <span className="text-destructive">${Number(selectedCard.balance_usd).toFixed(2)} USD</span>
                    )}
                    {selectedCard.balance === 0 && selectedCard.balance_usd === 0 && "Sin deuda"}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}

      {/* Filtros */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 rounded-lg border overflow-hidden">
          {(["month", "date"] as const).map((mode, i) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`py-2 text-xs font-medium transition-colors ${i > 0 ? "border-l" : ""} ${
                filterMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {mode === "month" ? "Por mes" : "Fecha exacta"}
            </button>
          ))}
        </div>

        {filterMode === "month" ? (
          <div className="grid grid-cols-2 gap-2">
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthsForYear(selectedYear).map((m) => (
                  <SelectItem key={m} value={String(m)}>{MONTH_NAMES[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => {
                const y = Number(v);
                setSelectedYear(y);
                const months = periods.filter((p) => p.year === y).map((p) => p.month);
                if (months.length && !months.includes(selectedMonth)) setSelectedMonth(months[0]);
              }}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Input
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            className="w-full"
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* Fuente: cuentas + tarjetas */}
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Fuente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fuentes</SelectItem>
              {accounts.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Cuentas
                  </div>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </>
              )}
              {creditCards.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Tarjetas de crédito
                  </div>
                  {creditCards.map((c) => (
                    <SelectItem key={c.id} value={`cc-${c.id}`}>
                      {c.name}{c.last_four ? ` ···· ${c.last_four}` : ""}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="INCOME">Ingresos / Pagos CC</SelectItem>
              <SelectItem value="EXPENSE">Egresos / Cargos CC</SelectItem>
              <SelectItem value="TRANSFER">Transferencias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Analíticas por categoría */}
      {!isLoading && rows.length > 0 && (
        <Card className="pt-1 pb-1">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Por categoría</p>
              <div className="grid grid-cols-2 rounded-lg border overflow-hidden text-xs">
                {(["expense", "income"] as const).map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setAnalyticsTab(tab)}
                    className={`px-3 py-1.5 font-medium transition-colors ${i > 0 ? "border-l" : ""} ${
                      analyticsTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab === "expense" ? "Egresos" : "Ingresos"}
                  </button>
                ))}
              </div>
            </div>
            {(analyticsTab === "expense" ? categoryData.expenses : categoryData.income).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={analyticsTab === "expense" ? categoryData.expenses : categoryData.income}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {(analyticsTab === "expense" ? categoryData.expenses : categoryData.income).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => format(v)}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(value) => value.length > 18 ? value.slice(0, 18) + "…" : value}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cards — móvil */}
      <div className="space-y-2.5 lg:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <SlidersHorizontal className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                No hay transacciones en este período
              </p>
            </CardContent>
          </Card>
        ) : (
          rows.map((row, i) => renderMobileCard(row, i))
        )}
      </div>

      {/* Tabla — desktop */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Cuenta / Tarjeta</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No hay transacciones en este período
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => renderDesktopRow(row))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* FAB */}
      <Fab
        actions={[{
          label: "Nueva transacción",
          icon: ArrowLeftRight,
          onClick: () => setModalOpen(true),
        }]}
      />

      {/* Modal crear */}
      <CreateTransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        accounts={accounts}
        creditCards={creditCards}
        onSuccess={() => { invalidateAll(); setModalOpen(false); }}
      />

      {/* Modal editar */}
      {editingTx && (
        <EditTransactionModal
          open={!!editingTx}
          transaction={editingTx}
          accounts={accounts}
          onOpenChange={(v) => { if (!v) setEditingTx(null); }}
          onSuccess={() => { setEditingTx(null); invalidateAll(); }}
        />
      )}

      {/* Confirm eliminar */}
      <AlertDialog open={!!deletingTx} onOpenChange={(v) => { if (!v) setDeletingTx(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Se revertirá el balance de la cuenta. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
