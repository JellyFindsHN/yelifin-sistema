// hooks/use-auth.ts
'use client';

import { useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserProfileResponse } from '@/types';

type AuthState = {
  firebaseUser: FirebaseUser | null;
  user: UserProfileResponse | null;
  loading: boolean;
  emailVerified: boolean;
  refreshProfile: () => Promise<void>;
};

export function useAuth(): AuthState {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (idToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) {
        setUser(null);
        return;
      }
      const profile: UserProfileResponse = await response.json();
      setUser(profile);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        await fetchProfile(idToken);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!firebaseUser) return;
    const idToken = await firebaseUser.getIdToken(true);
    await fetchProfile(idToken);
  };

  return {
    firebaseUser,
    user,
    loading,
    emailVerified: firebaseUser?.emailVerified ?? false,
    refreshProfile,
  };
}