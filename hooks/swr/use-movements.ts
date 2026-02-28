// hooks/swr/use-movements.ts
'use client';

import useSWR from 'swr';
import { useAuth } from '@/hooks/use-auth';

const KEY = '/api/inventory/movements';

export type Movement = {
  id: number;
  movement_type: 'IN' | 'OUT';
  product_id: number;
  product_name: string;
  image_url: string | null;
  sku: string | null;
  quantity: number;
  reference_type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'INITIAL';
  reference_id: number | null;
  notes: string | null;
  created_at: string;
  // IN — compra
  unit_cost_usd: number | null;
  unit_cost_hnl: number | null;
  shipping_per_unit: number | null;
  total_cost: number | null;
  // OUT — venta
  unit_price: number | null;
  unit_cost: number | null;
  line_total: number | null;
  profit: number | null;
  sale_number: string | null;
  customer_name: string | null;
};

export type MovementFilters = {
  date?: string;
  month?: number;
  year?: number;
  product_id?: number;
};

function useAuthFetch() {
  const { firebaseUser } = useAuth();
  return async (url: string) => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error('No autenticado');
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error en la solicitud');
    }
    return res.json();
  };
}

export function useMovements(filters?: MovementFilters) {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const params = new URLSearchParams();
  if (filters?.date)       params.set('date',       filters.date);
  if (filters?.month)      params.set('month',      String(filters.month));
  if (filters?.year)       params.set('year',       String(filters.year));
  if (filters?.product_id) params.set('product_id', String(filters.product_id));

  const url = `${KEY}?${params.toString()}`;

  const { data, isLoading, error, mutate } = useSWR(
    firebaseUser ? url : null,
    (u: string) => authFetch(u),
    { revalidateOnFocus: false }
  );

  return {
    movements: (data?.data ?? []) as Movement[],
    total:     data?.total ?? 0,
    isLoading,
    error:     error?.message ?? null,
    mutate,
  };
}

export function useMovementPeriods() {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const { data, isLoading } = useSWR(
    firebaseUser ? "/api/inventory/movements/periods" : null,
    (u: string) => authFetch(u),
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  return {
    periods:   (data?.data ?? []) as { year: number; month: number }[],
    isLoading,
  };
}