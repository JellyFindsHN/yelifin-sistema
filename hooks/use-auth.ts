'use client';

import { useEffect, useState } from 'react';
import { User as FirebaseUser, onIdTokenChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { setTokenCookie, clearTokenCookie } from '@/lib/token-cookie';
import { UserProfileResponse } from '@/types';
import useSWR from 'swr';

const PROFILE_KEY = '/api/auth/me';

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);

  useEffect(() => {
    // onIdTokenChanged se dispara al iniciar/cerrar sesión Y cada vez que
    // Firebase refresca el ID token (~1h), así la cookie que lee el proxy
    // nunca queda vencida mientras haya sesión activa.
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        setTokenCookie(idToken);
        setToken(idToken);
      } else {
        clearTokenCookie();
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
      setTokenCookie(idToken);
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
