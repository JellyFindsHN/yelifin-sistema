import { Loader2 } from "lucide-react";
import Image from "next/image";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-b from-primary/5 via-background to-primary/5">
      <div className="flex flex-col items-center gap-4">
        <Image src="/icon.svg" alt="Konta" width={64} height={64} className="size-16 shadow-lg shadow-primary/50 rounded-lg animate-pulse" />
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </div>
    </div>
  );
}