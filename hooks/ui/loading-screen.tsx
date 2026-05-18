import { Loader2, Zap } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-b from-primary/5 via-background to-primary/5">
      <div className="flex flex-col items-center gap-4">
        <div className="size-16 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/50 animate-pulse">
          <Zap className="size-10 text-primary-foreground" />
        </div>
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </div>
    </div>
  );
}