import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Edit3,
  FileText,
  Hourglass,
  Loader2,
} from 'lucide-react';
import {
  ALL_STAGES,
  ApplicationStage,
  JobApplication,
  JobDescriptionInsights,
} from '../types/application';
import {
  addDaysToISO,
  formatRelativeDayLabel,
  formatShortDate,
  formatTime12h,
  getFollowUpUrgency,
  getIdleDays,
  getOverdueDays,
  getTodayISO,
  isApplicationIdle,
  isUpcomingInterview,
} from '../utils/dateUtils';
import { analyzeJobDescription } from '../utils/jdAnalysis';

interface ApplicationCardProps {
  application: JobApplication;
  idleThresholdDays: number;
  onOpenDossier: (app: JobApplication) => void;
  onEdit: (app: JobApplication) => void;
  onUpdateFollowUp: (id: string, nextDate: string | undefined) => void;
  onMarkFollowedUp: (id: string) => void;
  onStageChange: (id: string, nextStage: ApplicationStage) => void;
  onSaveJdInsights: (
    id: string,
    jobDescription: string,
    aiInsights?: JobDescriptionInsights
  ) => void;
}

const STAGE_STYLES: Record<ApplicationStage, string> = {
  Saved: 'bg-[#ECEFF5] text-[#4D5566]',
  Applied: 'bg-[#E9F0FC] text-[#094CB2]',
  Screening: 'bg-[#F3EEFF] text-[#5B21B6]',
  Interview: 'bg-[#E6F4EE] text-[#116341]',
  Offer: 'bg-[#FBF6DC] text-[#6D5E00]',
  Rejected: 'bg-[#F3F5F9] text-[#64748B]',
  Withdrawn: 'bg-[#F3F5F9] text-[#64748B]',
};

