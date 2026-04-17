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

interface CategoriesResponse {
  data: TransactionCategory[];
}

interface CategoryResponse {
  data: TransactionCategory;
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

  const { data, error, mutate } = useSWR<CategoriesResponse>(
    firebaseUser ? url : null,
    (url: string) => authFetch(url)
  );

  return {
    categories: data?.data ?? [],
    isLoading: !error && !data,
    error,
    mutate,
  };
}

export function useCreateCategory() {
  const { firebaseUser } = useAuth();

  const create = async (payload: {
    name: string;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
  }): Promise<TransactionCategory> => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error("No autenticado");

    const res = await fetch("/api/transaction-categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error al crear categoría");
    }

    const result: CategoryResponse = await res.json();
    return result.data;
  };

  return { create };
}

export function useUpdateCategory() {
  const { firebaseUser } = useAuth();

  const update = async (
    id: number,
    payload: { name?: string; is_active?: boolean }
  ): Promise<TransactionCategory> => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error("No autenticado");

    const res = await fetch(`/api/transaction-categories/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error al actualizar categoría");
    }

    const result: CategoryResponse = await res.json();
    return result.data;
  };

  return { update };
}

export function useDeleteCategory() {
  const { firebaseUser } = useAuth();

  const remove = async (id: number): Promise<void> => {
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
      throw new Error(error.error || "Error al eliminar categoría");
    }
  };

  return { remove };
}