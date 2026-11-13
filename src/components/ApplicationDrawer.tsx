import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Hourglass,
  Loader2,
  Mail,
  User,
  X,
} from 'lucide-react';
import {
  ALL_STAGES,
  ApplicationStage,
  JobApplication,
  JobDescriptionInsights,
} from '../types/application';
import {
  addDaysToISO,
  formatFullDate,
  formatRelativeDayLabel,
  formatTime12h,
  getFollowUpUrgency,
  getIdleDays,
  getOverdueDays,
  getTodayISO,
  isApplicationIdle,
  isUpcomingInterview,
} from '../utils/dateUtils';
import { downloadIcsFile, generateIcsCalendar, slugifyFilename } from '../utils/icsExport';
import { analyzeJobDescription } from '../utils/jdAnalysis';

interface ApplicationDrawerProps {
  application: JobApplication | null;
  idleThresholdDays: number;
  onClose: () => void;
  onEdit: (app: JobApplication) => void;
  onUpdateFollowUp: (id: string, nextDate: string | undefined) => void;
  onMarkFollowedUp: (id: string) => void;
  onStageChange: (id: string, nextStage: ApplicationStage) => void;
  onSaveJdInsights: (
    id: string,
    jobDescription: string,
    aiInsights?: JobDescriptionInsights
  ) => void;
  onExportIcsNotice?: (message: string) => void;
}

