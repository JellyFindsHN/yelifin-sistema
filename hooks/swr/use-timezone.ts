"use client";

import { useMe } from "@/hooks/swr/use-me";

const DEFAULT_TZ = "America/Tegucigalpa";

export function useTimezone() {
  const { profile } = useMe();
  return profile?.timezone ?? DEFAULT_TZ;
}

export function formatInTZ(
  dateStr: string | Date,
  tz: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Date(dateStr).toLocaleDateString("es-HN", { timeZone: tz, ...options });
}
