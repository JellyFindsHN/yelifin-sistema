// hooks/swr/use-customers.ts
'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

const KEY = '/api/customers';

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
};

export type CreateCustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
};

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

export function useCustomers() {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const { data, isLoading, error, mutate } = useSWR(
    firebaseUser ? KEY : null,
    (url: string) => authFetch(url),
  );

  return {
    customers: (data?.data ?? []) as Customer[],
    total: data?.total ?? 0,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useCreateCustomer() {
  const authFetch = useAuthFetch();
  const [isCreating, setIsCreating] = useState(false);

  const createCustomer = async (input: CreateCustomerInput) => {
    setIsCreating(true);
    try {
      return await authFetch(KEY, { method: 'POST', body: JSON.stringify(input) });
    } finally {
      setIsCreating(false);
    }
  };

  return { createCustomer, isCreating };
}

export function useUpdateCustomer() {
  const authFetch = useAuthFetch();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCustomer = async (id: number, input: Partial<CreateCustomerInput>) => {
    setIsUpdating(true);
    try {
      return await authFetch(`${KEY}/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateCustomer, isUpdating };
}

export function useDeleteCustomer() {
  const authFetch = useAuthFetch();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteCustomer = async (id: number) => {
    setIsDeleting(true);
    try {
      return await authFetch(`${KEY}/${id}`, { method: 'DELETE' });
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteCustomer, isDeleting };
}