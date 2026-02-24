// components/landing/landing-header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function LandingHeader() {
  const { firebaseUser, user, loading } = useAuth();
  const isLoggedIn = !!firebaseUser;

  const displayName = user?.user?.display_name ?? firebaseUser?.displayName ?? firebaseUser?.email ?? "";
  const initials = displayName
    ? displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/50">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-primary">Nexly</span>
        </Link>

        {loading ? (
          <div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
        ) : isLoggedIn ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">{initials}</span>
            </div>
            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20 cursor-pointer">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ir al panel</span>
                <span className="sm:hidden">Panel</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <span className="hidden sm:inline">Iniciar Sesión</span>
                <span className="sm:hidden">Entrar</span>
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="gap-2 shadow-lg shadow-primary/30">
                <span className="hidden sm:inline">Registrarse</span>
                <span className="sm:hidden">Registro</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}