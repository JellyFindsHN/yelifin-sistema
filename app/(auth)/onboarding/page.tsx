// app/(auth)/onboarding/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LoadingScreen } from "@/hooks/ui/loading-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSWRConfig } from "swr";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Zap, Banknote, Building2, Wallet, HelpCircle,
    Plus, Trash2, CheckCircle2, Loader2, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AccountType = "CASH" | "BANK" | "WALLET" | "OTHER";

type AccountRow = {
    id: string;
    name: string;
    type: AccountType;
    balance: string;
    locked?: boolean;
};

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
    CASH: "Efectivo",
    BANK: "Cuenta bancaria",
    WALLET: "Billetera digital",
    OTHER: "Otro",
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ReactNode> = {
    CASH: <Banknote className="h-3.5 w-3.5" />,
    BANK: <Building2 className="h-3.5 w-3.5" />,
    WALLET: <Wallet className="h-3.5 w-3.5" />,
    OTHER: <HelpCircle className="h-3.5 w-3.5" />,
};

const CURRENCIES = [
    { code: "HNL", label: "Lempira hondureño (L)" },
    { code: "USD", label: "Dólar estadounidense ($)" },
    { code: "MXN", label: "Peso mexicano ($)" },
    { code: "GTQ", label: "Quetzal guatemalteco (Q)" },
    { code: "CRC", label: "Colón costarricense (₡)" },
    { code: "EUR", label: "Euro (€)" },
];

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

