// lib/date-bounds.ts

/**
 * Computes UTC start/end bounds for a given period, accounting for the
 * client's timezone offset so that "today" means midnight-to-midnight in the
 * user's local time, not UTC.
 *
 * @param params - URLSearchParams from the incoming request
 *   Recognized params: date (YYYY-MM-DD), month (1-12), year, tz_offset (minutes, e.g. 360 for UTC-6)
 */
export function getUtcBounds(params: URLSearchParams): { startISO: string; endISO: string } {
  const date      = params.get("date");
  const month     = params.get("month");
  const year      = params.get("year");
  // getTimezoneOffset() on the browser returns positive for zones behind UTC (e.g. 360 for UTC-6)
  const offsetMs  = Number(params.get("tz_offset") ?? 0) * 60_000;
  const now       = new Date();

  if (date) {
    const start = new Date(new Date(`${date}T00:00:00.000Z`).getTime() + offsetMs);
    const end   = new Date(start.getTime() + 86_400_000);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }

  if (year && month) {
    const y = Number(year), m = Number(month);
    return {
      startISO: new Date(Date.UTC(y, m - 1, 1) + offsetMs).toISOString(),
      endISO:   new Date(Date.UTC(y, m,     1) + offsetMs).toISOString(),
    };
  }

  if (year) {
    const y = Number(year);
    return {
      startISO: new Date(Date.UTC(y,     0, 1) + offsetMs).toISOString(),
      endISO:   new Date(Date.UTC(y + 1, 0, 1) + offsetMs).toISOString(),
    };
  }

  // Default: current month
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return {
    startISO: new Date(Date.UTC(y, m,     1) + offsetMs).toISOString(),
    endISO:   new Date(Date.UTC(y, m + 1, 1) + offsetMs).toISOString(),
  };
}
