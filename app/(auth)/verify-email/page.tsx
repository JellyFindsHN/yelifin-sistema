'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useAuth } from '@/hooks/use-auth';
import { LoadingScreen } from '@/hooks/ui/loading-screen';
import { Button } from '@/components/ui/button';
import { Zap, Mail, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const { firebaseUser, loading, emailVerified } = useAuth();
  const router = useRouter();
  const [isSending,   setIsSending]   = useState(false);
  const [isChecking,  setIsChecking]  = useState(false);
  const [cooldown,    setCooldown]    = useState(0);

  useEffect(() => {
    if (loading) return;
    // ✅ Redirige a onboarding (no a dashboard) después de verificar
    if (emailVerified) { router.push('/onboarding'); return; }
    if (!firebaseUser) { router.push('/login'); return; }
  }, [firebaseUser, loading, emailVerified, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!firebaseUser || cooldown > 0) return;
    setIsSending(true);
    try {
      await sendEmailVerification(firebaseUser);
      toast.success('Correo enviado. Revisa tu bandeja de entrada.');
      setCooldown(RESEND_COOLDOWN);
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        toast.error('Demasiados intentos. Espera unos minutos.');
      } else {
        toast.error('Error al enviar el correo. Intenta de nuevo.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!firebaseUser) return;
    setIsChecking(true);
    try {
      await firebaseUser.reload();
      if (firebaseUser.emailVerified) {
        toast.success('¡Email verificado! Configurando tu cuenta...');
        // ✅ Va a onboarding, no a dashboard
        router.push('/onboarding');
      } else {
        toast.error('Tu email aún no ha sido verificado.');
      }
    } catch {
      toast.error('Error al verificar. Intenta de nuevo.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) return <LoadingScreen />;
  if (!firebaseUser) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="bg-background rounded-2xl border shadow-sm p-8 space-y-6">

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/50">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary">Nexly</span>
          </div>

          <div className="space-y-3">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Verifica tu email</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Te enviamos un correo de verificación a{' '}
              <span className="font-medium text-foreground">{firebaseUser.email}</span>.
              Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg px-4 py-3 space-y-1">
            <p className="text-xs text-muted-foreground">Registrado como</p>
            <p className="font-medium text-sm">{firebaseUser.displayName}</p>
            <p className="text-sm text-muted-foreground">{firebaseUser.email}</p>
          </div>

          <div className="space-y-3">
            <Button className="w-full" onClick={handleCheckVerification} disabled={isChecking}>
              {isChecking ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Verificando...</>
              ) : (
                'Ya verifiqué mi email'
              )}
            </Button>

            <Button variant="outline" className="w-full" onClick={handleResend} disabled={isSending || cooldown > 0}>
              {isSending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
              ) : cooldown > 0 ? (
                `Reenviar en ${cooldown}s`
              ) : (
                'Reenviar correo de verificación'
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            ¿No encuentras el correo? Revisa tu carpeta de spam.
          </p>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión y usar otra cuenta
          </button>
        </div>
      </div>
    </div>
  );
}