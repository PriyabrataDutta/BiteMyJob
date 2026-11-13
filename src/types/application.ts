export type ApplicationStage =
  | 'Saved'
  | 'Applied'
  | 'Screening'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

export type FollowUpUrgency = 'overdue' | 'due-today' | 'upcoming' | 'none';

export type ViewMode = 'board' | 'ledger';

export type NavSection =
  | 'all'
  | 'follow-ups'
  | 'idle'
  | 'interviews'
  | 'prep'
  | 'mock'
  | 'analytics';

export type SortOption =
  | 'follow-up'
  | 'recent-activity'
  | 'applied-newest'
  | 'company-asc';

export interface JobDescriptionInsights {
  skills: string[];
  interviewQuestions: string[];
  followUpDraft: string;
  analyzedAt: string;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  stage: ApplicationStage;
  highestStageReached?: ApplicationStage;
  resumeVersion?: string;
  location: string;
  workMode: WorkMode;
  compensation?: string;
  jobUrl?: string;
  source?: string;
  contactName?: string;
  contactEmail?: string;
  appliedDate: string; // YYYY-MM-DD
  lastActivityDate: string; // YYYY-MM-DD
  followUpDate?: string; // YYYY-MM-DD
  interviewDate?: string; // YYYY-MM-DD
  interviewTime?: string; // HH:mm
  interviewRound?: string;
  interviewFormat?: string; // e.g., "Zoom · 45m", "On-site Panel"
  notes: string;
  jobDescription?: string;
  aiInsights?: JobDescriptionInsights;
  createdAt: string;
  updatedAt: string;
}

export interface PrepChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface PrepQuestionItem {
  id: string;
  question: string;
  answerDraft: string;
  rehearsed: boolean;
  source: 'ai' | 'custom' | 'template';
}

export interface ApplicationPrepRecord {
  applicationId: string;
  elevatorPitch: string;
  questionsToAsk: string;
  checklist: PrepChecklistItem[];
  practiceQuestions: PrepQuestionItem[];
  updatedAt: string;
}

export interface RubricScores {
  clarity: number; // 1-5
  relevance: number; // 1-5
  starStructure: number; // 1-5
  confidence: number; // 1-5
}

export interface MockQuestionResult {
  questionId: string;
  question: string;
  durationLimitSec: number;
  timeSpentSec: number;
  answerNotes: string;
  rubric: RubricScores;
  averageScore: number;
}

export interface MockInterviewSession {
  id: string;
  applicationId: string;
  company: string;
  role: string;
  durationPerQuestionSec: number;
  results: MockQuestionResult[];
  overallAverage: number;
  completedAt: string;
}

export interface AppSettings {
  idleThresholdDays: number;
  viewMode: ViewMode;
  pageSize: number;
}

export const ACTIVE_STAGES: ApplicationStage[] = [
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
];

export const ALL_STAGES: ApplicationStage[] = [
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
];