export function ApplicationDrawer({
  application,
  idleThresholdDays,
  onClose,
  onEdit,
  onUpdateFollowUp,
  onMarkFollowedUp,
  onStageChange,
  onSaveJdInsights,
  onExportIcsNotice,
}: ApplicationDrawerProps) {
  const [jdDraft, setJdDraft] = useState(application?.jobDescription ?? '');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  useEffect(() => {
    setJdDraft(application?.jobDescription ?? '');
    setAnalyzeError(null);
    setCopiedDraft(false);
  }, [application?.id, application?.jobDescription]);

  if (!application) return null;

  const todayISO = getTodayISO();
  const urgency = getFollowUpUrgency(application.followUpDate, application.stage, todayISO);
  const overdueDays = getOverdueDays(application.followUpDate, todayISO);
  const idle = isApplicationIdle(application, idleThresholdDays, todayISO);
  const idleDays = getIdleDays(application, todayISO);
  const hasInterview = isUpcomingInterview(application, todayISO);
  const insights = application.aiInsights;

  const handleAnalyze = async () => {
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
        err instanceof Error ? err.message : 'Unable to analyze job description.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyDraft = async () => {
    if (!insights?.followUpDraft) return;
    try {
      await navigator.clipboard.writeText(insights.followUpDraft);
      setCopiedDraft(true);
      window.setTimeout(() => setCopiedDraft(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${application.company} dossier`}
      className="fixed inset-0 z-40 flex justify-end bg-[#141923]/20 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <aside
        className="alexandria-modal-shadow flex h-full w-full max-w-xl flex-col justify-between overflow-y-auto bg-white p-6 lg:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-label text-xs font-semibold text-[#094CB2]">
                {application.company}
                {application.source ? ` · ${application.source}` : ''}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold leading-snug text-[#141923]">
                {application.role}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dossier"
              className="rounded-md p-2 text-[#4D5566] transition-colors hover:bg-[#F3F5F9] hover:text-[#141923] cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#4D5566]">
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
                <span className="font-label font-semibold text-[#094CB2]">
                  {application.resumeVersion}
                </span>
              </>
            )}
          </div>

          {/* Urgency & Idle Badges */}
          {(urgency === 'due-today' || urgency === 'overdue' || idle) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {urgency === 'due-today' && (
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#FBF6DC] px-2.5 py-1 font-label text-xs font-semibold text-[#6D5E00]">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Follow-up Due Today</span>
                </span>
              )}
              {urgency === 'overdue' && (
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#FDF1F2] px-2.5 py-1 font-label text-xs font-semibold text-[#9F1239] tabular-nums">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Follow-up Overdue · {overdueDays}d</span>
                </span>
              )}
              {idle && (
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#ECEFF5] px-2.5 py-1 font-label text-xs font-medium text-[#6D5E00] tabular-nums">
                  <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Idle Alert · {idleDays} days without activity</span>
                </span>
              )}
            </div>
          )}

          {/* Stage Selector */}
          <div className="mt-6 rounded-md bg-[#F3F5F9] p-4">
            <label className="block font-label text-xs font-semibold text-[#4D5566]">
              Current Pipeline Stage
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_STAGES.map((st) => {
                const active = application.stage === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => onStageChange(application.id, st)}
                    className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#094CB2] text-white'
                        : 'bg-white text-[#4D5566] hover:text-[#141923]'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Follow-up & Activity Card */}
          <div className="mt-4 rounded-md bg-[#ECEFF5] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-[#094CB2]" aria-hidden="true" />
                <span className="font-label text-xs font-semibold text-[#141923]">
                  Follow-up Schedule
                </span>
              </div>
              <button
                type="button"
                onClick={() => onMarkFollowedUp(application.id)}
                className="inline-flex items-center gap-1.5 rounded-sm bg-white px-2.5 py-1 text-xs font-medium text-[#094CB2] hover:bg-[#F3F5F9] cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Log Check-in Today</span>
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={application.followUpDate || ''}
                onChange={(e) => onUpdateFollowUp(application.id, e.target.value || undefined)}
                aria-label="Follow-up date"
                className="rounded-sm bg-white px-3 py-1.5 text-xs text-[#141923] ghost-border ghost-border-focus tabular-nums"
              />
              <button
                type="button"
                onClick={() => onUpdateFollowUp(application.id, addDaysToISO(todayISO, 3))}
                className="rounded-sm bg-white px-2.5 py-1.5 text-xs font-medium text-[#4D5566] hover:text-[#094CB2] cursor-pointer"
              >
                +3 days
              </button>
              <button
                type="button"
                onClick={() => onUpdateFollowUp(application.id, addDaysToISO(todayISO, 7))}
                className="rounded-sm bg-white px-2.5 py-1.5 text-xs font-medium text-[#4D5566] hover:text-[#094CB2] cursor-pointer"
              >
                +1 week
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#4D5566] tabular-nums">
              <span>Applied: {formatFullDate(application.appliedDate)}</span>
              <span>Last Activity: {formatFullDate(application.lastActivityDate)}</span>
            </div>
          </div>

          {/* Interview Schedule */}
          {hasInterview && application.interviewDate && (
            <div className="mt-4 rounded-md bg-[#FBF6DC] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-label text-xs font-semibold text-[#6D5E00]">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span>Upcoming Interview Briefing</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const ics = generateIcsCalendar([application]);
                    downloadIcsFile(ics, `${slugifyFilename(application.company)}-interview.ics`);
                    onExportIcsNotice?.(`Exported calendar invite for ${application.company}`);
                  }}
                  className="inline-flex items-center gap-1 rounded-sm bg-white px-2.5 py-1 font-label text-[11px] font-semibold text-[#094CB2] hover:bg-[#F3F5F9] cursor-pointer"
                >
                  <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Export .ics</span>
                </button>
              </div>
              <p className="mt-2 font-serif text-base font-semibold text-[#141923] tabular-nums">
                {formatRelativeDayLabel(application.interviewDate, todayISO)}
                {application.interviewTime ? ` at ${formatTime12h(application.interviewTime)}` : ''}
              </p>
              <p className="mt-1 text-xs text-[#544800]">
                {application.interviewRound || 'Interview Session'}
                {application.interviewFormat ? ` · ${application.interviewFormat}` : ''}
              </p>
            </div>
          )}

          {/* Job Description & AI Briefing */}
          <div className="mt-5 rounded-md bg-[#F3F5F9] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#094CB2]" aria-hidden="true" />
                <h3 className="font-label text-xs font-semibold text-[#141923]">
                  Job Description &amp; AI Briefing
                </h3>
              </div>
              <button
                type="button"
                disabled={analyzing}
                onClick={handleAnalyze}
                className="inline-flex items-center gap-1.5 rounded-sm bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-3 py-1.5 text-xs font-medium text-white hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {analyzing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                <span>
                  {analyzing ? 'Analyzing...' : insights ? 'Re-analyze JD' : 'Analyze JD'}
                </span>
              </button>
            </div>

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
              placeholder="Paste the job description to extract key required skills, 3 tailored interview questions, and a recruiter follow-up note..."
              className="mt-3 w-full rounded-sm bg-white p-3 text-xs leading-relaxed text-[#141923] ghost-border ghost-border-focus"
            />

            {analyzeError && (
              <p role="alert" className="mt-2 rounded-sm bg-[#FDF1F2] px-3 py-2 text-xs text-[#9F1239]">
                {analyzeError}
              </p>
            )}

            {insights && (
              <div className="mt-4 space-y-4">
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

                {insights.interviewQuestions.length > 0 && (
                  <div>
                    <p className="font-label text-[11px] font-semibold text-[#4D5566]">
                      3 Tailored Interview Questions
                    </p>
                    <ol className="mt-1.5 space-y-2 text-xs leading-relaxed text-[#141923]">
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

                {insights.followUpDraft && (
                  <div className="rounded-sm bg-white p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-label text-[11px] font-semibold text-[#6D5E00]">
                        Recruiter Follow-up Draft
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyDraft}
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
                    <p className="mt-2 whitespace-pre-wrap font-serif text-xs leading-relaxed text-[#141923]">
                      {insights.followUpDraft}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact & Links */}
          {(application.contactName || application.contactEmail || application.jobUrl) && (
            <div className="mt-5 space-y-2 text-xs text-[#4D5566]">
              {application.contactName && (
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-[#094CB2]" aria-hidden="true" />
                  <span className="font-medium text-[#141923]">{application.contactName}</span>
                </div>
              )}
              {application.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-[#094CB2]" aria-hidden="true" />
                  <a
                    href={`mailto:${application.contactEmail}`}
                    className="text-[#094CB2] hover:underline underline-offset-2"
                  >
                    {application.contactEmail}
                  </a>
                </div>
              )}
              {application.jobUrl && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-[#094CB2]" aria-hidden="true" />
                  <a
                    href={application.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#094CB2] hover:underline underline-offset-2 truncate"
                  >
                    {application.jobUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Editorial Notes */}
          <div className="mt-6">
            <h3 className="font-label text-xs font-semibold text-[#4D5566]">
              Editorial Notes &amp; Preparation
            </h3>
            <p className="mt-2 whitespace-pre-wrap font-serif text-sm leading-relaxed text-[#141923]">
              {application.notes || 'No dossier notes recorded yet.'}
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#E3E7F0] px-4 py-2 text-sm font-medium text-[#094CB2] hover:bg-[#D8DDE9] cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onEdit(application)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-4 py-2 text-sm font-medium text-white hover:opacity-95 cursor-pointer"
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            <span>Edit Dossier</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
