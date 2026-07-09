'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './use-auth';

export function useRedirectIfAuthenticated() {
  const { firebaseUser, loading, emailVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // replace: no dejar /login o /register en el historial
    if (firebaseUser && emailVerified) {
      router.replace('/dashboard');
      return;
    }

    if (firebaseUser && !emailVerified) {
      router.replace('/verify-email');
    }
  }, [firebaseUser, loading, emailVerified, router]);

  return { firebaseUser, loading };
}