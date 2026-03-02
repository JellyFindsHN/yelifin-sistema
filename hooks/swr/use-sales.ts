'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

const KEY = '/api/sales';

export type CartItem = {
  product_id: number;
  product_name: string;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
};


export type CreateSaleInput = {
  customer_id?: number | null;
  items: { product_id: number; quantity: number; unit_price: number; discount: number }[];
  discount?: number;
  shipping_cost?: number;
  payment_method: string;
  account_id: number;
  notes?: string;
  tax_rate?: number;
  supplies_used?: {
    supply_id: number;
    quantity: number;
    unit_cost: number;
  }[];
};

export type Sale = {
  id: number;
  sale_number: string;
  customer_id: number | null;
  customer_name: string | null;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  tax_rate: number;
  total: number;
  payment_method: string;
  account_id: number;
  account_name: string;
  sold_at: string;
  notes: string | null;
  items_count: number;
  net_profit: number;
};

export type SaleDetail = Sale & {
  items: {
    id: number;
    product_id: number;
    product_name: string;
    image_url: string | null;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    line_total: number;
  }[];
  supplies: {
    id: number;
    supply_id: number;
    supply_name: string;
    quantity: number;
    unit_cost: number;
    line_total: number;
  }[];
};

export type SalesPreset = 'today' | '7d' | 'this_month' | 'last_month' | 'all';

export type SalesFilters = {
  preset?: SalesPreset;          // default: this_month
  from?: string;                 // YYYY-MM-DD
  to?: string;                   // YYYY-MM-DD
  payment?: 'all' | 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED' | 'OTHER';
};

function buildQuery(filters?: SalesFilters) {
  const sp = new URLSearchParams();

  const preset = filters?.preset ?? 'this_month';
  sp.set('preset', preset);

  if (filters?.from) sp.set('from', filters.from);
  if (filters?.to) sp.set('to', filters.to);

  if (filters?.payment && filters.payment !== 'all') {
    sp.set('payment', filters.payment);
  } else {
    sp.set('payment', 'all');
  }

  const q = sp.toString();
  return q ? `${KEY}?${q}` : KEY;
}

function useAuthFetch() {
  const { firebaseUser } = useAuth();

  return async (url: string, options: RequestInit = {}) => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error('No autenticado');

    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error en la solicitud');
    }

    return res.json();
  };
}

export function useSales(filters?: SalesFilters) {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const url = buildQuery(filters);

  const { data, error, isLoading, mutate } = useSWR(
    firebaseUser ? url : null,
    (u: string) => authFetch(u),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  return {
    sales: (data?.data ?? []) as Sale[],
    total: data?.total ?? 0,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useSale(id: number | null) {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const { data, error, isLoading } = useSWR(
    firebaseUser && id ? `${KEY}/${id}` : null,
    (url: string) => authFetch(url),
  );

  return {
    sale: data?.data as SaleDetail | null,
    isLoading,
    error: error?.message ?? null,
  };
}

export function useCreateSale() {
  const authFetch = useAuthFetch();
  const [isCreating, setIsCreating] = useState(false);

  const createSale = async (input: CreateSaleInput) => {
    setIsCreating(true);
    try {
      return await authFetch(KEY, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } finally {
      setIsCreating(false);
    }
  };

  return { createSale, isCreating };
}
