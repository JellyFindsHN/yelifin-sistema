"use client";
import { ModuleGuard } from "@/components/shared/module-guard";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard module="INVENTORY">{children}</ModuleGuard>;
}
