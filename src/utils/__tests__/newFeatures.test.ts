import { beforeEach, describe, expect, it } from 'vitest';
import { JobApplication, MockInterviewSession } from '../../types/application';
import {
  computePipelineConversion,
  computeResumeVersionMetrics,
  computeRubricAverage,
  computeSessionAverage,
  getNextHighestStage,
} from '../analytics';
import {
  buildIcsEvent,
  escapeIcsText,
  generateIcsCalendar,
  parseInterviewDurationMinutes,
} from '../icsExport';
import {
  DEFAULT_RESUME_PRESETS,
  loadMockSessions,
  loadResumePresets,
  saveMockSessions,
  saveResumePresets,
} from '../storage';

function makeApp(overrides: Partial<JobApplication> = {}): JobApplication {
  return {
    id: 'app-1',
    company: 'Linear',
    role: 'Staff Designer',
    stage: 'Applied',
    location: 'San Francisco, CA',
    workMode: 'Remote',
    appliedDate: '2026-05-01',
    lastActivityDate: '2026-05-05',
    notes: '',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-05T10:00:00.000Z',
    ...overrides,
  };
}

describe('New Feature: RFC 5545 .ics Calendar Export', () => {
  it('parses interview durations from format strings accurately', () => {
    expect(parseInterviewDurationMinutes('Zoom · 60 min')).toBe(60);
    expect(parseInterviewDurationMinutes('Google Meet · 30m')).toBe(30);
    expect(parseInterviewDurationMinutes('On-site · 1.5 hr')).toBe(90);
    expect(parseInterviewDurationMinutes(undefined)).toBe(45);
  });

  it('escapes commas, semicolons, backslashes, and newlines per RFC 5545', () => {
    expect(escapeIcsText('Panel: Architecture, Systems; Part 1\nBring notes')).toBe(
      'Panel: Architecture\\, Systems\\; Part 1\\nBring notes'
    );
  });

  it('generates valid VCALENDAR and VEVENT payloads with computed DTEND', () => {
    const app = makeApp({
      id: 'int-1',
      company: 'Stripe',
      role: 'Senior Frontend Engineer',
      stage: 'Interview',
      interviewDate: '2026-05-20',
      interviewTime: '14:30',
      interviewRound: 'Systems Panel',
      interviewFormat: 'Google Meet · 60 min',
      contactName: 'Marcus Chen',
      contactEmail: 'mchen@stripe.com',
      notes: 'Review checkout state machines',
    });

    const eventBlock = buildIcsEvent(app, '20260515T120000Z');
    expect(eventBlock).toContain('BEGIN:VEVENT');
    expect(eventBlock).toContain('DTSTART:20260520T143000');
    expect(eventBlock).toContain('DTEND:20260520T153000');
    expect(eventBlock).toContain('SUMMARY:Interview: Stripe — Senior Frontend Engineer (Systems Panel)');
    expect(eventBlock).toContain('LOCATION:Google Meet · 60 min');
    expect(eventBlock).toContain('END:VEVENT');

    const calendar = generateIcsCalendar(
      [app, makeApp({ id: 'no-int', interviewDate: undefined })],
      '20260515T120000Z'
    );
    expect(calendar).toContain('BEGIN:VCALENDAR');
    expect(calendar).toContain('PRODID:-//BiteMyJob//Career Ledger//EN');
    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(calendar).toContain('END:VCALENDAR');
  });
});

