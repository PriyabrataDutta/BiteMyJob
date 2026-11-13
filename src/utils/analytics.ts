import {
  ApplicationStage,
  JobApplication,
  MockQuestionResult,
  RubricScores,
} from '../types/application';

const FUNNEL_RANK: Record<ApplicationStage, number> = {
  Saved: 0,
  Applied: 1,
  Screening: 2,
  Interview: 3,
  Offer: 4,
  Rejected: 1,
  Withdrawn: 1,
};

export function inferHighestStageRank(app: JobApplication): number {
  const currentRank = FUNNEL_RANK[app.stage];
  const recordedRank = app.highestStageReached ? FUNNEL_RANK[app.highestStageReached] : 0;
  const interviewBonus = app.interviewDate ? FUNNEL_RANK.Interview : 0;
  return Math.max(currentRank, recordedRank, interviewBonus);
}

export function getNextHighestStage(
  currentHighest: ApplicationStage | undefined,
  nextStage: ApplicationStage
): ApplicationStage {
  const prevRank = currentHighest ? FUNNEL_RANK[currentHighest] : 0;
  const nextRank = FUNNEL_RANK[nextStage];
  if (nextStage === 'Rejected' || nextStage === 'Withdrawn') {
    return currentHighest ?? 'Applied';
  }
  return nextRank >= prevRank ? nextStage : currentHighest!;
}

export function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export interface StageCountSummary {
  stage: ApplicationStage;
  count: number;
  sharePct: number;
}

export interface FunnelStepMetric {
  label: string;
  fromStage: string;
  toStage: string;
  reachedCount: number;
  baseCount: number;
  passRatePct: number;
}

export interface PipelineConversionSummary {
  totalApplications: number;
  savedCount: number;
  appliedReached: number;
  screeningReached: number;
  interviewReached: number;
  offerReached: number;
  rejectedCount: number;
  withdrawnCount: number;
  appliedToScreeningPct: number;
  screeningToInterviewPct: number;
  interviewToOfferPct: number;
  appliedToInterviewPct: number;
  overallOfferRatePct: number;
  stageCounts: StageCountSummary[];
  funnelSteps: FunnelStepMetric[];
}

export function computePipelineConversion(
  applications: JobApplication[]
): PipelineConversionSummary {
  const totalApplications = applications.length;

  const countsByStage: Record<ApplicationStage, number> = {
    Saved: 0,
    Applied: 0,
    Screening: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
    Withdrawn: 0,
  };

  let appliedReached = 0;
  let screeningReached = 0;
  let interviewReached = 0;
  let offerReached = 0;

  for (const app of applications) {
    countsByStage[app.stage] += 1;
    const rank = inferHighestStageRank(app);
    if (rank >= FUNNEL_RANK.Applied) appliedReached += 1;
    if (rank >= FUNNEL_RANK.Screening) screeningReached += 1;
    if (rank >= FUNNEL_RANK.Interview) interviewReached += 1;
    if (rank >= FUNNEL_RANK.Offer) offerReached += 1;
  }

  const appliedToScreeningPct = toPercent(screeningReached, appliedReached);
  const screeningToInterviewPct = toPercent(interviewReached, screeningReached);
  const interviewToOfferPct = toPercent(offerReached, interviewReached);
  const appliedToInterviewPct = toPercent(interviewReached, appliedReached);
  const overallOfferRatePct = toPercent(offerReached, appliedReached);

  const allStages: ApplicationStage[] = [
    'Saved',
    'Applied',
    'Screening',
    'Interview',
    'Offer',
    'Rejected',
    'Withdrawn',
  ];

  const stageCounts: StageCountSummary[] = allStages.map((stage) => ({
    stage,
    count: countsByStage[stage],
    sharePct: toPercent(countsByStage[stage], totalApplications),
  }));

  const funnelSteps: FunnelStepMetric[] = [
    {
      label: 'Applied → Screening',
      fromStage: 'Applied',
      toStage: 'Screening',
      reachedCount: screeningReached,
      baseCount: appliedReached,
      passRatePct: appliedToScreeningPct,
    },
    {
      label: 'Screening → Interview',
      fromStage: 'Screening',
      toStage: 'Interview',
      reachedCount: interviewReached,
      baseCount: screeningReached,
      passRatePct: screeningToInterviewPct,
    },
    {
      label: 'Interview → Offer',
      fromStage: 'Interview',
      toStage: 'Offer',
      reachedCount: offerReached,
      baseCount: interviewReached,
      passRatePct: interviewToOfferPct,
    },
    {
      label: 'Applied → Interview (Net)',
      fromStage: 'Applied',
      toStage: 'Interview',
      reachedCount: interviewReached,
      baseCount: appliedReached,
      passRatePct: appliedToInterviewPct,
    },
  ];

  return {
    totalApplications,
    savedCount: countsByStage.Saved,
    appliedReached,
    screeningReached,
    interviewReached,
    offerReached,
    rejectedCount: countsByStage.Rejected,
    withdrawnCount: countsByStage.Withdrawn,
    appliedToScreeningPct,
    screeningToInterviewPct,
    interviewToOfferPct,
    appliedToInterviewPct,
    overallOfferRatePct,
    stageCounts,
    funnelSteps,
  };
}

export interface ResumeVersionMetric {
  version: string;
  isUntagged: boolean;
  totalCount: number;
  appliedReached: number;
  screeningReached: number;
  interviewReached: number;
  offerReached: number;
  screeningPassPct: number;
  interviewPassPct: number;
  offerPassPct: number;
}

export function computeResumeVersionMetrics(
  applications: JobApplication[]
): ResumeVersionMetric[] {
  const groups = new Map<string, JobApplication[]>();

  for (const app of applications) {
    const key = app.resumeVersion?.trim() || 'Untagged';
    const list = groups.get(key) ?? [];
    list.push(app);
    groups.set(key, list);
  }

  const metrics: ResumeVersionMetric[] = [];

  for (const [version, apps] of groups.entries()) {
    let appliedReached = 0;
    let screeningReached = 0;
    let interviewReached = 0;
    let offerReached = 0;

    for (const app of apps) {
      const rank = inferHighestStageRank(app);
      if (rank >= FUNNEL_RANK.Applied) appliedReached += 1;
      if (rank >= FUNNEL_RANK.Screening) screeningReached += 1;
      if (rank >= FUNNEL_RANK.Interview) interviewReached += 1;
      if (rank >= FUNNEL_RANK.Offer) offerReached += 1;
    }

    metrics.push({
      version,
      isUntagged: version === 'Untagged',
      totalCount: apps.length,
      appliedReached,
      screeningReached,
      interviewReached,
      offerReached,
      screeningPassPct: toPercent(screeningReached, appliedReached),
      interviewPassPct: toPercent(interviewReached, appliedReached),
      offerPassPct: toPercent(offerReached, appliedReached),
    });
  }

  return metrics.sort((a, b) => {
    if (a.isUntagged !== b.isUntagged) return a.isUntagged ? 1 : -1;
    if (b.interviewPassPct !== a.interviewPassPct) {
      return b.interviewPassPct - a.interviewPassPct;
    }
    return b.totalCount - a.totalCount;
  });
}

export function computeRubricAverage(rubric: RubricScores): number {
  const sum = rubric.clarity + rubric.relevance + rubric.starStructure + rubric.confidence;
  return Math.round((sum / 4) * 10) / 10;
}

export function computeSessionAverage(results: MockQuestionResult[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((acc, item) => acc + item.averageScore, 0);
  return Math.round((total / results.length) * 10) / 10;
}
