import { AppSettings, ApplicationStage, JobApplication, WorkMode } from '../types/application';
import { addDaysToISO, getTodayISO } from './dateUtils';

export const STORAGE_KEY = 'bitemyjob_applications_v1';
export const SETTINGS_STORAGE_KEY = 'bitemyjob_settings_v1';

const LEGACY_KEYS = ['bitemyjob_applications', 'bitemyjob_data', 'job_applications', 'applications'];

const VALID_STAGES = new Set<ApplicationStage>([
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
]);

const VALID_WORK_MODES = new Set<WorkMode>(['Remote', 'Hybrid', 'On-site']);

function normalizeStage(value: unknown): ApplicationStage {
  if (typeof value === 'string') {
    const formatted = value.trim();
    if (VALID_STAGES.has(formatted as ApplicationStage)) {
      return formatted as ApplicationStage;
    }
    const lower = formatted.toLowerCase();
    if (lower.includes('interview')) return 'Interview';
    if (lower.includes('screen') || lower.includes('phone')) return 'Screening';
    if (lower.includes('offer')) return 'Offer';
    if (lower.includes('reject')) return 'Rejected';
    if (lower.includes('withdraw')) return 'Withdrawn';
    if (lower.includes('save') || lower.includes('wish')) return 'Saved';
  }
  return 'Applied';
}

function normalizeWorkMode(value: unknown): WorkMode {
  if (typeof value === 'string' && VALID_WORK_MODES.has(value as WorkMode)) {
    return value as WorkMode;
  }
  return 'Hybrid';
}

function normalizeDateString(value: unknown, fallback?: string): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return fallback;
}

/**
 * Normalizes any existing or imported application record without discarding user fields.
 */
