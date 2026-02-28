// hooks/use-currency.ts
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const CACHE_KEY = "nexly_currency";
const DEFAULT   = "HNL";

// Símbolo por código
const CURRENCY_SYMBOLS: Record<string, string> = {
  HNL: "L",
  USD: "$",
  MXN: "$",
  GTQ: "Q",
  CRC: "₡",
  EUR: "€",
};

export function useCurrency() {
  const { firebaseUser } = useAuth();
  const [currency, setCurrencyState] = useState<string>(() => {
    // Leer de localStorage inmediatamente (sin esperar al API)
    if (typeof window !== "undefined") {
      return localStorage.getItem(CACHE_KEY) ?? DEFAULT;
    }
    return DEFAULT;
  });

  // Al montar, sincronizar con el API si hay usuario
  useEffect(() => {
    if (!firebaseUser) return;

    const sync = async () => {
      try {
        const token = await firebaseUser.getIdToken();
        const res   = await fetch("/api/onboarding", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const serverCurrency = data?.data?.currency;
        if (serverCurrency) {
          localStorage.setItem(CACHE_KEY, serverCurrency);
          setCurrencyState(serverCurrency);
        }
      } catch {
        // Falla silenciosa — usar el cache local
      }
    };

    sync();
  }, [firebaseUser]);

  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  // Formateador listo para usar
  const format = (value: number, opts?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat("es-HN", {
      style:                 "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...opts,
    }).format(value);

  return { currency, symbol, format };
}