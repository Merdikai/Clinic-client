import { describe, it, expect } from 'vitest';
import {
  todayPlainDateIso,
  toPlainDateIso,
  getClinicTimeZone,
} from './temporal.util';

describe('temporal.util', () => {
  it('should return a valid ISO plain date string for today', () => {
    const today = todayPlainDateIso();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should format a valid Date object to YYYY-MM-DD correctly', () => {
    const date = new Date(2026, 7, 15); // Month is 0-indexed: August 15, 2026
    const iso = toPlainDateIso(date);
    expect(iso).toBe('2026-08-15');
  });

  it('should format an ISO string to YYYY-MM-DD without off-by-one shifts', () => {
    const iso = toPlainDateIso('2026-11-20T14:30:00Z');
    expect(iso).toBe('2026-11-20');
  });

  it('should return empty string for null, undefined, or empty inputs', () => {
    expect(toPlainDateIso(null)).toBe('');
    expect(toPlainDateIso(undefined)).toBe('');
    expect(toPlainDateIso('')).toBe('');
  });

  it('should return a non-empty clinic time zone identifier', () => {
    const tz = getClinicTimeZone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });
});

