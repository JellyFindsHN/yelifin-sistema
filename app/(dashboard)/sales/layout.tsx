"use client";
import { ModuleGuard } from "@/components/shared/module-guard";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard module="SALES">{children}</ModuleGuard>;
}
