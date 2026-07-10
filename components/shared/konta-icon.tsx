import { cn } from "@/lib/utils";

export function KontaIcon({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Konta"
      className={cn(
        "shrink-0 bg-[url('/icon.svg')] bg-contain bg-center bg-no-repeat",
        className
      )}
    />
  );
}
