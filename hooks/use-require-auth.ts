'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './use-auth';

export function useRequireAuth() {
  const { firebaseUser, user, loading, emailVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // No autenticado → login
    if (!firebaseUser) {
      router.push('/login');
      return;
    }

    // Autenticado pero sin verificar email → verify-email
    if (!emailVerified) {
      router.push('/verify-email');
    }
  }, [firebaseUser, loading, emailVerified, router]);

  // Retorna firebaseUser para auth básica y user para datos completos del perfil
  return { firebaseUser, user, loading, emailVerified };
}