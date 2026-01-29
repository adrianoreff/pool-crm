import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(time: string) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Parse a YYYY-MM-DD date string as local date (no UTC conversion).
 * Using new Date("2026-01-30") interprets as midnight UTC, which can show the previous day in PST.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/**
 * Format appointment scheduled_date (YYYY-MM-DD) for display. Uses local date to avoid timezone shift.
 */
export function formatAppointmentDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', options);
}

/** Long format: "Monday, January 30, 2026" */
export function formatAppointmentDateLong(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Short format: "Mon, Jan 30" */
export function formatAppointmentDateShort(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Today's date as YYYY-MM-DD in local timezone (for comparing with scheduled_date). */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get local YYYY-MM-DD from an ISO date string (for filtering call_logs etc by "today"). */
export function getLocalDateStringFromISO(isoString: string): string {
  const d = new Date(isoString);
  return getLocalDateString(d);
}
