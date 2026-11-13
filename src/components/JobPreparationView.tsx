import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  ApplicationPrepRecord,
  JobApplication,
  JobDescriptionInsights,
  PrepQuestionItem,
} from '../types/application';
import { formatRelativeDayLabel, formatTime12h, getTodayISO } from '../utils/dateUtils';
import { analyzeJobDescription } from '../utils/jdAnalysis';
import { createDefaultPrepRecord } from '../utils/storage';

interface JobPreparationViewProps {
  applications: JobApplication[];
  prepRecords: Record<string, ApplicationPrepRecord>;
  onUpdatePrepRecord: (appId: string, updater: (current: ApplicationPrepRecord) => ApplicationPrepRecord) => void;
  onSaveJdInsights: (
    id: string,
    jobDescription: string,
    aiInsights?: JobDescriptionInsights
  ) => void;
  onOpenNewApplication: () => void;
}

export function JobPreparationView({
  applications,
  prepRecords,
  onUpdatePrepRecord,
  onSaveJdInsights,
  onOpenNewApplication,
}: JobPreparationViewProps) {
  const todayISO = getTodayISO();

  const sortedApps = useMemo(() => {
    return [...applications].sort((a, b) => {
      const aHasInt = a.interviewDate ? 0 : 1;
      const bHasInt = b.interviewDate ? 0 : 1;
      if (aHasInt !== bHasInt) return aHasInt - bHasInt;
      if (a.interviewDate && b.interviewDate) {
        return a.interviewDate.localeCompare(b.interviewDate);
      }
      return b.lastActivityDate.localeCompare(a.lastActivityDate);
    });
  }, [applications]);

  const [selectedAppId, setSelectedAppId] = useState<string>(() => sortedApps[0]?.id ?? '');
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [jdInput, setJdInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    if (sortedApps.length > 0 && !sortedApps.some((a) => a.id === selectedAppId)) {
      setSelectedAppId(sortedApps[0].id);
    }
  }, [sortedApps, selectedAppId]);

  const selectedApp = sortedApps.find((a) => a.id === selectedAppId) ?? null;

  useEffect(() => {
    setJdInput(selectedApp?.jobDescription ?? '');
    setAnalyzeError(null);
  }, [selectedApp?.id, selectedApp?.jobDescription]);

  const currentPrep: ApplicationPrepRecord | null = useMemo(() => {
    if (!selectedApp) return null;
    return prepRecords[selectedApp.id] ?? createDefaultPrepRecord(selectedApp);
  }, [selectedApp, prepRecords]);

  if (!selectedApp || !currentPrep) {
    return (
      <div className="rounded-lg bg-white px-6 py-14 text-center">
        <h2 className="font-serif text-xl font-semibold text-[#141923]">
          Add an application to begin interview preparation
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#4D5566]">
          Log a role first to unlock role-specific readiness checklists, STAR answer worksheets,
          and AI-tailored practice questions.
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

  const completedTasks = currentPrep.checklist.filter((c) => c.completed).length;
  const totalTasks = currentPrep.checklist.length;
  const readinessPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const rehearsedCount = currentPrep.practiceQuestions.filter((q) => q.rehearsed).length;

  const ensureRecord = (base?: ApplicationPrepRecord): ApplicationPrepRecord =>
    base ?? createDefaultPrepRecord(selectedApp);

  const handleToggleTask = (taskId: string) => {
    onUpdatePrepRecord(selectedApp.id, (prev) => {
      const record = ensureRecord(prev);
      return {
        ...record,
        checklist: record.checklist.map((item) =>
          item.id === taskId ? { ...item, completed: !item.completed } : item
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleAddTask = (e: FormEvent) => {
    e.preventDefault();
    const label = newTaskLabel.trim();
    if (!label) return;
    onUpdatePrepRecord(selectedApp.id, (prev) => {
      const record = ensureRecord(prev);
      return {
        ...record,
        checklist: [
          ...record.checklist,
          { id: `chk-${Date.now()}`, label, completed: false },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
    setNewTaskLabel('');
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdatePrepRecord(selectedApp.id, (prev) => {
      const record = ensureRecord(prev);
      return {
        ...record,
        checklist: record.checklist.filter((t) => t.id !== taskId),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleAddQuestion = (e: FormEvent) => {
    e.preventDefault();
    const qText = newQuestionText.trim();
    if (!qText) return;
    const item: PrepQuestionItem = {
      id: `q-${Date.now()}`,
      question: qText,
      answerDraft: '',
      rehearsed: false,
      source: 'custom',
    };
    onUpdatePrepRecord(selectedApp.id, (prev) => {
      const record = ensureRecord(prev);
      return {
        ...record,
        practiceQuestions: [...record.practiceQuestions, item],
        updatedAt: new Date().toISOString(),
      };
    });
    setNewQuestionText('');
  };

  const handleUpdateQuestion = (
    questionId: string,
    patch: Partial<Pick<PrepQuestionItem, 'answerDraft' | 'rehearsed'>>
  ) => {
    onUpdatePrepRecord(selectedApp.id, (prev) => {
      const record = ensureRecord(prev);
      return {
        ...record,
        practiceQuestions: record.practiceQuestions.map((q) =>
          q.id === questionId ? { ...q, ...patch } : q
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    onUpdatePrepRecord(selectedApp.id, (prev) => {
      const record = ensureRecord(prev);
      return {
        ...record,
        practiceQuestions: record.practiceQuestions.filter((q) => q.id !== questionId),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleAnalyzeAndSyncQuestions = async () => {
    const trimmed = jdInput.trim();
    if (trimmed.length < 20) {
      setAnalyzeError('Paste at least 20 characters of the job description first.');
      return;
    }
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const insights = await analyzeJobDescription(selectedApp, trimmed);
      onSaveJdInsights(selectedApp.id, trimmed, insights);
      onUpdatePrepRecord(selectedApp.id, (prev) => {
        const record = ensureRecord(prev);
        const existingTexts = new Set(record.practiceQuestions.map((q) => q.question));
        const newAiQuestions: PrepQuestionItem[] = insights.interviewQuestions
          .filter((q) => !existingTexts.has(q))
          .map((q, idx) => ({
            id: `ai-q-${Date.now()}-${idx}`,
            question: q,
            answerDraft: '',
            rehearsed: false,
            source: 'ai',
          }));
        return {
          ...record,
          practiceQuestions: [...newAiQuestions, ...record.practiceQuestions],
          updatedAt: new Date().toISOString(),
        };
      });
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : 'Unable to analyze job description right now.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <section aria-label="Job preparation studio" className="space-y-6">
      {/* Role Selector & Readiness Header */}
      <div className="rounded-lg bg-white p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 font-label text-xs font-semibold text-[#094CB2]">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>Job Preparation Studio</span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-[#141923] sm:text-3xl">
              {selectedApp.company} — {selectedApp.role}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#4D5566]">
              <span className="font-medium text-[#141923]">{selectedApp.stage}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedApp.workMode}</span>
              {selectedApp.location && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{selectedApp.location}</span>
                </>
              )}
              {selectedApp.interviewDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#6D5E00]">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Interview {formatRelativeDayLabel(selectedApp.interviewDate, todayISO)}
                    {selectedApp.interviewTime
                      ? ` at ${formatTime12h(selectedApp.interviewTime)}`
                      : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Switch Target Role
              </label>
              <select
                value={selectedApp.id}
                onChange={(e) => setSelectedAppId(e.target.value)}
                aria-label="Select application for job preparation"
                className="min-w-[260px] rounded-md bg-[#F3F5F9] px-3 py-2 text-xs font-medium text-[#141923] ghost-border ghost-border-focus cursor-pointer"
              >
                {sortedApps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company} — {app.role} ({app.stage})
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-md bg-[#F3F5F9] px-4 py-2.5 tabular-nums">
              <div className="font-label text-[11px] font-medium text-[#4D5566]">
                Readiness Score
              </div>
              <div className="mt-0.5 font-serif text-lg font-semibold text-[#094CB2]">
                {readinessPct}% · {completedTasks}/{totalTasks} tasks · {rehearsedCount} rehearsed
              </div>
            </div>
          </div>
        </div>

        {/* Readiness Progress Bar */}
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[#ECEFF5]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#094CB2] to-[#1D63D0] transition-all duration-200"
            style={{ width: `${readinessPct}%` }}
          />
        </div>
      </div>

      {/* Main Two-Column Preparation Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Checklist, Pitch, Questions to Ask */}
        <div className="space-y-6 lg:col-span-5">
          {/* Readiness Checklist */}
          <div className="rounded-lg bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-[#141923]">
              Preparation Checklist
            </h3>
            <p className="mt-1 text-xs text-[#4D5566]">
              Saved automatically to localStorage for {selectedApp.company}.
            </p>

            <ul className="mt-4 space-y-2.5">
              {currentPrep.checklist.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-sm bg-[#F8FAFC] px-3 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(item.id)}
                    className="flex items-start gap-2.5 text-left text-xs leading-relaxed cursor-pointer"
                  >
                    {item.completed ? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#094CB2]"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#4D5566]/60"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={
                        item.completed ? 'text-[#4D5566] line-through' : 'text-[#141923]'
                      }
                    >
                      {item.label}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(item.id)}
                    aria-label="Remove checklist item"
                    className="rounded-sm p-1 text-[#4D5566]/70 hover:text-[#9F1239] cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={handleAddTask} className="mt-4 flex gap-2">
              <input
                type="text"
                value={newTaskLabel}
                onChange={(e) => setNewTaskLabel(e.target.value)}
                placeholder="Add custom prep milestone..."
                className="flex-1 rounded-sm bg-white px-3 py-1.5 text-xs text-[#141923] ghost-border ghost-border-focus"
              />
              <button
                type="submit"
                className="rounded-sm bg-[#E3E7F0] px-3 py-1.5 text-xs font-medium text-[#094CB2] hover:bg-[#D8DDE9] whitespace-nowrap cursor-pointer"
              >
                Add
              </button>
            </form>
          </div>

          {/* 60-Second Opening Pitch */}
          <div className="rounded-lg bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-[#141923]">
              60-Second Intro &amp; Role Alignment
            </h3>
            <p className="mt-1 text-xs text-[#4D5566]">
              Draft your opening narrative connecting your past impact to {selectedApp.company}.
            </p>
            <textarea
              rows={4}
              value={currentPrep.elevatorPitch}
              onChange={(e) =>
                onUpdatePrepRecord(selectedApp.id, (prev) => ({
                  ...ensureRecord(prev),
                  elevatorPitch: e.target.value,
                  updatedAt: new Date().toISOString(),
                }))
              }
              placeholder={`"Over the past X years I've focused on... What excites me about ${selectedApp.company} is..."`}
              className="mt-3 w-full rounded-sm bg-[#F8FAFC] p-3 text-xs leading-relaxed text-[#141923] ghost-border ghost-border-focus"
            />
          </div>

          {/* Questions to Ask the Interviewer */}
          <div className="rounded-lg bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-[#141923]">
              Questions to Ask the Panel
            </h3>
            <p className="mt-1 text-xs text-[#4D5566]">
              Keep thoughtful closing questions ready for the final 10 minutes.
            </p>
            <textarea
              rows={5}
              value={currentPrep.questionsToAsk}
              onChange={(e) =>
                onUpdatePrepRecord(selectedApp.id, (prev) => ({
                  ...ensureRecord(prev),
                  questionsToAsk: e.target.value,
                  updatedAt: new Date().toISOString(),
                }))
              }
              className="mt-3 w-full rounded-sm bg-[#F8FAFC] p-3 text-xs leading-relaxed text-[#141923] ghost-border ghost-border-focus"
            />
          </div>
        </div>

        {/* Right Column: JD Skills Sync + Question & Answer Practice Studio */}
        <div className="space-y-6 lg:col-span-7">
          {/* Job Description & Skills Reference */}
          <div className="rounded-lg bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-label text-xs font-semibold text-[#094CB2]">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Role Description &amp; AI Question Generator</span>
                </div>
                <h3 className="mt-1 font-serif text-lg font-semibold text-[#141923]">
                  Tailor Prep to the Job Description
                </h3>
              </div>

              <button
                type="button"
                disabled={analyzing}
                onClick={handleAnalyzeAndSyncQuestions}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-3.5 py-2 text-xs font-medium text-white hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {analyzing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                <span>
                  {analyzing ? 'Extracting...' : 'Extract Skills & Add 3 Questions'}
                </span>
              </button>
            </div>

            <textarea
              rows={3}
              value={jdInput}
              onChange={(e) => {
                setJdInput(e.target.value);
                if (analyzeError) setAnalyzeError(null);
              }}
              onBlur={() => {
                if (jdInput !== (selectedApp.jobDescription ?? '')) {
                  onSaveJdInsights(selectedApp.id, jdInput, selectedApp.aiInsights);
                }
              }}
              placeholder="Paste the job description here to extract required skills and sync 3 tailored practice questions below..."
              className="mt-3 w-full rounded-sm bg-[#F8FAFC] p-3 text-xs leading-relaxed text-[#141923] ghost-border ghost-border-focus"
            />

            {analyzeError && (
              <p role="alert" className="mt-2 rounded-sm bg-[#FDF1F2] px-3 py-2 text-xs text-[#9F1239]">
                {analyzeError}
              </p>
            )}

            {selectedApp.aiInsights?.skills && selectedApp.aiInsights.skills.length > 0 && (
              <div className="mt-3 rounded-sm bg-[#F3F5F9] px-3.5 py-2.5">
                <span className="font-label text-[11px] font-semibold text-[#4D5566]">
                  Key Required Skills:{' '}
                </span>
                <span className="text-xs text-[#141923]">
                  {selectedApp.aiInsights.skills.join(' · ')}
                </span>
              </div>
            )}
          </div>

          {/* Practice Questions & STAR Answer Worksheets */}
          <div className="rounded-lg bg-white p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[#141923]">
                  Interview Question &amp; Answer Practice
                </h3>
                <p className="mt-1 text-xs text-[#4D5566]">
                  Outline STAR talking points (Situation, Task, Action, Result) and mark each
                  prompt rehearsed.
                </p>
              </div>
              <span className="font-label text-xs font-medium text-[#094CB2] tabular-nums">
                {rehearsedCount} of {currentPrep.practiceQuestions.length} rehearsed
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {currentPrep.practiceQuestions.map((item, idx) => (
                <div key={item.id} className="rounded-md bg-[#F3F5F9] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="font-label text-xs font-semibold text-[#094CB2] tabular-nums mt-0.5">
                        0{idx + 1}.
                      </span>
                      <div>
                        <p className="font-serif text-sm font-semibold leading-snug text-[#141923]">
                          {item.question}
                        </p>
                        <span className="mt-1 inline-block font-label text-[11px] text-[#4D5566]">
                          {item.source === 'ai'
                            ? 'Tailored from Job Description'
                            : item.source === 'custom'
                              ? 'Custom Prompt'
                              : 'Core Prep Prompt'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuestion(item.id, { rehearsed: !item.rehearsed })
                        }
                        className={`inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          item.rehearsed
                            ? 'bg-[#E6F4EE] text-[#116341]'
                            : 'bg-white text-[#4D5566] hover:text-[#094CB2]'
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        <span>{item.rehearsed ? 'Rehearsed' : 'Mark Rehearsed'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(item.id)}
                        aria-label="Delete practice question"
                        className="rounded-sm p-1 text-[#4D5566]/70 hover:text-[#9F1239] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={item.answerDraft}
                    onChange={(e) =>
                      handleUpdateQuestion(item.id, { answerDraft: e.target.value })
                    }
                    placeholder="Situation · Task · Action · Quantified Result..."
                    className="mt-3 w-full rounded-sm bg-white p-3 text-xs leading-relaxed text-[#141923] ghost-border ghost-border-focus"
                  />
                </div>
              ))}
            </div>

            <form onSubmit={handleAddQuestion} className="mt-5 flex gap-2">
              <input
                type="text"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Add another interview question to rehearse..."
                className="flex-1 rounded-md bg-white px-3 py-2 text-xs text-[#141923] ghost-border ghost-border-focus"
              />
              <button
                type="submit"
                className="rounded-md bg-[#E3E7F0] px-4 py-2 text-xs font-medium text-[#094CB2] hover:bg-[#D8DDE9] whitespace-nowrap cursor-pointer"
              >
                Add Question
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
