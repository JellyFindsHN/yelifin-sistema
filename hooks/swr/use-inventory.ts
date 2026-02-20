// hooks/swr/use-inventory.ts
'use client';

import useSWR from 'swr';
import { useAuth } from '@/hooks/use-auth';

const KEY = '/api/inventory';

type InventoryItem = {
  product_id: number;
  product_name: string;
  sku: string | null;
  image_url: string | null;
  price: number;
  stock: number;
  avg_unit_cost: number;
  total_value: number;
};

type InventoryStats = {
  total_products: number;
  total_stock: number;
  total_value: number;
  low_stock: number;
  out_of_stock: number;
};

type InventoryResponse = {
  data: InventoryItem[];
  stats: InventoryStats;
};

function useAuthFetch() {
  const { firebaseUser } = useAuth();
  return async (url: string) => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error('No autenticado');
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error en la solicitud');
    }
    return res.json();
  };
}

export function useInventory() {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const { data, error, isLoading, mutate } = useSWR<InventoryResponse>(
    firebaseUser ? KEY : null,
    (url: string) => authFetch(url),
  );

  return {
    inventory: data?.data ?? [],
    stats: data?.stats ?? {
      total_products: 0,
      total_stock: 0,
      total_value: 0,
      low_stock: 0,
      out_of_stock: 0,
    },
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}