// app/(auth)/register/page.tsx
"use client";

import { useRedirectIfAuthenticated } from "@/hooks/use-redirect-if-authenticated";
import { LoadingScreen } from "@/hooks/ui/loading-screen";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const { loading } = useRedirectIfAuthenticated();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative">
      <Link href="/" className="fixed top-6 left-6 z-50">
        <Button variant="ghost" size="icon" className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </Link>

      {/* Left Side - Form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/50">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary">Nexly</span>
          </Link>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Crea tu cuenta</h1>
            <p className="text-muted-foreground">
              Comienza a gestionar tu emprendimiento hoy
            </p>
          </div>

          <RegisterForm />

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="hidden lg:block bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="relative h-full flex flex-col items-center justify-center p-12 text-primary-foreground">
          <div className="max-w-md space-y-6 text-center">
            <h2 className="text-4xl font-bold">Bienvenido a Nexly</h2>
            <p className="text-xl text-primary-foreground/90">
              El sistema todo-en-uno para gestionar tu inventario, ventas,
              finanzas y eventos en un solo lugar.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-3xl font-bold">$9.99</div>
                <div className="text-sm text-primary-foreground/80">Plan Pro / mes</div>
              </div>
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-3xl font-bold">Gratis</div>
                <div className="text-sm text-primary-foreground/80">Plan básico siempre</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}