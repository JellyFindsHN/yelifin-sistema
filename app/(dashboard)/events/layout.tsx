"use client";
import { ModuleGuard } from "@/components/shared/module-guard";

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard module="EVENTS">{children}</ModuleGuard>;
}
