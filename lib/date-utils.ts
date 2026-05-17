// lib/date-utils.ts

/**
 * Converts a "YYYY-MM-DD" string from <input type="date"> to an ISO timestamp
 * using the current browser time for the time portion, so the record is stored
 * at the actual local moment the user submits the form.
 */
export function localDateToISO(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const now = new Date();
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
}

/**
 * Converts a Date object or ISO string to "YYYY-MM-DD" using the browser's
 * LOCAL timezone. Use this to populate <input type="date"> from stored data.
 */
export function toLocalDateInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
