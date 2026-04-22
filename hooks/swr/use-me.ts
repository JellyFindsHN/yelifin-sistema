// hooks/swr/use-me.ts
"use client";

import useSWR from "swr";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type {
  UserProfileResponse,
  FeatureKey,
  FeatureCategory,
} from "@/types";

const KEY = "/api/auth/me";

function useAuthFetch() {
  const { firebaseUser } = useAuth();

  return async (url: string, options: RequestInit = {}) => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error("No autenticado");

    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Error al obtener perfil");
    }

    return res.json();
  };
}

export type UpdateProfileInput = {
  display_name?:     string | null;
  business_name?:    string | null;
  business_logo_url?: string | null;
  timezone?:         string;
  currency?:         string;
  locale?:           string;
};

export function useUpdateProfile() {
  const authFetch = useAuthFetch();
  const [isSaving, setIsSaving] = useState(false);

  const updateProfile = async (input: UpdateProfileInput) => {
    setIsSaving(true);
    try {
      return await authFetch(KEY, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return { updateProfile, isSaving };
}

export function useUploadLogo() {
  const { firebaseUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const uploadLogo = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) throw new Error("No autenticado");

      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Error al subir imagen");
      }

      const { url } = await res.json();
      return url as string;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadLogo, isUploading };
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