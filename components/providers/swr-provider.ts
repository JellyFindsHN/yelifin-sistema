'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';
import { auth } from '@/lib/firebase';

interface SWRProviderProps {
  children: ReactNode;
}

// Fetcher global con autenticación de Firebase
const fetcher = async (url: string) => {
  try {
    const token = await auth.currentUser?.getIdToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const error: any = new Error('Request failed');
      error.info = await res.json();
      error.status = res.status;
      throw error;
    }

    return res.json();
  } catch (error) {
    console.error('SWR Fetcher error:', error);
    throw error;
  }
};

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig 
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
        dedupingInterval: 2000,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        onError: (error: any, key: string) => {
          console.error('SWR Error:', { key, error });
          
          if (error.status === 401) {
            window.location.href = '/login';
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}