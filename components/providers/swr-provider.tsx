// components/providers/swr-provider.tsx
'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 30_000,
        errorRetryCount: 2,
        onError: (error) => {
          console.error('SWR Error:', error.message);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}