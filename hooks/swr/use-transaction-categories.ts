// hooks/swr/use-transaction-categories.ts
"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/use-auth";

export interface TransactionCategory {
  id: number;
  name: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  is_active: boolean;
}

function useAuthFetch() {
  const { firebaseUser } = useAuth();
  return async (url: string) => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error("No autenticado");
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error en la solicitud");
    }
    return res.json();
  };
}

export function useTransactionCategories(type?: string) {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const url = type
    ? `/api/transaction-categories?type=${type}`
    : "/api/transaction-categories";

  const { data, error, mutate } = useSWR<TransactionCategory[]>(
    firebaseUser ? url : null,
    (url: string) => authFetch(url)
  );

  return {
    categories: data ?? [],
    isLoading: !error && !data,
    error,
    mutate,
  };
}

export function useCreateCategory() {
  const { firebaseUser } = useAuth();

  const create = async (data: { name: string; type: string }) => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error("No autenticado");

    const res = await fetch("/api/transaction-categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error creating category");
    }
    return res.json();
  };

  return { create };
}

export function useUpdateCategory() {
  const { firebaseUser } = useAuth();

  const update = async (
    id: number,
    data: { name?: string; is_active?: boolean }
  ) => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error("No autenticado");

    const res = await fetch(`/api/transaction-categories/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error updating category");
    }
    return res.json();
  };

  return { update };
}

export function useDeleteCategory() {
  const { firebaseUser } = useAuth();

  const remove = async (id: number) => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error("No autenticado");

    const res = await fetch(`/api/transaction-categories/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error deleting category");
    }
    return res.json();
  };

  return { remove };
}