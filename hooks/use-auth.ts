'use client';

import { useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserProfileResponse } from '@/types';
import useSWR from 'swr';

const PROFILE_KEY = '/api/auth/me';

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        setToken(idToken);
      } else {
        setToken(null);
      }
      setFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // SWR cachea el perfil — no se vuelve a pedir hasta que expire
  const { data: user, isLoading: profileLoading, mutate: mutateProfile } = useSWR<UserProfileResponse>(
    token ? PROFILE_KEY : null,
    async (url: string) => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al obtener perfil');
      return res.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000, // 1 minuto sin re-fetch
      revalidateOnReconnect: false,
    }
  );

  const refreshProfile = async () => {
    if (firebaseUser) {
      const idToken = await firebaseUser.getIdToken(true);
      setToken(idToken);
      await mutateProfile();
    }
  };

  return {
    firebaseUser,
    user,
    loading: firebaseLoading || (!!token && profileLoading),
    emailVerified: firebaseUser?.emailVerified ?? false,
    refreshProfile,
  };
}