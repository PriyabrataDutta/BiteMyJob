import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mic,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ApplicationPrepRecord,
  JobApplication,
  MockInterviewSession,
  MockQuestionResult,
  PrepQuestionItem,
  RubricScores,
} from '../types/application';
import { computeRubricAverage, computeSessionAverage } from '../utils/analytics';
import { formatRelativeDayLabel, formatTime12h, getTodayISO } from '../utils/dateUtils';
import { createDefaultPrepRecord } from '../utils/storage';

interface MockInterviewViewProps {
  applications: JobApplication[];
  prepRecords: Record<string, ApplicationPrepRecord>;
  mockSessions: MockInterviewSession[];
  onSaveMockSession: (session: MockInterviewSession) => void;
  onDeleteMockSession?: (sessionId: string) => void;
  onMarkQuestionRehearsed: (appId: string, questionId: string) => void;
  onOpenNewApplication: () => void;
}

const DURATION_OPTIONS = [
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '120s', seconds: 120 },
  { label: '180s', seconds: 180 },
];

const RUBRIC_DIMENSIONS: {
  key: keyof RubricScores;
  label: string;
  helper: string;
}[] = [
  {
    key: 'clarity',
    label: 'Clarity',
    helper: 'Direct opening, concise pacing, minimal filler',
  },
  {
    key: 'relevance',
    label: 'Relevance',
    helper: 'Directly answers the prompt and role priorities',
  },
  {
    key: 'starStructure',
    label: 'STAR Structure',
    helper: 'Clear Situation, Task, Action, and quantified Result',
  },
  {
    key: 'confidence',
    label: 'Confidence',
    helper: 'Steady delivery and ownership of technical choices',
  },
];