describe('New Feature: Pipeline Conversion & Resume Version Analytics', () => {
  it('preserves peak stage reached when an application moves to Rejected or Withdrawn', () => {
    expect(getNextHighestStage('Interview', 'Rejected')).toBe('Interview');
    expect(getNextHighestStage('Screening', 'Withdrawn')).toBe('Screening');
    expect(getNextHighestStage('Applied', 'Interview')).toBe('Interview');
    expect(getNextHighestStage('Interview', 'Offer')).toBe('Offer');
  });

  it('computes stage-to-stage pass rates and handles empty datasets safely', () => {
    const empty = computePipelineConversion([]);
    expect(empty.totalApplications).toBe(0);
    expect(empty.appliedToScreeningPct).toBe(0);
    expect(empty.interviewToOfferPct).toBe(0);

    const sample: JobApplication[] = [
      makeApp({ id: '1', stage: 'Saved' }),
      makeApp({ id: '2', stage: 'Applied' }),
      makeApp({ id: '3', stage: 'Screening', highestStageReached: 'Screening' }),
      makeApp({ id: '4', stage: 'Rejected', highestStageReached: 'Interview' }),
      makeApp({ id: '5', stage: 'Offer', highestStageReached: 'Offer' }),
    ];

    const summary = computePipelineConversion(sample);
    // Submitted (Applied+): ids 2,3,4,5 => 4
    // Screening+: ids 3,4,5 => 3 (75%)
    // Interview+: ids 4,5 => 2 (67% of screening, 50% of applied)
    // Offer: id 5 => 1 (50% of interview)
    expect(summary.appliedReached).toBe(4);
    expect(summary.screeningReached).toBe(3);
    expect(summary.interviewReached).toBe(2);
    expect(summary.offerReached).toBe(1);
    expect(summary.appliedToScreeningPct).toBe(75);
    expect(summary.screeningToInterviewPct).toBe(67);
    expect(summary.interviewToOfferPct).toBe(50);
    expect(summary.appliedToInterviewPct).toBe(50);
  });

  it('groups conversion metrics by resumeVersion and isolates untagged roles', () => {
    const apps: JobApplication[] = [
      makeApp({
        id: '1',
        resumeVersion: 'v3-Systems-Lead',
        stage: 'Offer',
        highestStageReached: 'Offer',
      }),
      makeApp({
        id: '2',
        resumeVersion: 'v3-Systems-Lead',
        stage: 'Interview',
        highestStageReached: 'Interview',
      }),
      makeApp({
        id: '3',
        resumeVersion: 'v1-General',
        stage: 'Applied',
        highestStageReached: 'Applied',
      }),
      makeApp({
        id: '4',
        resumeVersion: undefined,
        stage: 'Screening',
        highestStageReached: 'Screening',
      }),
    ];

    const metrics = computeResumeVersionMetrics(apps);
    expect(metrics).toHaveLength(3);
    expect(metrics[0].version).toBe('v3-Systems-Lead');
    expect(metrics[0].interviewPassPct).toBe(100);
    expect(metrics[0].offerPassPct).toBe(50);
    expect(metrics[1].version).toBe('v1-General');
    expect(metrics[1].interviewPassPct).toBe(0);
    expect(metrics[2].version).toBe('Untagged');
    expect(metrics[2].isUntagged).toBe(true);
  });

  it('computes rubric and mock session averages accurately', () => {
    const avg = computeRubricAverage({
      clarity: 5,
      relevance: 4,
      starStructure: 4,
      confidence: 5,
    });
    expect(avg).toBe(4.5);

    const sessionAvg = computeSessionAverage([
      {
        questionId: 'q1',
        question: 'Q1',
        durationLimitSec: 90,
        timeSpentSec: 60,
        answerNotes: '',
        rubric: { clarity: 5, relevance: 4, starStructure: 4, confidence: 5 },
        averageScore: 4.5,
      },
      {
        questionId: 'q2',
        question: 'Q2',
        durationLimitSec: 90,
        timeSpentSec: 70,
        answerNotes: '',
        rubric: { clarity: 3, relevance: 4, starStructure: 3, confidence: 4 },
        averageScore: 3.5,
      },
    ]);
    expect(sessionAvg).toBe(4);
  });
});

describe('New Feature: Mock Sessions & Resume Presets Storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists and loads resume presets with default fallback', () => {
    expect(loadResumePresets()).toEqual(DEFAULT_RESUME_PRESETS);
    saveResumePresets(['v4-Custom-AI', 'v2-Product-Design']);
    expect(loadResumePresets()).toEqual(['v4-Custom-AI', 'v2-Product-Design']);
  });

  it('persists and loads mock interview sessions', () => {
    const session: MockInterviewSession = {
      id: 'mock-1',
      applicationId: 'app-1',
      company: 'Linear',
      role: 'Staff Designer',
      durationPerQuestionSec: 90,
      results: [],
      overallAverage: 4.3,
      completedAt: '2026-05-15T10:00:00.000Z',
    };

    expect(loadMockSessions()).toEqual([]);
    saveMockSessions([session]);
    const loaded = loadMockSessions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].company).toBe('Linear');
    expect(loaded[0].overallAverage).toBe(4.3);
  });
});
