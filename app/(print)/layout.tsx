"use client";

import { useRequireAuth } from "@/hooks/use-require-auth";
import { LoadingScreen } from "@/hooks/ui/loading-screen";
import { SWRProvider } from "@/components/providers/swr-provider";

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useRequireAuth();
  if (loading) return <LoadingScreen />;
  if (!firebaseUser) return null;
  return <SWRProvider>{children}</SWRProvider>;
}
