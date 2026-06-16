"use client";
import { ModuleGuard } from "@/components/shared/module-guard";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard module="REPORTS">{children}</ModuleGuard>;
}
