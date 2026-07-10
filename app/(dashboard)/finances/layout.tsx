"use client";
import { ModuleGuard } from "@/components/shared/module-guard";

export default function FinancesLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard module="FINANCES">{children}</ModuleGuard>;
}
