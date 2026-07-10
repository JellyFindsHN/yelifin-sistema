"use client";
import { ModuleGuard } from "@/components/shared/module-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard module="DASHBOARD">{children}</ModuleGuard>;
}