const DEFAULT_RUBRIC: RubricScores = {
  clarity: 4,
  relevance: 4,
  starStructure: 4,
  confidence: 4,
};

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function MockInterviewView({
  applications,
  prepRecords,
  mockSessions,
  onSaveMockSession,
  onDeleteMockSession,
  onMarkQuestionRehearsed,
  onOpenNewApplication,
}: MockInterviewViewProps) {
  const todayISO = getTodayISO();

  const sortedApps = useMemo(() => {
    return [...applications].sort((a, b) => {
      const aInt = a.interviewDate ? 0 : 1;
      const bInt = b.interviewDate ? 0 : 1;
      if (aInt !== bInt) return aInt - bInt;
      const aAi = a.aiInsights?.interviewQuestions?.length ? 0 : 1;
      const bAi = b.aiInsights?.interviewQuestions?.length ? 0 : 1;
      if (aAi !== bAi) return aAi - bAi;
      return b.lastActivityDate.localeCompare(a.lastActivityDate);
    });
  }, [applications]);

  const [selectedAppId, setSelectedAppId] = useState<string>(() => sortedApps[0]?.id ?? '');
  const [durationSec, setDurationSec] = useState<number>(90);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(90);
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused' | 'rating'>('idle');
  const [answerNotes, setAnswerNotes] = useState<string>('');
  const [rubric, setRubric] = useState<RubricScores>({ ...DEFAULT_RUBRIC });
  const [completedResults, setCompletedResults] = useState<MockQuestionResult[]>([]);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    if (sortedApps.length > 0 && !sortedApps.some((a) => a.id === selectedAppId)) {
      setSelectedAppId(sortedApps[0].id);
    }
  }, [sortedApps, selectedAppId]);

  const selectedApp = sortedApps.find((a) => a.id === selectedAppId) ?? null;

  const questionQueue: PrepQuestionItem[] = useMemo(() => {
    if (!selectedApp) return [];
    const existing = prepRecords[selectedApp.id]?.practiceQuestions;
    if (existing && existing.length > 0) return existing;
    return createDefaultPrepRecord(selectedApp).practiceQuestions;
  }, [selectedApp, prepRecords]);

  useEffect(() => {
    setQuestionIndex(0);
    setSecondsLeft(durationSec);
    setTimerStatus('idle');
    setAnswerNotes('');
    setRubric({ ...DEFAULT_RUBRIC });
    setCompletedResults([]);
    setSavedBanner(null);
  }, [selectedAppId]);

  useEffect(() => {
    if (timerStatus !== 'running') return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerStatus]);

  if (!selectedApp) {
    return (
      <div className="rounded-lg bg-white px-6 py-14 text-center">
        <h2 className="font-serif text-xl font-semibold text-[#141923]">
          Add an application to run a mock interview
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#4D5566]">
          Log a role first to practice timed interview prompts with a countdown timer and
          4-dimension self-rating rubric.
        </p>
        <button
          type="button"
          onClick={onOpenNewApplication}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-4 py-2 text-sm font-medium text-white hover:opacity-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New Application</span>
        </button>
      </div>
    );
  }

  const safeIndex = questionQueue.length > 0 ? questionIndex % questionQueue.length : 0;
  const currentQuestion = questionQueue[safeIndex];
  const isExpired = secondsLeft === 0;
  const isWarning = !isExpired && secondsLeft < 15 && timerStatus === 'running';

  const handleSelectDuration = (secs: number) => {
    setDurationSec(secs);
    setSecondsLeft(secs);
    setTimerStatus('idle');
  };

  const handleResetTimer = () => {
    setSecondsLeft(durationSec);
    setTimerStatus('idle');
  };

  const handleNextQuestion = () => {
    if (questionQueue.length === 0) return;
    setQuestionIndex((prev) => (prev + 1) % questionQueue.length);
    setSecondsLeft(durationSec);
    setTimerStatus('idle');
    setAnswerNotes('');
    setRubric({ ...DEFAULT_RUBRIC });
  };

  const buildCurrentResult = (): MockQuestionResult | null => {
    if (!currentQuestion) return null;
    const timeSpentSec = Math.max(0, durationSec - secondsLeft);
    return {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      durationLimitSec: durationSec,
      timeSpentSec,
      answerNotes: answerNotes.trim(),
      rubric: { ...rubric },
      averageScore: computeRubricAverage(rubric),
    };
  };

  const handleRateAndContinue = () => {
    const result = buildCurrentResult();
    if (!result) return;
    onMarkQuestionRehearsed(selectedApp.id, result.questionId);
    setCompletedResults((prev) => [...prev, result]);
    setQuestionIndex((prev) => (prev + 1) % Math.max(1, questionQueue.length));
    setSecondsLeft(durationSec);
    setTimerStatus('idle');
    setAnswerNotes('');
    setRubric({ ...DEFAULT_RUBRIC });
    setSavedBanner(`Recorded score (${result.averageScore.toFixed(1)}/5). Ready for next question.`);
  };

  const handleCompleteSession = () => {
    const current = buildCurrentResult();
    const allResults = current ? [...completedResults, current] : [...completedResults];
    if (allResults.length === 0) return;

    if (current) {
      onMarkQuestionRehearsed(selectedApp.id, current.questionId);
    }

    const overallAverage = computeSessionAverage(allResults);
    const session: MockInterviewSession = {
      id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      applicationId: selectedApp.id,
      company: selectedApp.company,
      role: selectedApp.role,
      durationPerQuestionSec: durationSec,
      results: allResults,
      overallAverage,
      completedAt: new Date().toISOString(),
    };

    onSaveMockSession(session);
    setCompletedResults([]);
    setSecondsLeft(durationSec);
    setTimerStatus('idle');
    setAnswerNotes('');
    setRubric({ ...DEFAULT_RUBRIC });
    setSavedBanner(
      `Saved mock session for ${selectedApp.company} (${overallAverage.toFixed(1)}/5 across ${allResults.length} ${allResults.length === 1 ? 'prompt' : 'prompts'}).`
    );
  };

  const handleSaveCompletedQueue = () => {
    if (completedResults.length === 0) return;
    const overallAverage = computeSessionAverage(completedResults);
    const session: MockInterviewSession = {
      id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      applicationId: selectedApp.id,
      company: selectedApp.company,
      role: selectedApp.role,
      durationPerQuestionSec: durationSec,
      results: completedResults,
      overallAverage,
      completedAt: new Date().toISOString(),
    };
    onSaveMockSession(session);
    setCompletedResults([]);
    setSavedBanner(
      `Saved mock session for ${selectedApp.company} (${overallAverage.toFixed(1)}/5).`
    );
  };

  const currentRubricAvg = computeRubricAverage(rubric);

  return (
    <section aria-label="Live mock interview simulator" className="space-y-6">
      {/* Studio Header & Controls */}
      <div className="rounded-lg bg-white p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 font-label text-xs font-semibold text-[#094CB2]">
              <Mic className="h-4 w-4" aria-hidden="true" />
              <span>Live Mock-Interview Simulator</span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-[#141923] sm:text-3xl">
              {selectedApp.company} — {selectedApp.role}
            </h2>
            <p className="mt-1.5 text-xs text-[#4D5566]">
              Practice timed responses against role-specific prompts, then score your delivery on
              clarity, relevance, STAR structure, and confidence.
              {selectedApp.interviewDate && (
                <span className="ml-2 font-semibold text-[#6D5E00]">
                  Scheduled {formatRelativeDayLabel(selectedApp.interviewDate, todayISO)}
                  {selectedApp.interviewTime ? ` · ${formatTime12h(selectedApp.interviewTime)}` : ''}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label
                htmlFor="mock-role-select"
                className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]"
              >
                Target Candidacy
              </label>
              <select
                id="mock-role-select"
                value={selectedApp.id}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="min-w-[260px] rounded-md bg-[#F3F5F9] px-3 py-2 text-xs font-medium text-[#141923] ghost-border ghost-border-focus cursor-pointer"
              >
                {sortedApps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company} — {app.role} ({app.stage})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Answer Limit
              </span>
              <div className="flex items-center rounded-md bg-[#F3F5F9] p-1">
                {DURATION_OPTIONS.map((opt) => {
                  const active = durationSec === opt.seconds;
                  return (
                    <button
                      key={opt.seconds}
                      type="button"
                      onClick={() => handleSelectDuration(opt.seconds)}
                      className={`rounded-sm px-2.5 py-1 font-label text-xs font-medium transition-colors tabular-nums cursor-pointer ${
                        active
                          ? 'bg-white text-[#094CB2] shadow-sm'
                          : 'text-[#4D5566] hover:text-[#141923]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {savedBanner && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[#E6F4EE] px-4 py-3 text-xs font-medium text-[#116341]"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{savedBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setSavedBanner(null)}
            className="text-xs font-semibold underline underline-offset-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Simulator Stage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left / Center Stage: Prompt + Timer + Notes */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-lg bg-white p-6 lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-sm bg-[#E9F0FC] px-2.5 py-1 font-label text-xs font-semibold text-[#094CB2] tabular-nums">
                  Prompt {safeIndex + 1} of {questionQueue.length}
                </span>
                {currentQuestion?.source === 'ai' && (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-[#FBF6DC] px-2 py-1 font-label text-[11px] font-semibold text-[#6D5E00]">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    <span>JD Tailored</span>
                  </span>
                )}
              </div>

              {/* Live Countdown Readout */}
              <div
                aria-live="polite"
                className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 font-label text-sm font-semibold tabular-nums ${
                  isExpired
                    ? 'bg-[#FDF1F2] text-[#9F1239]'
                    : isWarning
                      ? 'bg-[#FBF6DC] text-[#6D5E00]'
                      : 'bg-[#F3F5F9] text-[#141923]'
                }`}
              >
                {isExpired ? (
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Clock className="h-4 w-4 shrink-0 text-[#094CB2]" aria-hidden="true" />
                )}
                <span>
                  {formatCountdown(secondsLeft)}
                  {isExpired ? " · Time's up" : ''}
                </span>
              </div>
            </div>

            <h3 className="mt-5 font-serif text-xl font-semibold leading-snug text-[#141923] sm:text-2xl">
              {currentQuestion?.question}
            </h3>

            {/* Timer Controls */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {timerStatus === 'running' ? (
                <button
                  type="button"
                  onClick={() => setTimerStatus('paused')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#E3E7F0] px-4 py-2 text-xs font-semibold text-[#094CB2] hover:bg-[#D8DDE9] cursor-pointer"
                >
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSavedBanner(null);
                    if (secondsLeft === 0) setSecondsLeft(durationSec);
                    setTimerStatus('running');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-4 py-2 text-xs font-semibold text-white hover:opacity-95 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{timerStatus === 'paused' ? 'Resume' : 'Start Timer'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetTimer}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#F3F5F9] px-3.5 py-2 text-xs font-medium text-[#4D5566] hover:bg-[#E3E7F0] hover:text-[#141923] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#F3F5F9] px-3.5 py-2 text-xs font-medium text-[#4D5566] hover:bg-[#E3E7F0] hover:text-[#141923] cursor-pointer"
              >
                <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Next Question</span>
              </button>

              <button
                type="button"
                onClick={() => setTimerStatus('rating')}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-[#FBF6DC] px-3.5 py-2 text-xs font-semibold text-[#6D5E00] hover:bg-[#F5ECC2] cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Finish &amp; Rate</span>
              </button>
            </div>

            {/* Answer Scratchpad */}
            <div className="mt-6">
              <label
                htmlFor="mock-answer-scratchpad"
                className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]"
              >
                Answer Bullet Notes / STAR Outline
              </label>
              <textarea
                id="mock-answer-scratchpad"
                rows={5}
                value={answerNotes}
                onChange={(e) => setAnswerNotes(e.target.value)}
                placeholder="Jot down your opening hook, key architectural trade-offs, and quantified impact metrics as you speak..."
                className="w-full rounded-md bg-[#F8FAFC] p-3 text-xs leading-relaxed text-[#141923] ghost-border ghost-border-focus"
              />
            </div>

            {completedResults.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-[#F3F5F9] px-4 py-3 text-xs">
                <span className="font-medium text-[#141923] tabular-nums">
                  {completedResults.length} rated{' '}
                  {completedResults.length === 1 ? 'prompt' : 'prompts'} queued in this session ·
                  Running avg {computeSessionAverage(completedResults).toFixed(1)}/5
                </span>
                <button
                  type="button"
                  onClick={handleSaveCompletedQueue}
                  className="rounded-sm bg-[#094CB2] px-3 py-1.5 font-medium text-white hover:opacity-95 cursor-pointer"
                >
                  Save Queued Session
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 4-Criterion Self-Rating Rubric */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-lg bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-label text-xs font-semibold text-[#094CB2]">
                  Self-Rating Rubric
                </p>
                <h3 className="mt-1 font-serif text-lg font-semibold text-[#141923]">
                  Score This Response
                </h3>
              </div>
              <div className="rounded-md bg-[#F3F5F9] px-3 py-1.5 text-right tabular-nums">
                <span className="block font-label text-[10px] font-semibold uppercase text-[#4D5566]">
                  Prompt Avg
                </span>
                <span className="font-serif text-lg font-semibold text-[#094CB2]">
                  {currentRubricAvg.toFixed(1)} / 5
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {RUBRIC_DIMENSIONS.map((dim) => (
                <div key={dim.key} className="rounded-md bg-[#F8FAFC] p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-label text-xs font-semibold text-[#141923]">
                      {dim.label}
                    </span>
                    <span className="font-label text-xs font-semibold text-[#094CB2] tabular-nums">
                      {rubric[dim.key]} / 5
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#4D5566]">{dim.helper}</p>
                  <div
                    role="radiogroup"
                    aria-label={dim.label}
                    className="mt-2.5 grid grid-cols-5 gap-1.5"
                  >
                    {[1, 2, 3, 4, 5].map((score) => {
                      const selected = rubric[dim.key] === score;
                      return (
                        <button
                          key={score}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={`${dim.label} ${score} of 5`}
                          onClick={() =>
                            setRubric((prev) => ({
                              ...prev,
                              [dim.key]: score,
                            }))
                          }
                          className={`rounded-sm py-1.5 font-label text-xs font-semibold transition-colors tabular-nums cursor-pointer ${
                            selected
                              ? 'bg-[#094CB2] text-white'
                              : 'bg-white text-[#4D5566] hover:bg-[#E3E7F0] hover:text-[#141923]'
                          }`}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={handleRateAndContinue}
                className="flex-1 rounded-md bg-[#E3E7F0] px-4 py-2.5 text-xs font-semibold text-[#094CB2] hover:bg-[#D8DDE9] cursor-pointer"
              >
                Save Score &amp; Next Question
              </button>
              <button
                type="button"
                onClick={handleCompleteSession}
                className="flex-1 rounded-md bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-4 py-2.5 text-xs font-semibold text-white hover:opacity-95 cursor-pointer"
              >
                Save Mock Session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Mock Session History */}
      <div className="rounded-lg bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-serif text-lg font-semibold text-[#141923]">
              Mock Interview Scorecard Archive
            </h3>
            <p className="mt-0.5 text-xs text-[#4D5566]">
              Persisted locally in your browser across sessions.
            </p>
          </div>
          <span className="font-label text-xs font-semibold text-[#094CB2] tabular-nums">
            {mockSessions.length} {mockSessions.length === 1 ? 'session' : 'sessions'} logged
          </span>
        </div>

        {mockSessions.length === 0 ? (
          <div className="mt-4 rounded-md bg-[#F3F5F9] px-5 py-6 text-center text-xs text-[#4D5566]">
            No mock interview sessions saved yet. Complete a timed prompt and click{' '}
            <span className="font-semibold text-[#141923]">Save Mock Session</span> to log your
            first scorecard.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#F3F5F9] font-label text-[11px] font-semibold text-[#4D5566]">
                  <th className="rounded-l-sm px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Company &amp; Role</th>
                  <th className="px-3.5 py-2.5">Prompts</th>
                  <th className="px-3.5 py-2.5">Limit</th>
                  <th className="px-3.5 py-2.5">Avg Score</th>
                  {onDeleteMockSession && <th className="rounded-r-sm px-3.5 py-2.5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEFF5]">
                {mockSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-[#FAFBFD]">
                    <td className="px-3.5 py-3 text-[#4D5566] tabular-nums whitespace-nowrap">
                      {new Date(session.completedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="font-semibold text-[#141923]">{session.company}</span>
                      <span className="text-[#4D5566]"> — {session.role}</span>
                    </td>
                    <td className="px-3.5 py-3 text-[#4D5566] tabular-nums">
                      {session.results.length}
                    </td>
                    <td className="px-3.5 py-3 text-[#4D5566] tabular-nums">
                      {session.durationPerQuestionSec}s
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="inline-flex rounded-sm bg-[#E9F0FC] px-2 py-0.5 font-label font-semibold text-[#094CB2] tabular-nums">
                        {session.overallAverage.toFixed(1)} / 5
                      </span>
                    </td>
                    {onDeleteMockSession && (
                      <td className="px-3.5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteMockSession(session.id)}
                          aria-label={`Delete mock session for ${session.company}`}
                          className="rounded-sm p-1 text-[#4D5566] hover:text-[#9F1239] cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
