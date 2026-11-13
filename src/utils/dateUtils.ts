import { ApplicationStage, FollowUpUrgency, JobApplication } from '../types/application';

const CLOSED_STAGES: ReadonlySet<ApplicationStage> = new Set(['Rejected', 'Withdrawn']);

/**
 * Returns local calendar date formatted as YYYY-MM-DD.
 */
export function getTodayISO(offsetDays = 0): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays);
  }
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date at midnight.
 */
export function parseLocalDate(isoDate?: string): Date | null {
  if (!isoDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const d = new Date(year, month, day);
  d.setHours(0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Whole-day difference: targetDate - baseDate.
 * Positive => target is in the future.
 * Zero => same day.
 * Negative => target is in the past.
 */
export function diffCalendarDays(targetISO: string, baseISO = getTodayISO()): number {
  const target = parseLocalDate(targetISO);
  const base = parseLocalDate(baseISO);
  if (!target || !base) return 0;
  const msPerDay = 86_400_000;
  return Math.round((target.getTime() - base.getTime()) / msPerDay);
}

export function addDaysToISO(isoDate: string, days: number): string {
  const base = parseLocalDate(isoDate) ?? parseLocalDate(getTodayISO())!;
  base.setDate(base.getDate() + days);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getFollowUpUrgency(
  followUpDate: string | undefined,
  stage: ApplicationStage,
  todayISO = getTodayISO()
): FollowUpUrgency {
  if (!followUpDate || CLOSED_STAGES.has(stage)) return 'none';
  const delta = diffCalendarDays(followUpDate, todayISO);
  if (delta < 0) return 'overdue';
  if (delta === 0) return 'due-today';
  return 'upcoming';
}

export function getOverdueDays(followUpDate: string | undefined, todayISO = getTodayISO()): number {
  if (!followUpDate) return 0;
  const delta = diffCalendarDays(followUpDate, todayISO);
  return delta < 0 ? Math.abs(delta) : 0;
}

export function getIdleDays(app: JobApplication, todayISO = getTodayISO()): number {
  const anchor = app.lastActivityDate || app.appliedDate;
  if (!anchor) return 0;
  const delta = diffCalendarDays(todayISO, anchor);
  return Math.max(0, delta);
}

export function isApplicationIdle(
  app: JobApplication,
  thresholdDays: number,
  todayISO = getTodayISO()
): boolean {
  if (CLOSED_STAGES.has(app.stage) || app.stage === 'Offer') return false;
  return getIdleDays(app, todayISO) >= thresholdDays;
}

export function isUpcomingInterview(
  app: JobApplication,
  todayISO = getTodayISO()
): boolean {
  if (!app.interviewDate || CLOSED_STAGES.has(app.stage)) return false;
  return diffCalendarDays(app.interviewDate, todayISO) >= 0;
}

export function formatShortDate(isoDate?: string): string {
  const parsed = parseLocalDate(isoDate);
  if (!parsed) return '—';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatFullDate(isoDate?: string): string {
  const parsed = parseLocalDate(isoDate);
  if (!parsed) return '—';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime12h(time24?: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatRelativeDayLabel(isoDate: string, todayISO = getTodayISO()): string {
  const delta = diffCalendarDays(isoDate, todayISO);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return 'Yesterday';
  if (delta > 1 && delta <= 7) {
    const parsed = parseLocalDate(isoDate);
    if (parsed) {
      return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  }
  return formatShortDate(isoDate);
}
