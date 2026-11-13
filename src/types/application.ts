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

export type NavSection = 'all' | 'follow-ups' | 'idle' | 'interviews';

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

export interface AppSettings {
  idleThresholdDays: number;
  viewMode: ViewMode;
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
