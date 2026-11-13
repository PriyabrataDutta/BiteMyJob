import { JobApplication } from '../types/application';
import { parseLocalDate } from './dateUtils';

export function parseInterviewDurationMinutes(format?: string): number {
  if (!format) return 45;
  const minMatch = /(\d+)\s*(?:min|m\b)/i.exec(format);
  if (minMatch) {
    const mins = Number(minMatch[1]);
    if (mins > 0 && mins <= 480) return mins;
  }
  const hrMatch = /(\d+(?:\.\d+)?)\s*(?:hr|hour|h\b)/i.exec(format);
  if (hrMatch) {
    const mins = Math.round(Number(hrMatch[1]) * 60);
    if (mins > 0 && mins <= 480) return mins;
  }
  return 45;
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function formatIcsDateTime(
  isoDate: string,
  time24 = '09:00',
  offsetMinutes = 0
): string {
  const baseDate = parseLocalDate(isoDate);
  if (!baseDate) return '';

  const [rawH, rawM] = time24.split(':');
  const hours = Number(rawH);
  const minutes = Number(rawM);

  const d = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    Number.isFinite(hours) ? hours : 9,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0
  );

  if (offsetMinutes !== 0) {
    d.setMinutes(d.getMinutes() + offsetMinutes);
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  return `${yyyy}${mm}${dd}T${hh}${min}${ss}`;
}

export function formatIcsUtcStamp(date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}

export function buildIcsEvent(app: JobApplication, dtStamp = formatIcsUtcStamp()): string {
  if (!app.interviewDate) {
    throw new Error('Cannot build .ics event without an interviewDate.');
  }

  const startTime = app.interviewTime && /^\d{2}:\d{2}/.test(app.interviewTime)
    ? app.interviewTime
    : '09:00';
  const durationMinutes = parseInterviewDurationMinutes(app.interviewFormat);

  const dtStart = formatIcsDateTime(app.interviewDate, startTime, 0);
  const dtEnd = formatIcsDateTime(app.interviewDate, startTime, durationMinutes);

  const summaryParts = [`Interview: ${app.company} — ${app.role}`];
  if (app.interviewRound) {
    summaryParts.push(`(${app.interviewRound})`);
  }
  const summary = summaryParts.join(' ');

  const descriptionLines = [
    `Role: ${app.role}`,
    `Company: ${app.company}`,
    app.interviewRound ? `Round: ${app.interviewRound}` : '',
    app.interviewFormat ? `Format: ${app.interviewFormat}` : '',
    app.contactName
      ? `Contact: ${app.contactName}${app.contactEmail ? ` (${app.contactEmail})` : ''}`
      : '',
    app.notes ? `Prep Notes: ${app.notes}` : '',
    app.aiInsights?.skills?.length
      ? `Key Skills: ${app.aiInsights.skills.join(', ')}`
      : '',
  ].filter(Boolean);

  const location = app.interviewFormat || app.location || app.workMode;

  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(`${app.id}-${app.interviewDate}@bitemyjob.local`)}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ];

  return lines.join('\r\n');
}

export function generateIcsCalendar(
  apps: JobApplication[],
  dtStamp = formatIcsUtcStamp()
): string {
  const scheduled = apps.filter((a) => Boolean(a.interviewDate));
  const events = scheduled.map((app) => buildIcsEvent(app, dtStamp));

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BiteMyJob//Career Ledger//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function slugifyFilename(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'interview'
  );
}

export function downloadIcsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