export function ApplicationCard({
  application,
  idleThresholdDays,
  onOpenDossier,
  onEdit,
  onUpdateFollowUp,
  onMarkFollowedUp,
  onStageChange,
  onSaveJdInsights,
}: ApplicationCardProps) {
  const [editingFollowUp, setEditingFollowUp] = useState(false);
  const [jdExpanded, setJdExpanded] = useState(false);
  const [jdDraft, setJdDraft] = useState(application.jobDescription ?? '');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  useEffect(() => {
    setJdDraft(application.jobDescription ?? '');
  }, [application.jobDescription]);

  const todayISO = getTodayISO();

  const urgency = getFollowUpUrgency(application.followUpDate, application.stage, todayISO);
  const overdueDays = getOverdueDays(application.followUpDate, todayISO);
  const idle = isApplicationIdle(application, idleThresholdDays, todayISO);
  const idleDays = getIdleDays(application, todayISO);
  const hasUpcomingInterview = isUpcomingInterview(application, todayISO);
  const insights = application.aiInsights;

  const handleAnalyzeJd = async () => {
    const trimmed = jdDraft.trim();
    if (trimmed.length < 20) {
      setAnalyzeError('Paste at least a short job description (20+ characters) first.');
      return;
    }

    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await analyzeJobDescription(application, trimmed);
      onSaveJdInsights(application.id, trimmed, result);
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : 'Unable to extract job description insights.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyFollowUp = async () => {
    if (!insights?.followUpDraft) return;
    try {
      await navigator.clipboard.writeText(insights.followUpDraft);
      setCopiedDraft(true);
      window.setTimeout(() => setCopiedDraft(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <article className="group flex flex-col justify-between rounded-md bg-white p-5 transition-all duration-150 hover:bg-[#FAFBFD] hover:-translate-y-0.5">
      <div>
        {/* Card Lead: Company + Stage */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4D5566] font-label">
              <span className="truncate">{application.company}</span>
              {application.source && (
                <>
                  <span aria-hidden="true" className="text-[#4D5566]/50">
                    ·
                  </span>
                  <span className="font-normal truncate">{application.source}</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpenDossier(application)}
              className="mt-1 text-left font-serif text-lg font-semibold leading-snug text-[#141923] transition-colors group-hover:text-[#094CB2] cursor-pointer"
            >
              {application.role}
            </button>
          </div>

          <select
            value={application.stage}
            onChange={(e) => onStageChange(application.id, e.target.value as ApplicationStage)}
            aria-label={`Stage for ${application.company}`}
            className={`shrink-0 rounded-sm px-2.5 py-1 font-label text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#094CB2] ${
              STAGE_STYLES[application.stage]
            }`}
          >
            {ALL_STAGES.map((st) => (
              <option key={st} value={st} className="bg-white text-[#141923]">
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Unboxed Metadata Row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4D5566]">
          <span>{application.workMode}</span>
          {application.location && (
            <>
              <span aria-hidden="true">·</span>
              <span>{application.location}</span>
            </>
          )}
          {application.compensation && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-[#141923] tabular-nums">
                {application.compensation}
              </span>
            </>
          )}
          {application.resumeVersion && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-label font-medium text-[#094CB2]">
                {application.resumeVersion}
              </span>
            </>
          )}
        </div>

        {/* Status Badges: Due Today, Overdue, Idle Alert */}
        {(urgency === 'due-today' || urgency === 'overdue' || idle) && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {urgency === 'due-today' && (
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#FBF6DC] px-2.5 py-1 font-label text-xs font-semibold text-[#6D5E00]">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Due Today</span>
              </span>
            )}

            {urgency === 'overdue' && (
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#FDF1F2] px-2.5 py-1 font-label text-xs font-semibold text-[#9F1239] tabular-nums">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  Overdue · {overdueDays} {overdueDays === 1 ? 'day' : 'days'}
                </span>
              </span>
            )}

            {idle && (
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#ECEFF5] px-2.5 py-1 font-label text-xs font-medium text-[#4D5566] tabular-nums">
                <Hourglass className="h-3.5 w-3.5 text-[#6D5E00]" aria-hidden="true" />
                <span>Idle · {idleDays}d inactive</span>
              </span>
            )}
          </div>
        )}

        {/* Upcoming Interview Preview (when scheduled) */}
        {hasUpcomingInterview && application.interviewDate && (
          <div className="mt-3.5 flex items-center justify-between gap-2 rounded-sm bg-[#F3F5F9] px-3 py-2 text-xs">
            <div className="min-w-0">
              <span className="font-label font-semibold text-[#094CB2]">
                Interview: {formatRelativeDayLabel(application.interviewDate, todayISO)}
                {application.interviewTime ? ` · ${formatTime12h(application.interviewTime)}` : ''}
              </span>
              {application.interviewRound && (
                <p className="mt-0.5 truncate text-[#4D5566]">{application.interviewRound}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenDossier(application)}
              className="shrink-0 font-medium text-[#094CB2] hover:underline underline-offset-2 cursor-pointer"
            >
              Prep
            </button>
          </div>
        )}

        {/* Notes excerpt */}
        {application.notes && (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[#4D5566]">
            {application.notes}
          </p>
        )}

        {/* Job Description & AI Prep Drawer directly on Card */}
        <div className="mt-4 rounded-sm bg-[#F8FAFC] p-3">
          <button
            type="button"
            onClick={() => setJdExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-[#094CB2] cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {insights
                  ? `JD Insights · ${insights.skills.length} skills · 3 questions`
                  : 'Paste Job Description for AI Prep'}
              </span>
            </span>
            {jdExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[#4D5566]" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#4D5566]" aria-hidden="true" />
            )}
          </button>

          {jdExpanded && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block font-label text-[11px] font-semibold text-[#4D5566]">
                  Job Description
                </label>
                <textarea
                  rows={4}
                  value={jdDraft}
                  onChange={(e) => {
                    setJdDraft(e.target.value);
                    if (analyzeError) setAnalyzeError(null);
                  }}
                  onBlur={() => {
                    if (jdDraft !== (application.jobDescription ?? '')) {
                      onSaveJdInsights(application.id, jdDraft, application.aiInsights);
                    }
                  }}
                  placeholder="Paste the role description here to extract key skills, 3 tailored interview questions, and a recruiter follow-up note..."
                  className="w-full rounded-sm bg-white p-2.5 text-xs leading-relaxed text-[#141923] placeholder:text-[#4D5566]/65 ghost-border ghost-border-focus"
                />
              </div>

              {analyzeError && (
                <p role="alert" className="rounded-sm bg-[#FDF1F2] px-2.5 py-2 text-xs text-[#9F1239]">
                  {analyzeError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={analyzing}
                  onClick={handleAnalyzeJd}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {analyzing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                  <span>
                    {analyzing
                      ? 'Analyzing JD...'
                      : insights
                        ? 'Re-analyze JD'
                        : 'Extract Skills & Draft Prep'}
                  </span>
                </button>

                {insights && (
                  <button
                    type="button"
                    onClick={() => onOpenDossier(application)}
                    className="text-xs font-medium text-[#094CB2] hover:underline underline-offset-2 cursor-pointer"
                  >
                    Expand in Dossier
                  </button>
                )}
              </div>

              {insights && (
                <div className="space-y-3 pt-1">
                  {/* Required Skills */}
                  {insights.skills.length > 0 && (
                    <div>
                      <p className="font-label text-[11px] font-semibold text-[#4D5566]">
                        Key Required Skills
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[#141923]">
                        {insights.skills.join(' · ')}
                      </p>
                    </div>
                  )}

                  {/* 3 Tailored Interview Questions */}
                  {insights.interviewQuestions.length > 0 && (
                    <div>
                      <p className="font-label text-[11px] font-semibold text-[#4D5566]">
                        3 Tailored Interview Questions
                      </p>
                      <ol className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-[#141923]">
                        {insights.interviewQuestions.map((q, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="font-label font-semibold text-[#094CB2] tabular-nums">
                              0{idx + 1}.
                            </span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Recruiter Follow-Up Draft */}
                  {insights.followUpDraft && (
                    <div className="rounded-sm bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-label text-[11px] font-semibold text-[#6D5E00]">
                          Recruiter Follow-up Draft
                        </p>
                        <button
                          type="button"
                          onClick={handleCopyFollowUp}
                          className="inline-flex items-center gap-1 rounded-sm bg-[#F3F5F9] px-2 py-0.5 text-[11px] font-medium text-[#094CB2] hover:bg-[#E3E7F0] cursor-pointer"
                        >
                          {copiedDraft ? (
                            <>
                              <Check className="h-3 w-3" aria-hidden="true" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" aria-hidden="true" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap font-serif text-xs leading-relaxed text-[#141923]">
                        {insights.followUpDraft}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Follow-up Date & Card Footer */}
      <div className="mt-4 rounded-sm bg-[#F3F5F9] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <CalendarClock
              className={`h-3.5 w-3.5 shrink-0 ${
                urgency === 'overdue'
                  ? 'text-[#9F1239]'
                  : urgency === 'due-today'
                    ? 'text-[#6D5E00]'
                    : 'text-[#094CB2]'
              }`}
              aria-hidden="true"
            />
            {editingFollowUp ? (
              <input
                type="date"
                value={application.followUpDate || ''}
                onChange={(e) => {
                  onUpdateFollowUp(application.id, e.target.value || undefined);
                  setEditingFollowUp(false);
                }}
                onBlur={() => setEditingFollowUp(false)}
                autoFocus
                aria-label="Edit follow-up date"
                className="rounded-sm bg-white px-2 py-0.5 text-xs text-[#141923] ghost-border ghost-border-focus tabular-nums"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingFollowUp(true)}
                className="text-left text-xs hover:text-[#094CB2] hover:underline underline-offset-2 cursor-pointer tabular-nums"
              >
                <span className="font-label text-[#4D5566]">Follow-up: </span>
                <span
                  className={`font-medium ${
                    urgency === 'overdue'
                      ? 'text-[#9F1239]'
                      : urgency === 'due-today'
                        ? 'text-[#6D5E00]'
                        : 'text-[#141923]'
                  }`}
                >
                  {application.followUpDate ? formatShortDate(application.followUpDate) : 'Not set'}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {application.followUpDate ? (
              <>
                <button
                  type="button"
                  onClick={() => onMarkFollowedUp(application.id)}
                  title="Log follow-up completed today"
                  className="inline-flex items-center gap-1 rounded-sm bg-white px-2 py-1 text-[11px] font-medium text-[#094CB2] transition-colors hover:bg-[#E3E7F0] cursor-pointer"
                >
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  <span>Followed up</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateFollowUp(
                      application.id,
                      addDaysToISO(
                        urgency === 'overdue' ? todayISO : application.followUpDate!,
                        3
                      )
                    )
                  }
                  title="Snooze follow-up by 3 days"
                  className="rounded-sm bg-[#E3E7F0] px-2 py-1 text-[11px] font-medium text-[#4D5566] transition-colors hover:bg-[#D8DDE9] hover:text-[#141923] cursor-pointer tabular-nums"
                >
                  +3d
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onUpdateFollowUp(application.id, addDaysToISO(todayISO, 3))}
                className="inline-flex items-center gap-1 rounded-sm bg-white px-2 py-1 text-[11px] font-medium text-[#094CB2] transition-colors hover:bg-[#E3E7F0] cursor-pointer"
              >
                <CalendarPlus className="h-3 w-3" aria-hidden="true" />
                <span>Set +3d</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#4D5566] tabular-nums">
          <span>
            Applied {formatShortDate(application.appliedDate)} · Active{' '}
            {formatShortDate(application.lastActivityDate)}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onEdit(application)}
              className="inline-flex items-center gap-1 font-medium text-[#4D5566] hover:text-[#094CB2] cursor-pointer"
            >
              <Edit3 className="h-3 w-3" aria-hidden="true" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenDossier(application)}
              className="font-medium text-[#094CB2] hover:underline underline-offset-2 cursor-pointer"
            >
              Open Dossier
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
