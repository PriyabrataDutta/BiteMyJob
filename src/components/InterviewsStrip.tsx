import { Calendar, Clock, ArrowUpRight, Plus } from 'lucide-react';
import { JobApplication } from '../types/application';
import {
  diffCalendarDays,
  formatRelativeDayLabel,
  formatTime12h,
  getTodayISO,
} from '../utils/dateUtils';

interface InterviewsStripProps {
  interviews: JobApplication[];
  onSelectApplication: (app: JobApplication) => void;
  onScheduleInterview: () => void;
  onViewAllInterviews: () => void;
}

export function InterviewsStrip({
  interviews,
  onSelectApplication,
  onScheduleInterview,
  onViewAllInterviews,
}: InterviewsStripProps) {
  const todayISO = getTodayISO();

  return (
    <section
      aria-label="Upcoming interviews summary"
      className="rounded-lg bg-[#ECEFF5] p-5 lg:p-6"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-label text-xs font-semibold tracking-wide text-[#4D5566]">
            Upcoming Interviews
          </span>
          <span className="text-xs font-medium text-[#4D5566] tabular-nums">
            · {interviews.length} scheduled
          </span>
        </div>

        <div className="flex items-center gap-4">
          {interviews.length > 0 && (
            <button
              type="button"
              onClick={onViewAllInterviews}
              className="text-xs font-medium text-[#094CB2] hover:underline underline-offset-4 whitespace-nowrap cursor-pointer"
            >
              Focus interview queue
            </button>
          )}
          <button
            type="button"
            onClick={onScheduleInterview}
            className="inline-flex items-center gap-1.5 rounded-sm bg-[#E3E7F0] px-3 py-1.5 text-xs font-medium text-[#094CB2] transition-colors hover:bg-[#D8DDE9] whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Schedule Interview</span>
          </button>
        </div>
      </div>

      {interviews.length === 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-md bg-white px-5 py-4">
          <div>
            <p className="font-serif text-base font-medium text-[#141923]">
              No upcoming interviews on the calendar
            </p>
            <p className="mt-0.5 text-xs text-[#4D5566]">
              Add an interview date and round to any application to pin your prep briefing here.
            </p>
          </div>
          <button
            type="button"
            onClick={onScheduleInterview}
            className="self-start sm:self-auto rounded-md bg-[#E3E7F0] px-3.5 py-2 text-xs font-medium text-[#094CB2] transition-colors hover:bg-[#D8DDE9] whitespace-nowrap cursor-pointer"
          >
            Add Interview Date
          </button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-1 editorial-scroll">
          {interviews.map((app) => {
            const delta = app.interviewDate ? diffCalendarDays(app.interviewDate, todayISO) : 99;
            const isToday = delta === 0;
            const dayLabel = app.interviewDate
              ? formatRelativeDayLabel(app.interviewDate, todayISO)
              : 'TBD';
            const timeLabel = app.interviewTime ? formatTime12h(app.interviewTime) : 'Time TBD';

            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onSelectApplication(app)}
                className="group flex min-w-[270px] max-w-[320px] shrink-0 flex-col justify-between rounded-md bg-white p-4 text-left transition-all duration-150 hover:bg-[#FAFBFD] hover:-translate-y-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#094CB2]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-label text-[11px] font-semibold tabular-nums ${
                        isToday
                          ? 'bg-[#FBF6DC] text-[#6D5E00]'
                          : 'bg-[#F3F5F9] text-[#094CB2]'
                      }`}
                    >
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      <span>{dayLabel}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 font-label text-xs font-medium text-[#4D5566] tabular-nums">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {timeLabel}
                    </span>
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-label text-xs font-semibold text-[#4D5566] truncate">
                        {app.company}
                      </p>
                      <h3 className="mt-0.5 font-serif text-sm font-semibold text-[#141923] line-clamp-1 group-hover:text-[#094CB2] transition-colors">
                        {app.role}
                      </h3>
                    </div>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 text-[#4D5566] opacity-60 transition-opacity group-hover:opacity-100 group-hover:text-[#094CB2]"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-[#4D5566] truncate">
                  <span className="font-medium text-[#141923] truncate">
                    {app.interviewRound || 'Interview Session'}
                  </span>
                  {app.interviewFormat && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{app.interviewFormat}</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
