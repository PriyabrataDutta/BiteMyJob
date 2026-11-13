import { AlertCircle, CheckCircle2, Clock, Edit3, Hourglass } from 'lucide-react';
import { ALL_STAGES, ApplicationStage, JobApplication } from '../types/application';
import {
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

interface ApplicationLedgerProps {
  applications: JobApplication[];
  idleThresholdDays: number;
  onOpenDossier: (app: JobApplication) => void;
  onEdit: (app: JobApplication) => void;
  onUpdateFollowUp: (id: string, nextDate: string | undefined) => void;
  onMarkFollowedUp: (id: string) => void;
  onStageChange: (id: string, nextStage: ApplicationStage) => void;
}

export function ApplicationLedger({
  applications,
  idleThresholdDays,
  onOpenDossier,
  onEdit,
  onUpdateFollowUp,
  onMarkFollowedUp,
  onStageChange,
}: ApplicationLedgerProps) {
  const todayISO = getTodayISO();

  return (
    <div className="overflow-x-auto rounded-lg bg-white">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="bg-[#ECEFF5] font-label text-[11px] font-semibold uppercase tracking-wider text-[#4D5566]">
            <th className="px-5 py-3.5">Company &amp; Role</th>
            <th className="px-4 py-3.5">Stage</th>
            <th className="px-4 py-3.5">Follow-up Date &amp; Status</th>
            <th className="px-4 py-3.5">Activity &amp; Idle</th>
            <th className="px-4 py-3.5">Next Interview</th>
            <th className="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app, index) => {
            const urgency = getFollowUpUrgency(app.followUpDate, app.stage, todayISO);
            const overdueDays = getOverdueDays(app.followUpDate, todayISO);
            const idle = isApplicationIdle(app, idleThresholdDays, todayISO);
            const idleDays = getIdleDays(app, todayISO);
            const hasInterview = isUpcomingInterview(app, todayISO);
            const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]';

            return (
              <tr
                key={app.id}
                className={`${rowBg} transition-colors duration-150 hover:bg-[#F3F5F9]`}
              >
                <td className="px-5 py-4 align-top">
                  <div className="font-label text-xs font-semibold text-[#4D5566]">
                    {app.company}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDossier(app)}
                    className="mt-0.5 text-left font-serif text-sm font-semibold text-[#141923] hover:text-[#094CB2] cursor-pointer"
                  >
                    {app.role}
                  </button>
                  <div className="mt-1 text-xs text-[#4D5566]">
                    {app.workMode}
                    {app.location ? ` · ${app.location}` : ''}
                    {app.compensation ? ` · ${app.compensation}` : ''}
                  </div>
                </td>

                <td className="px-4 py-4 align-top">
                  <select
                    value={app.stage}
                    onChange={(e) => onStageChange(app.id, e.target.value as ApplicationStage)}
                    aria-label={`Stage for ${app.company}`}
                    className="rounded-sm bg-[#ECEFF5] px-2.5 py-1 font-label text-xs font-semibold text-[#141923] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#094CB2]"
                  >
                    {ALL_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="px-4 py-4 align-top">
                  <div className="flex flex-col items-start gap-1.5">
                    <input
                      type="date"
                      value={app.followUpDate || ''}
                      onChange={(e) => onUpdateFollowUp(app.id, e.target.value || undefined)}
                      aria-label={`Follow-up date for ${app.company}`}
                      className="rounded-sm bg-white px-2 py-1 text-xs text-[#141923] ghost-border ghost-border-focus tabular-nums"
                    />
                    {urgency === 'due-today' && (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-[#FBF6DC] px-2 py-0.5 font-label text-[11px] font-semibold text-[#6D5E00]">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <span>Due Today</span>
                      </span>
                    )}
                    {urgency === 'overdue' && (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-[#FDF1F2] px-2 py-0.5 font-label text-[11px] font-semibold text-[#9F1239] tabular-nums">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        <span>Overdue · {overdueDays}d</span>
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4 align-top text-xs tabular-nums">
                  <div className="text-[#141923]">
                    Active {formatShortDate(app.lastActivityDate)}
                  </div>
                  <div className="mt-0.5 text-[#4D5566]">
                    Applied {formatShortDate(app.appliedDate)}
                  </div>
                  {idle && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-sm bg-[#ECEFF5] px-2 py-0.5 font-label text-[11px] font-medium text-[#6D5E00]">
                      <Hourglass className="h-3 w-3" aria-hidden="true" />
                      <span>Idle · {idleDays}d</span>
                    </span>
                  )}
                </td>

                <td className="px-4 py-4 align-top text-xs">
                  {hasInterview && app.interviewDate ? (
                    <div>
                      <div className="font-medium text-[#094CB2] tabular-nums">
                        {formatRelativeDayLabel(app.interviewDate, todayISO)}
                        {app.interviewTime ? ` · ${formatTime12h(app.interviewTime)}` : ''}
                      </div>
                      <div className="mt-0.5 text-[#4D5566]">
                        {app.interviewRound || 'Interview'}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[#4D5566]/70">None scheduled</span>
                  )}
                </td>

                <td className="px-5 py-4 align-top text-right">
                  <div className="inline-flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onMarkFollowedUp(app.id)}
                      title="Log check-in / follow-up today"
                      className="inline-flex items-center gap-1 rounded-sm bg-[#E3E7F0] px-2.5 py-1 text-xs font-medium text-[#094CB2] transition-colors hover:bg-[#D8DDE9] cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Check in</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(app)}
                      aria-label={`Edit ${app.company}`}
                      className="rounded-sm p-1.5 text-[#4D5566] transition-colors hover:bg-[#ECEFF5] hover:text-[#141923] cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
