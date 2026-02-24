// components/landing/landing-cta.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function LandingCta() {
  const { firebaseUser, loading } = useAuth();
  const isLoggedIn = !!firebaseUser;

  if (loading) return <div className="h-14 w-48 rounded-lg bg-muted animate-pulse mx-auto" />;

  if (isLoggedIn) {
    return (
      <Link href="/dashboard" className="w-full sm:w-auto">
        <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 gap-2 shadow-lg shadow-primary/30 cursor-pointer">
          Ir al panel
          <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Link href="/register" className="w-full sm:w-auto">
        <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 gap-2 shadow-lg shadow-primary/30 cursor-pointer">
          Comenzar Ahora
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </Link>
      <Link href="#pricing" className="w-full sm:w-auto">
        <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14">
          Ver Precios
        </Button>
      </Link>
    </>
  );
}