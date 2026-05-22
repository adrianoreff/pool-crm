/** Default route start and per-stop service duration (minutes). */
export const ROUTE_START_HOUR = 8;
export const ROUTE_START_MINUTE = 0;
export const DEFAULT_SERVICE_MINUTES = 18;

export type ScheduledStop = {
  estArrivalMinutes: number;
  estEndMinutes: number;
  estArrivalLabel: string;
};

export function minutesToLabel(totalMinutes: number): string {
  const total = Math.round(totalMinutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hour12 = h % 12 || 12;
  const ampm = h >= 12 ? 'pm' : 'am';
  return `est ${hour12}:${m.toString().padStart(2, '0')}${ampm}`;
}

/**
 * Build estimated arrival times from 8:00 AM + drive legs + service time per stop.
 * legs[i] = drive from stop i-1 to stop i (legs[0] unused / 0).
 */
export function buildRouteSchedule(
  stopCount: number,
  serviceMinutesPerStop: number[],
  driveLegMinutes: number[]
): ScheduledStop[] {
  const startMinutes = ROUTE_START_HOUR * 60 + ROUTE_START_MINUTE;
  const schedule: ScheduledStop[] = [];
  let cursor = startMinutes;

  for (let i = 0; i < stopCount; i++) {
    const driveMin = i === 0 ? 0 : Math.round(driveLegMinutes[i] ?? 0);
    const serviceMin = serviceMinutesPerStop[i] ?? DEFAULT_SERVICE_MINUTES;
    const arrival = cursor + driveMin;
    const end = arrival + serviceMin;
    schedule.push({
      estArrivalMinutes: arrival,
      estEndMinutes: end,
      estArrivalLabel: minutesToLabel(arrival),
    });
    cursor = end;
  }

  return schedule;
}

export function totalRouteMinutes(
  serviceMinutesPerStop: number[],
  driveLegMinutes: number[]
): number {
  const serviceTotal = serviceMinutesPerStop.reduce((a, b) => a + b, 0);
  const driveTotal = driveLegMinutes.reduce((a, b) => a + b, 0);
  return serviceTotal + driveTotal;
}
