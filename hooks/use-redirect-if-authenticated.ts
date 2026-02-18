'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './use-auth';

export function useRedirectIfAuthenticated() {
  const { firebaseUser, loading, emailVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (firebaseUser && emailVerified) {
      router.push('/dashboard');
      return;
    }

    if (firebaseUser && !emailVerified) {
      router.push('/verify-email');
    }
  }, [firebaseUser, loading, emailVerified, router]);

  return { firebaseUser, loading };
}