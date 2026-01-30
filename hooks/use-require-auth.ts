"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./use-auth";

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Si no está autenticado, redirigir al login
      router.push("/login");
    }
  }, [user, loading, router]);

  return { user, loading };
}