// hooks/swr/use-products.ts
'use client';

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { useAuth } from '@/hooks/use-auth';
import { Product } from '@/types';
import { useState } from 'react';

const KEY = '/api/products';

// ── Tipos ──────────────────────────────────────────────────────────────

export type ProductsResponse = {
  data: Product[];
  total: number;
};

export type CreateProductInput = {
  name: string;
  description?: string;
  sku?: string;
  price: number;
  image_url?: string | null;
};

export type UpdateProductInput = Partial<CreateProductInput> & {
  is_active?: boolean;
  image_url?: string | null;
};

// ── Helper interno para fetch autenticado ─────────────────────────────

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
      const err = await res.json();
      throw new Error(err.error || 'Error en la solicitud');
    }

    return res.json();
  };
}

// ── useProducts — listar todos ─────────────────────────────────────────

export function useProducts() {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const { data, error, isLoading, mutate } = useSWR<ProductsResponse>(
    firebaseUser ? KEY : null, // no fetch hasta tener usuario
    (url:string) => authFetch(url),
  );

  return {
    products: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

// ── useProduct — uno por id ────────────────────────────────────────────

export function useProduct(id: number | null) {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const { data, error, isLoading, mutate } = useSWR<Product>(
    firebaseUser && id ? `${KEY}/${id}` : null,
    (url: string) => authFetch(url),
  );

  return {
    product: data ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

// ── useCreateProduct ───────────────────────────────────────────────────

export function useCreateProduct() {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const { trigger, isMutating } = useSWRMutation(
    firebaseUser ? KEY : null,
    (_url: string, { arg }: { arg: CreateProductInput }) =>
      authFetch(KEY, { method: 'POST', body: JSON.stringify(arg) })
  );

  return { createProduct: trigger, isCreating: isMutating };
}

// ── useUpdateProduct ───────────────────────────────────────────────────

export function useUpdateProduct(id: number | null) {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const { trigger, isMutating } = useSWRMutation(
    firebaseUser && id ? `${KEY}/${id}` : null,
    (_url: string, { arg }: { arg: UpdateProductInput }) =>
      authFetch(`${KEY}/${id}`, { method: 'PATCH', body: JSON.stringify(arg) })
  );

  return { updateProduct: trigger, isUpdating: isMutating };
}

// ── useDeleteProduct ───────────────────────────────────────────────────

// En use-products.ts reemplaza useDeleteProduct
export function useDeleteProduct() {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteProduct = async (id: number) => {
    setIsDeleting(true);
    try {
      await authFetch(`${KEY}/${id}`, { method: 'DELETE' });
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteProduct, isDeleting };
}