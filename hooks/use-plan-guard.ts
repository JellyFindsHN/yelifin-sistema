"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

// Keep in sync with proxy.ts and app-sidebar.tsx
const ADMIN_ROUTES = ["/admin"];

const RESTRICTED_PLAN_ROUTES: Record<string, string[]> = {
  finanzas: ["/finances", "/settings"],
};

const PLAN_HOME: Record<string, string> = {
  finanzas: "/finances",
};

function getHome(planSlug: string | null): string {
  return (planSlug && PLAN_HOME[planSlug]) ?? "/dashboard";
}

export function usePlanGuard() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    if (loading || !user) return;

    const planSlug = user.subscription?.plan?.slug ?? null;

    // Admin-only routes
    if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
      if (planSlug !== "admin") {
        router.replace(getHome(planSlug));
      }
      return;
    }

    // Restricted-plan routes
    if (planSlug && planSlug in RESTRICTED_PLAN_ROUTES) {
      const allowed = RESTRICTED_PLAN_ROUTES[planSlug];
      const canAccess = allowed.some((prefix) => pathname.startsWith(prefix));
      if (!canAccess) {
        router.replace(getHome(planSlug));
      }
    }
  }, [pathname, user, loading, router]);
}