export default function OnboardingPage() {
    const { mutate } = useSWRConfig();
    const { firebaseUser, loading } = useAuth();
    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [step, setStep] = useState<1 | 2>(1);
    const [currency, setCurrency] = useState("HNL");
    const [saving, setSaving] = useState(false);

    const [accounts, setAccounts] = useState<AccountRow[]>([
        { id: uid(), name: "Efectivo", type: "CASH", balance: "0", locked: true },
    ]);

    useEffect(() => {
        if (loading) return;
        if (!firebaseUser) { router.replace("/login"); return; }

        const check = async () => {
            try {
                const token = await firebaseUser.getIdToken();
                const res = await fetch("/api/onboarding", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.data?.onboarding_completed) {
                        router.replace("/dashboard");
                        return;
                    }
                }
            } catch { /* dejar mostrar onboarding */ }
            setChecking(false);
        };

        check();
    }, [firebaseUser, loading]);

    const addAccount = () =>
        setAccounts((prev) => [...prev, { id: uid(), name: "", type: "BANK", balance: "0" }]);

    const removeAccount = (id: string) =>
        setAccounts((prev) => prev.filter((a) => a.id !== id || a.locked));

    const updateAccount = (id: string, field: keyof AccountRow, value: string) =>
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));

    const handleFinish = async () => {
        const invalid = accounts.find((a) => !a.name.trim());
        if (invalid) { toast.error("Todas las cuentas deben tener un nombre"); return; }

        setSaving(true);
        try {
            const token = await firebaseUser?.getIdToken();
            if (!token) throw new Error("No autenticado");

            const res = await fetch("/api/onboarding", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currency,
                    accounts: accounts.map((a) => ({
                        name: a.name.trim(),
                        type: a.type,
                        balance: parseFloat(a.balance || "0") || 0,
                    })),
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "Error al guardar");

            toast.success("¡Todo listo! Bienvenido a Nexly 🎉");
            await mutate(() => true, undefined, { revalidate: true });
            router.push("/dashboard");
        } catch (err: any) {
            toast.error(err.message || "Error inesperado");
        } finally {
            setSaving(false);
        }
    };

    if (loading || checking) return <LoadingScreen />;

    return (
        // Mobile: ocupa toda la pantalla con scroll. Desktop: centra con padding.
        <div className="min-h-screen bg-muted/30 flex flex-col">

            {/* Scroll container */}
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:flex sm:items-center sm:justify-center sm:py-10">
                <div className="w-full max-w-lg">
                    <div className="bg-background rounded-2xl border shadow-sm p-5 sm:p-8 space-y-6 sm:space-y-8">

                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/50">
                                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                            </div>
                            <span className="text-xl sm:text-2xl font-bold text-primary">Nexly</span>
                        </div>

                        {/* Progress */}
                        <div className="flex items-center gap-2">
                            <StepIndicator n={1} label="Moneda" active={step === 1} done={step > 1} />
                            <div className="flex-1 h-px bg-border" />
                            <StepIndicator n={2} label="Cuentas" active={step === 2} done={false} />
                        </div>

                        {/* ── PASO 1: Moneda ── */}
                        {step === 1 && (
                            <div className="space-y-5">
                                <div className="space-y-1">
                                    <h1 className="text-xl sm:text-2xl font-bold">¿Cuál es tu moneda principal?</h1>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        Todos los precios y balances se mostrarán en esta moneda.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Moneda</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CURRENCIES.map((c) => (
                                                <SelectItem key={c.code} value={c.code}>
                                                    <span className="font-mono font-bold mr-2">{c.code}</span>
                                                    {c.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button className="w-full gap-2 h-11" onClick={() => setStep(2)}>
                                    Continuar
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {/* ── PASO 2: Cuentas ── */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <div className="space-y-1">
                                    <h1 className="text-xl sm:text-2xl font-bold">Configura tus cuentas</h1>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        La cuenta de <strong>Efectivo</strong> es obligatoria.
                                        Podés agregar cuentas bancarias, billeteras u otras.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {accounts.map((acc) => (
                                        <div
                                            key={acc.id}
                                            className={cn(
                                                "rounded-xl border p-3 sm:p-4 space-y-3",
                                                acc.locked && "bg-muted/40 border-primary/20"
                                            )}
                                        >
                                            {/* Header tarjeta */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm font-medium">
                                                    {ACCOUNT_TYPE_ICONS[acc.type]}
                                                    {acc.locked
                                                        ? <span className="text-primary">Efectivo (principal)</span>
                                                        : <span>Nueva cuenta</span>
                                                    }
                                                </div>
                                                {!acc.locked && (
                                                    <button
                                                        onClick={() => removeAccount(acc.id)}
                                                        className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Nombre + Tipo en columna en móvil, fila en sm+ */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Nombre *</Label>
                                                    <Input
                                                        value={acc.name}
                                                        onChange={(e) => updateAccount(acc.id, "name", e.target.value)}
                                                        placeholder="Ej: Efectivo caja"
                                                        disabled={acc.locked}
                                                        className="h-9 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Tipo *</Label>
                                                    <Select
                                                        value={acc.type}
                                                        onValueChange={(v) => updateAccount(acc.id, "type", v)}
                                                        disabled={acc.locked}
                                                    >
                                                        <SelectTrigger className="h-9 text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                                                                <SelectItem key={t} value={t}>
                                                                    {ACCOUNT_TYPE_LABELS[t]}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Balance inicial */}
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">
                                                    Balance inicial
                                                    <span className="text-muted-foreground ml-1">(opcional)</span>
                                                </Label>
                                                <Input
                                                    type="number"
                                                    value={acc.balance === "0" ? "" : acc.balance}
                                                    onChange={(e) => updateAccount(acc.id, "balance", e.target.value || "0")}
                                                    placeholder="0"
                                                    min="0"
                                                    step="0.01"
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    {/* Agregar cuenta */}
                                    <button
                                        onClick={addAccount}
                                        className="w-full h-11 rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Agregar otra cuenta
                                    </button>
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-11"
                                        onClick={() => setStep(1)}
                                        disabled={saving}
                                    >
                                        Atrás
                                    </Button>
                                    <Button
                                        className="flex-1 h-11 gap-2"
                                        onClick={handleFinish}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</>
                                        ) : (
                                            <><CheckCircle2 className="h-4 w-4" />Comenzar</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

function StepIndicator({
    n, label, active, done,
}: {
    n: number; label: string; active: boolean; done: boolean;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <div className={cn(
                "h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0",
                (done || active) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
            </div>
            <span className={cn(
                "text-xs sm:text-sm font-medium",
                active ? "text-foreground" : "text-muted-foreground"
            )}>
                {label}
            </span>
        </div>
    );
}