// hooks/swr/use-me.ts
"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/use-auth";
import type {
  UserProfileResponse,
  FeatureKey,
  FeatureCategory,
} from "@/types";

const KEY = "/api/auth/me";

function useAuthFetch() {
  const { firebaseUser } = useAuth();

  return async (url: string) => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error("No autenticado");

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Error al obtener perfil");
    }

    // El endpoint /api/auth/me devuelve el objeto directamente,
    // no envuelto en { data: ... }, así que retornamos tal cual.
    return res.json() as Promise<UserProfileResponse>;
  };
}

export function useMe() {
  const { firebaseUser } = useAuth();
  const authFetch = useAuthFetch();

  const {
    data,
    isLoading,
    error,
    mutate,
  } = useSWR<UserProfileResponse>(
    firebaseUser ? KEY : null,
    (u: string) => authFetch(u),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      revalidateOnReconnect: false,
    }
  );

  const user = data?.user ?? null;
  const profile = data?.profile ?? null;
  const subscription = data?.subscription ?? null;
  const features = data?.features ?? {};
  const onboardingCompleted = profile?.onboarding_completed ?? false;

  const hasFeature = (key: FeatureKey): boolean => {
    if (!features) return false;
    return Object.values(features).some((list) =>
      list?.some((f) => f.key === key)
    );
  };

  const hasFeatureInCategory = (category: FeatureCategory): boolean => {
    const list = features?.[category];
    return !!(list && list.length > 0);
  };

  const hasActiveSubscription =
    subscription?.status === "TRIAL" || subscription?.status === "ACTIVE";

  const isTrial = subscription?.status === "TRIAL";

  return {
    data,
    user,
    profile,
    subscription,
    features,
    onboardingCompleted,
    hasFeature,
    hasFeatureInCategory,
    hasActiveSubscription,
    isTrial,
    isLoading,
    error: (error as any)?.message ?? null,
    mutate,
  };
}