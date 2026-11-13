import { Temporal as PolyfillTemporal } from '@js-temporal/polyfill';

export type TemporalNamespace = typeof PolyfillTemporal;

/**
 * Resolves the native ES2026 globalThis.Temporal when available,
 * falling back seamlessly to @js-temporal/polyfill.
 */
export const Temporal: TemporalNamespace =
  (globalThis as unknown as { Temporal?: TemporalNamespace }).Temporal ?? PolyfillTemporal;

export function getClinicTimeZone(): string {
  try {
    return Temporal.Now.timeZoneId();
  } catch {
    return 'UTC';
  }
}

export function todayPlainDateIso(): string {
  return Temporal.Now.plainDateISO().toString();
}

/**
 * Converts a Date or ISO date/datetime string into a YYYY-MM-DD PlainDate string
 * without local-midnight timezone off-by-one shifts.
 */
export function toPlainDateIso(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();
    return Temporal.PlainDate.from({ year, month, day }).toString();
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return Temporal.PlainDate.from(trimmed).toString();
    }
    if (trimmed.includes('T') && (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed))) {
      return Temporal.Instant.from(trimmed)
        .toZonedDateTimeISO(getClinicTimeZone())
        .toPlainDate()
        .toString();
    }
    return Temporal.PlainDateTime.from(trimmed).toPlainDate().toString();
  } catch {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return Temporal.PlainDate.from({
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate()
    }).toString();
  }
}

/**
 * Extracts HH:mm in the clinic's timezone using Temporal.Instant / PlainDateTime.
 */
export function formatTimeHHmm(value: string | Date | null | undefined): string {
  if (!value) {
    return '09:00';
  }

  try {
    const iso = value instanceof Date ? value.toISOString() : value.trim();
    if (!iso) {
      return '09:00';
    }
    const zdt =
      iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso)
        ? Temporal.Instant.from(iso).toZonedDateTimeISO(getClinicTimeZone())
        : Temporal.PlainDateTime.from(iso).toZonedDateTime(getClinicTimeZone());
    return `${String(zdt.hour).padStart(2, '0')}:${String(zdt.minute).padStart(2, '0')}`;
  } catch {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
      return '09:00';
    }
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

/**
 * Combines YYYY-MM-DD and HH:mm safely in the clinic timezone and returns a UTC ISO instant string.
 */
export function combineDateAndTimeToUtcIso(dateInput: string | Date, timeHHmm: string): string {
  const datePart = toPlainDateIso(dateInput) || todayPlainDateIso();
  const parts = timeHHmm.split(':');
  const hour = Number.parseInt(parts[0] ?? '9', 10);
  const minute = Number.parseInt(parts[1] ?? '0', 10);

  const pdt = Temporal.PlainDateTime.from(`${datePart}T00:00:00`).with({
    hour: Number.isFinite(hour) ? Math.min(Math.max(hour, 0), 23) : 9,
    minute: Number.isFinite(minute) ? Math.min(Math.max(minute, 0), 59) : 0,
    second: 0,
    millisecond: 0
  });

  return pdt.toZonedDateTime(getClinicTimeZone()).toInstant().toString();
}

export function toEndOfDayOrStartIso(value: Date | string): string {
  const plain = toPlainDateIso(value) || todayPlainDateIso();
  return Temporal.PlainDateTime.from(`${plain}T00:00:00`)
    .toZonedDateTime(getClinicTimeZone())
    .toInstant()
    .toString();
}

export function calculateAgeFromDob(dob: string | Date | null | undefined): number | null {
  const plainIso = toPlainDateIso(dob);
  if (!plainIso) {
    return null;
  }

  try {
    const birth = Temporal.PlainDate.from(plainIso);
    const today = Temporal.Now.plainDateISO();
    const diff = birth.until(today, { largestUnit: 'year' });
    return Math.max(0, diff.years);
  } catch {
    return null;
  }
}

export interface TimeframeDateRange {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly fileLabel: string;
}

export function buildTemporalTimeframeRange(
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all',
  customDate: Date | string,
  customMonth: number,
  customYear: number
): TimeframeDateRange {
  const tz = getClinicTimeZone();
  const today = Temporal.Now.plainDateISO(tz);

  switch (timeframe) {
    case 'daily': {
      const target = Temporal.PlainDate.from(toPlainDateIso(customDate) || today.toString());
      const start = target.toZonedDateTime({ timeZone: tz, plainTime: '00:00:00' }).toInstant().toString();
      const end = target.toZonedDateTime({ timeZone: tz, plainTime: '23:59:59' }).toInstant().toString();
      return { startDate: start, endDate: end, fileLabel: `daily-${target.toString()}` };
    }
    case 'weekly': {
      const startDay = today.subtract({ days: 7 });
      const start = startDay.toZonedDateTime({ timeZone: tz, plainTime: '00:00:00' }).toInstant().toString();
      const end = today.toZonedDateTime({ timeZone: tz, plainTime: '23:59:59' }).toInstant().toString();
      return { startDate: start, endDate: end, fileLabel: `weekly-${today.toString()}` };
    }
    case 'monthly': {
      const firstDay = Temporal.PlainDate.from({ year: customYear, month: customMonth, day: 1 });
      const lastDay = firstDay.with({ day: firstDay.daysInMonth });
      const start = firstDay.toZonedDateTime({ timeZone: tz, plainTime: '00:00:00' }).toInstant().toString();
      const end = lastDay.toZonedDateTime({ timeZone: tz, plainTime: '23:59:59' }).toInstant().toString();
      return {
        startDate: start,
        endDate: end,
        fileLabel: `monthly-${customYear}-${String(customMonth).padStart(2, '0')}`
      };
    }
    case 'yearly': {
      const firstDay = Temporal.PlainDate.from({ year: customYear, month: 1, day: 1 });
      const lastDay = Temporal.PlainDate.from({ year: customYear, month: 12, day: 31 });
      const start = firstDay.toZonedDateTime({ timeZone: tz, plainTime: '00:00:00' }).toInstant().toString();
      const end = lastDay.toZonedDateTime({ timeZone: tz, plainTime: '23:59:59' }).toInstant().toString();
      return { startDate: start, endDate: end, fileLabel: `yearly-${customYear}` };
    }
    case 'all':
      return { fileLabel: `all-records-${today.toString()}` };
  }
}

