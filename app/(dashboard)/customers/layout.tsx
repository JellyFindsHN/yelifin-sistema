"use client";
import { ModuleGuard } from "@/components/shared/module-guard";

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard module="CUSTOMERS">{children}</ModuleGuard>;
}
