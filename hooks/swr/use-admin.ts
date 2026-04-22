// hooks/swr/use-admin.ts
"use client";

import useSWR from "swr";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

function useAuthFetch() {
  const { firebaseUser } = useAuth();
  return async (url: string, options: RequestInit = {}) => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error("No autenticado");
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error en la solicitud");
    }
    return res.json();
  };
}

// ── Types ─────────────────────────────────────────────────────────────

export type AdminUserRow = {
  id:                    number;
  email:                 string;
  display_name:          string | null;
  is_active:             boolean;
  created_at:            string;
  business_name:         string | null;
  business_logo_url:     string | null;
  currency:              string | null;
  subscription_id:       number | null;
  subscription_status:   string | null;
  trial_end_date:        string | null;
  current_period_end:    string | null;
  plan_id:               number | null;
  plan_name:             string | null;
  plan_slug:             string | null;
  price_usd:             number | null;
};

export type AdminUserDetail = AdminUserRow & {
  firebase_uid:          string;
  photo_url:             string | null;
  timezone:              string;
  locale:                string;
  onboarding_completed:  boolean;
  trial_start_date:      string | null;
  current_period_start:  string | null;
  cancel_at_period_end:  boolean;
  cancelled_at:          string | null;
  provider:              string | null;
  billing_interval:      string | null;
  max_products:          number | null;
  max_sales_per_month:   number | null;
};

export type AdminUserActivity = {
  total_sales:        number;
  total_products:     number;
  total_transactions: number;
};

export type AdminPlan = {
  id:                   number;
  name:                 string;
  slug:                 string;
  description:          string | null;
  price_usd:            number;
  billing_interval:     string | null;
  max_products:         number | null;
  max_sales_per_month:  number | null;
  max_storage_mb:       number | null;
  is_active:            boolean;
  user_count:           number;
};

export type AdminStats = {
  total_users:    number;
  active_users:   number;
  inactive_users: number;
  new_this_month: number;
  trial_count:    number;
  active_count:   number;
  cancelled_count: number;
  expired_count:  number;
  past_due_count: number;
};

// ── Hooks ─────────────────────────────────────────────────────────────

export function useAdminStats() {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();
  const { data, isLoading, error, mutate } = useSWR(
    firebaseUser ? "/api/admin/stats" : null,
    (u: string) => authFetch(u),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  return {
    counts:      (data?.counts  ?? null) as AdminStats | null,
    planStats:   (data?.planStats  ?? []) as { id: number; name: string; slug: string; user_count: number }[],
    recentUsers: (data?.recentUsers ?? []) as AdminUserRow[],
    isLoading,
    error: (error as any)?.message ?? null,
    mutate,
  };
}

export function useAdminUsers(params: { search?: string; status?: string; page?: number } = {}) {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();
  const { search = "", status = "all", page = 1 } = params;
  const key = firebaseUser
    ? `/api/admin/users?search=${encodeURIComponent(search)}&status=${status}&page=${page}`
    : null;

  const { data, isLoading, error, mutate } = useSWR(
    key,
    (u: string) => authFetch(u),
    { revalidateOnFocus: false, dedupingInterval: 15_000 }
  );
  return {
    users:    (data?.data   ?? []) as AdminUserRow[],
    total:    (data?.total  ?? 0)  as number,
    pages:    (data?.pages  ?? 1)  as number,
    isLoading,
    error:    (error as any)?.message ?? null,
    mutate,
  };
}

export function useAdminUser(id: number | null) {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();
  const { data, isLoading, error, mutate } = useSWR(
    firebaseUser && id ? `/api/admin/users/${id}` : null,
    (u: string) => authFetch(u),
    { revalidateOnFocus: false }
  );
  return {
    user:     (data?.user     ?? null) as AdminUserDetail | null,
    activity: (data?.activity ?? null) as AdminUserActivity | null,
    isLoading,
    error:    (error as any)?.message ?? null,
    mutate,
  };
}

export function useAdminPlans() {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();
  const { data, isLoading, error, mutate } = useSWR(
    firebaseUser ? "/api/admin/plans" : null,
    (u: string) => authFetch(u),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
  return {
    plans:    (data?.data ?? []) as AdminPlan[],
    isLoading,
    error:    (error as any)?.message ?? null,
    mutate,
  };
}

export function useAdminUpdateUser(id: number | null) {
  const authFetch = useAuthFetch();
  const [isSaving, setIsSaving] = useState(false);
  const updateUser = async (payload: Record<string, unknown>) => {
    if (!id) throw new Error("ID requerido");
    setIsSaving(true);
    try {
      return await authFetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } finally {
      setIsSaving(false);
    }
  };
  return { updateUser, isSaving };
}
