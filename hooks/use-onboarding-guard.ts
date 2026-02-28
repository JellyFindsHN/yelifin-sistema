// hooks/use-onboarding-guard.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export function useOnboardingGuard() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) { setChecking(false); return; }

    const check = async () => {
      try {
        const token = await firebaseUser.getIdToken();
        const res   = await fetch("/api/onboarding", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setChecking(false); return; }

        const data = await res.json();
        if (!data?.data?.onboarding_completed) {
          router.replace("/onboarding");
        }
      } catch {
        // fail-open: si el check falla, dejar pasar
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [firebaseUser, loading]);

  return { checking };
}