export function normalizeApplication(raw: Record<string, unknown>, index = 0): JobApplication {
  const today = getTodayISO();
  const appliedDate =
    normalizeDateString(raw.appliedDate ?? raw.dateApplied ?? raw.appliedAt, today) ?? today;
  const lastActivityDate =
    normalizeDateString(raw.lastActivityDate ?? raw.updatedAt ?? raw.lastTouchDate, appliedDate) ??
    appliedDate;

  const interviewDate = normalizeDateString(raw.interviewDate);
  const followUpDate = normalizeDateString(raw.followUpDate ?? raw.nextFollowUp);

  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id
        : `app_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    company: typeof raw.company === 'string' && raw.company.trim() ? raw.company.trim() : 'Untitled Company',
    role:
      typeof raw.role === 'string' && raw.role.trim()
        ? raw.role.trim()
        : typeof raw.title === 'string' && raw.title.trim()
          ? raw.title.trim()
          : 'Open Role',
    stage: normalizeStage(raw.stage ?? raw.status),
    location: typeof raw.location === 'string' ? raw.location : 'San Francisco, CA',
    workMode: normalizeWorkMode(raw.workMode),
    compensation: typeof raw.compensation === 'string' ? raw.compensation : typeof raw.salary === 'string' ? raw.salary : undefined,
    jobUrl: typeof raw.jobUrl === 'string' ? raw.jobUrl : typeof raw.url === 'string' ? raw.url : undefined,
    source: typeof raw.source === 'string' ? raw.source : undefined,
    contactName: typeof raw.contactName === 'string' ? raw.contactName : undefined,
    contactEmail: typeof raw.contactEmail === 'string' ? raw.contactEmail : undefined,
    appliedDate,
    lastActivityDate,
    followUpDate,
    interviewDate,
    interviewTime: typeof raw.interviewTime === 'string' ? raw.interviewTime : undefined,
    interviewRound: typeof raw.interviewRound === 'string' ? raw.interviewRound : undefined,
    interviewFormat: typeof raw.interviewFormat === 'string' ? raw.interviewFormat : undefined,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    jobDescription: typeof raw.jobDescription === 'string' ? raw.jobDescription : undefined,
    aiInsights:
      raw.aiInsights &&
      typeof raw.aiInsights === 'object' &&
      Array.isArray((raw.aiInsights as Record<string, unknown>).skills) &&
      Array.isArray((raw.aiInsights as Record<string, unknown>).interviewQuestions) &&
      typeof (raw.aiInsights as Record<string, unknown>).followUpDraft === 'string'
        ? {
            skills: ((raw.aiInsights as Record<string, unknown>).skills as unknown[]).filter(
              (s): s is string => typeof s === 'string'
            ),
            interviewQuestions: (
              (raw.aiInsights as Record<string, unknown>).interviewQuestions as unknown[]
            ).filter((q): q is string => typeof q === 'string'),
            followUpDraft: String((raw.aiInsights as Record<string, unknown>).followUpDraft),
            analyzedAt:
              typeof (raw.aiInsights as Record<string, unknown>).analyzedAt === 'string'
                ? String((raw.aiInsights as Record<string, unknown>).analyzedAt)
                : new Date().toISOString(),
          }
        : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

export function createSeedApplications(): JobApplication[] {
  const today = getTodayISO();
  const nowIso = new Date().toISOString();

  return [
    {
      id: 'bmj-seed-1',
      company: 'Linear',
      role: 'Staff Product Designer, Editorial Systems',
      stage: 'Interview',
      location: 'San Francisco, CA',
      workMode: 'Remote',
      compensation: '$210k – $245k',
      source: 'Direct Referral',
      contactName: 'Claire Vance',
      contactEmail: 'claire@linear.app',
      appliedDate: addDaysToISO(today, -11),
      lastActivityDate: addDaysToISO(today, -1),
      followUpDate: today, // Due Today
      interviewDate: addDaysToISO(today, 1),
      interviewTime: '10:30',
      interviewRound: 'Portfolio Deep Dive',
      interviewFormat: 'Zoom · 60 min',
      notes: 'Prepare two case studies focusing on high-density typography, keyboard-first workflows, and design token architecture.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bmj-seed-2',
      company: 'Stripe',
      role: 'Senior Frontend Engineer, Checkout',
      stage: 'Interview',
      location: 'Seattle, WA',
      workMode: 'Hybrid',
      compensation: '$195k – $230k',
      source: 'Recruiter Outreach',
      contactName: 'Marcus Chen',
      contactEmail: 'mchen@stripe.com',
      appliedDate: addDaysToISO(today, -14),
      lastActivityDate: addDaysToISO(today, -2),
      followUpDate: addDaysToISO(today, 3),
      interviewDate: today,
      interviewTime: '15:00',
      interviewRound: 'Architecture & Systems',
      interviewFormat: 'Google Meet · 45 min',
      notes: 'Review idempotent payment state machines, accessible form validation, and latency budgets under slow networks.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bmj-seed-3',
      company: 'The Atlantic',
      role: 'Lead Design Technologist',
      stage: 'Screening',
      location: 'New York, NY',
      workMode: 'Hybrid',
      compensation: '$175k – $205k',
      source: 'Editorial Network',
      contactName: 'Elena Rostova',
      contactEmail: 'erostova@theatlantic.com',
      appliedDate: addDaysToISO(today, -15),
      lastActivityDate: addDaysToISO(today, -10), // Idle (10 days)
      followUpDate: addDaysToISO(today, -3), // Overdue by 3d
      interviewDate: addDaysToISO(today, 4),
      interviewTime: '13:30',
      interviewRound: 'Editorial Engineering Sync',
      interviewFormat: 'Zoom · 30 min',
      notes: 'Sent interactive reading-room prototype last week. Follow up with updated archive layout samples.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bmj-seed-4',
      company: 'Anthropic',
      role: 'Product Engineer, Research Surfaces',
      stage: 'Applied',
      location: 'San Francisco, CA',
      workMode: 'Hybrid',
      compensation: '$220k – $260k',
      source: 'Company Careers',
      contactName: 'David Park',
      appliedDate: addDaysToISO(today, -12),
      lastActivityDate: addDaysToISO(today, -12), // Idle (12 days)
      followUpDate: addDaysToISO(today, -2), // Overdue by 2d
      notes: 'Tailored cover note around long-form reading interfaces and citation verification UX.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bmj-seed-5',
      company: 'Notion',
      role: 'Senior UI Engineer, Publishing',
      stage: 'Screening',
      location: 'San Francisco, CA',
      workMode: 'Hybrid',
      compensation: '$190k – $225k',
      source: 'LinkedIn',
      contactName: 'Priya Nair',
      appliedDate: addDaysToISO(today, -6),
      lastActivityDate: addDaysToISO(today, -2),
      followUpDate: today, // Due Today
      interviewDate: addDaysToISO(today, 6),
      interviewTime: '11:00',
      interviewRound: 'Technical Screen',
      interviewFormat: 'CoderPad + Zoom · 45 min',
      notes: 'Recruiter asked for availability next week. Confirm calendar invite and send GitHub link.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bmj-seed-6',
      company: 'Readwise',
      role: 'Founding Frontend Architect',
      stage: 'Applied',
      location: 'Remote',
      workMode: 'Remote',
      compensation: '$180k – $210k',
      source: 'Founder Note',
      appliedDate: addDaysToISO(today, -9),
      lastActivityDate: addDaysToISO(today, -9), // Idle (9 days)
      followUpDate: addDaysToISO(today, 2),
      notes: 'Highlight Reader EPUB annotation engine work in follow-up letter.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bmj-seed-7',
      company: 'Figma',
      role: 'Staff UI Systems Engineer',
      stage: 'Offer',
      location: 'San Francisco, CA',
      workMode: 'Hybrid',
      compensation: '$235k + Equity',
      source: 'Direct Referral',
      contactName: 'Hannah Brooks',
      appliedDate: addDaysToISO(today, -28),
      lastActivityDate: addDaysToISO(today, -1),
      followUpDate: addDaysToISO(today, 4),
      notes: 'Verbal offer received. Reviewing equity vesting schedule and start date options before Friday.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bmj-seed-8',
      company: 'Substack',
      role: 'Senior Product Engineer, Reader',
      stage: 'Saved',
      location: 'Remote',
      workMode: 'Remote',
      compensation: '$175k – $200k',
      source: 'Curated Watchlist',
      appliedDate: addDaysToISO(today, -8),
      lastActivityDate: addDaysToISO(today, -8), // Idle (8 days)
      followUpDate: addDaysToISO(today, 1),
      notes: 'Drafting tailored essay on publication typography and subscriber discovery before submitting.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

export function loadApplications(): JobApplication[] {
  if (typeof window === 'undefined') return createSeedApplications();

  try {
    const primaryRaw = window.localStorage.getItem(STORAGE_KEY);
    if (primaryRaw !== null) {
      const parsed = JSON.parse(primaryRaw);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => normalizeApplication(item as Record<string, unknown>, idx));
      }
    }

    for (const legacyKey of LEGACY_KEYS) {
      const legacyRaw = window.localStorage.getItem(legacyKey);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        const list = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.applications)
            ? parsed.applications
            : null;
        if (list && list.length > 0) {
          const normalized = list.map((item: unknown, idx: number) =>
            normalizeApplication((item ?? {}) as Record<string, unknown>, idx)
          );
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          return normalized;
        }
      }
    }

    const seed = createSeedApplications();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  } catch {
    return createSeedApplications();
  }
}

export function saveApplications(apps: JobApplication[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadSettings(): AppSettings {
  const defaults: AppSettings = {
    idleThresholdDays: 7,
    viewMode: 'board',
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      idleThresholdDays:
        typeof parsed.idleThresholdDays === 'number' && parsed.idleThresholdDays >= 1
          ? parsed.idleThresholdDays
          : 7,
      viewMode: parsed.viewMode === 'ledger' ? 'ledger' : 'board',
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}
