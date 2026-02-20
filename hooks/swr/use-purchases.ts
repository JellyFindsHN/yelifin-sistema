// hooks/swr/use-purchases.ts
'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

const KEY = '/api/purchases';

export type PurchaseItem = {
  product_id: number;
  quantity: number;
  unit_cost_usd: number;
  unit_cost: number;
  total_cost: number;
};

export type CreatePurchaseInput = {
  account_id: number;           // ← nuevo
  currency: 'USD' | 'HNL';
  exchange_rate: number;
  shipping: number;
  notes?: string;
  purchased_at?: string;
  items: Omit<PurchaseItem, 'unit_cost' | 'total_cost'>[];
};

export type Purchase = {
  id: number;
  account_id: number | null;
  account_name: string | null;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  shipping: number;
  total: number;
  is_paid: boolean;
  purchased_at: string;
  notes: string | null;
  created_at: string;
  items_count: number;
};

function useAuthFetch() {
  const { firebaseUser } = useAuth();
  return async (url: string, options: RequestInit = {}) => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error('No autenticado');
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error en la solicitud');
    }
    return res.json();
  };
}

export function usePurchases() {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();
  const { data, error, isLoading, mutate } = useSWR(
    firebaseUser ? KEY : null,
    (url: string) => authFetch(url),
  );
  return {
    purchases: (data?.data ?? []) as Purchase[],
    total:     data?.total ?? 0,
    isLoading,
    error:     error?.message ?? null,
    mutate,
  };
}

export function useCreatePurchase() {
  const authFetch = useAuthFetch();
  const [isCreating, setIsCreating] = useState(false);
  const createPurchase = async (input: CreatePurchaseInput) => {
    setIsCreating(true);
    try {
      return await authFetch(KEY, { method: 'POST', body: JSON.stringify(input) });
    } finally {
      setIsCreating(false);
    }
  };
  return { createPurchase, isCreating };
}