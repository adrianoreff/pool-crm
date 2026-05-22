import { describe, it, expect } from 'vitest';
import { buildRouteSchedule, minutesToLabel } from './route-schedule';

describe('minutesToLabel', () => {
  it('rounds fractional minutes without decimal digits in label', () => {
    expect(minutesToLabel(8 * 60 + 48.0544449999999974)).toBe('est 8:48am');
    expect(minutesToLabel(9 * 60 + 33.737599999999993)).toBe('est 9:34am');
  });
});

describe('buildRouteSchedule', () => {
  it('produces clean est labels when drive legs are fractional', () => {
    const schedule = buildRouteSchedule(2, [18, 18], [0, 48.0544449999999974]);
    expect(schedule[0].estArrivalLabel).toBe('est 8:00am');
    expect(schedule[1].estArrivalLabel).toBe('est 9:06am');
    expect(schedule[1].estArrivalLabel).not.toMatch(/\./);
  });
});
