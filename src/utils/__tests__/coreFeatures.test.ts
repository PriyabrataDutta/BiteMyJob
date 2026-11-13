import { beforeEach, describe, expect, it } from 'vitest';
import { JobApplication } from '../../types/application';
import {
  addDaysToISO,
  getFollowUpUrgency,
  getIdleDays,
  getOverdueDays,
  isApplicationIdle,
  isUpcomingInterview,
} from '../dateUtils';
import {
  STORAGE_KEY,
  createDefaultPrepRecord,
  loadApplications,
  normalizeApplication,
} from '../storage';

function makeApp(overrides: Partial<JobApplication> = {}): JobApplication {
  return {
    id: 'app-1',
    company: 'Linear',
    role: 'Staff Engineer',
    stage: 'Applied',
    location: 'San Francisco, CA',
    workMode: 'Remote',
    appliedDate: '2026-05-01',
    lastActivityDate: '2026-05-10',
    notes: 'Initial note',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('Existing Core Features: Follow-up Urgency, Idle Alerts & Interviews', () => {
  const today = '2026-05-15';

  it('classifies follow-up dates as due-today, overdue, upcoming, or none', () => {
    expect(getFollowUpUrgency(today, 'Applied', today)).toBe('due-today');
    expect(getFollowUpUrgency('2026-05-12', 'Screening', today)).toBe('overdue');
    expect(getFollowUpUrgency('2026-05-18', 'Interview', today)).toBe('upcoming');
    expect(getFollowUpUrgency(undefined, 'Applied', today)).toBe('none');
    expect(getFollowUpUrgency('2026-05-10', 'Rejected', today)).toBe('none');
    expect(getFollowUpUrgency(today, 'Withdrawn', today)).toBe('none');
  });

  it('calculates exact overdue day count', () => {
    expect(getOverdueDays('2026-05-12', today)).toBe(3);
    expect(getOverdueDays(today, today)).toBe(0);
    expect(getOverdueDays('2026-05-20', today)).toBe(0);
    expect(getOverdueDays(undefined, today)).toBe(0);
  });

  it('detects idle active applications past threshold and excludes Offer/Rejected/Withdrawn', () => {
    const idleApp = makeApp({ lastActivityDate: addDaysToISO(today, -8), stage: 'Applied' });
    const freshApp = makeApp({ lastActivityDate: addDaysToISO(today, -3), stage: 'Screening' });
    const offerApp = makeApp({ lastActivityDate: addDaysToISO(today, -15), stage: 'Offer' });
    const rejectedApp = makeApp({ lastActivityDate: addDaysToISO(today, -15), stage: 'Rejected' });

    expect(getIdleDays(idleApp, today)).toBe(8);
    expect(isApplicationIdle(idleApp, 7, today)).toBe(true);
    expect(isApplicationIdle(freshApp, 7, today)).toBe(false);
    expect(isApplicationIdle(offerApp, 7, today)).toBe(false);
    expect(isApplicationIdle(rejectedApp, 7, today)).toBe(false);
  });

  it('identifies upcoming interviews while excluding past dates and closed stages', () => {
    expect(isUpcomingInterview(makeApp({ interviewDate: today, stage: 'Interview' }), today)).toBe(
      true
    );
    expect(
      isUpcomingInterview(makeApp({ interviewDate: '2026-05-20', stage: 'Screening' }), today)
    ).toBe(true);
    expect(
      isUpcomingInterview(makeApp({ interviewDate: '2026-05-14', stage: 'Interview' }), today)
    ).toBe(false);
    expect(
      isUpcomingInterview(makeApp({ interviewDate: '2026-05-20', stage: 'Rejected' }), today)
    ).toBe(false);
  });
});

describe('Existing Core Features: Storage Migration, Normalization & Prep Records', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('normalizes legacy application fields without discarding notes or AI insights', () => {
    const normalized = normalizeApplication({
      id: 'legacy-99',
      company: 'Stripe',
      title: 'Frontend Architect',
      status: 'Phone Screen',
      salary: '$210k',
      dateApplied: '2026-04-20',
      nextFollowUp: '2026-05-01',
      resumeVersion: 'v3-Systems-Lead',
      notes: 'Keep this note intact',
      aiInsights: {
        skills: ['TypeScript', 'React'],
        interviewQuestions: ['Q1', 'Q2', 'Q3'],
        followUpDraft: 'Thank you for your time.',
      },
    });

    expect(normalized.id).toBe('legacy-99');
    expect(normalized.role).toBe('Frontend Architect');
    expect(normalized.stage).toBe('Screening');
    expect(normalized.compensation).toBe('$210k');
    expect(normalized.followUpDate).toBe('2026-05-01');
    expect(normalized.resumeVersion).toBe('v3-Systems-Lead');
    expect(normalized.notes).toBe('Keep this note intact');
    expect(normalized.aiInsights?.skills).toEqual(['TypeScript', 'React']);
  });

  it('migrates legacy localStorage data into v1 storage key automatically', () => {
    window.localStorage.setItem(
      'bitemyjob_applications',
      JSON.stringify([
        {
          id: 'old-1',
          company: 'Acme Press',
          role: 'Design Engineer',
          stage: 'Applied',
          appliedDate: '2026-05-02',
          notes: 'Preserved legacy record',
        },
      ])
    );

    const loaded = loadApplications();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].company).toBe('Acme Press');
    expect(loaded[0].notes).toBe('Preserved legacy record');
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('builds default prep records with AI questions when available or 3 starter prompts otherwise', () => {
    const appWithAi = makeApp({
      aiInsights: {
        skills: ['Design Systems'],
        interviewQuestions: ['AI Q1', 'AI Q2', 'AI Q3'],
        followUpDraft: 'Draft note',
        analyzedAt: '2026-05-10T10:00:00.000Z',
      },
    });
    const prepAi = createDefaultPrepRecord(appWithAi);
    expect(prepAi.practiceQuestions).toHaveLength(3);
    expect(prepAi.practiceQuestions[0].source).toBe('ai');
    expect(prepAi.practiceQuestions[0].question).toBe('AI Q1');
    expect(prepAi.checklist).toHaveLength(5);

    const prepTemplate = createDefaultPrepRecord(makeApp());
    expect(prepTemplate.practiceQuestions).toHaveLength(3);
    expect(prepTemplate.practiceQuestions[0].source).toBe('template');
  });
});
