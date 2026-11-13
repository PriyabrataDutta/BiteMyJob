import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { JobApplication } from '../types/application';
import { getIdleDays, getTodayISO } from '../utils/dateUtils';

interface IdleAlertsBannerProps {
  idleApps: JobApplication[];
  idleThresholdDays: number;
  onChangeThreshold: (days: number) => void;
  onFilterIdle: () => void;
  onQuickCheckIn: (id: string) => void;
  onSelectApplication: (app: JobApplication) => void;
  onDismiss: () => void;
}

export function IdleAlertsBanner({
  idleApps,
  idleThresholdDays,
  onChangeThreshold,
  onFilterIdle,
  onQuickCheckIn,
  onSelectApplication,
  onDismiss,
}: IdleAlertsBannerProps) {
  if (idleApps.length === 0) return null;

  const todayISO = getTodayISO();
  const sortedIdle = [...idleApps].sort(
    (a, b) => getIdleDays(b, todayISO) - getIdleDays(a, todayISO)
  );
  const topIdle = sortedIdle.slice(0, 3);

  return (
    <section
      aria-label="Idle applications alert"
      className="rounded-lg bg-[#FBF6DC] px-5 py-4 lg:px-6"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[#6D5E00]/12 text-[#6D5E00]">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="font-serif text-base font-semibold text-[#3F3600]">
                {idleApps.length} {idleApps.length === 1 ? 'application has' : 'applications have'} gone idle
              </h2>
              <span className="font-label text-xs text-[#6D5E00] tabular-nums">
                No activity in {idleThresholdDays}+ days
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#544800]">
              {topIdle.map((app) => {
                const days = getIdleDays(app, todayISO);
                return (
                  <div key={app.id} className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectApplication(app)}
                      className="font-medium text-[#3F3600] hover:text-[#094CB2] hover:underline underline-offset-2 cursor-pointer"
                    >
                      {app.company} ({days}d)
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickCheckIn(app.id)}
                      title="Log check-in today and reset idle timer"
                      className="inline-flex items-center gap-1 rounded-sm bg-white/80 px-1.5 py-0.5 text-[11px] font-medium text-[#094CB2] transition-colors hover:bg-white cursor-pointer"
                    >
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      <span>Check in</span>
                    </button>
                  </div>
                );
              })}
              {sortedIdle.length > 3 && (
                <span className="text-[#6D5E00] tabular-nums">
                  +{sortedIdle.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <label className="inline-flex items-center gap-1.5 text-xs text-[#544800]">
            <span className="font-label">Threshold</span>
            <select
              value={idleThresholdDays}
              onChange={(e) => onChangeThreshold(Number(e.target.value))}
              aria-label="Idle threshold days"
              className="rounded-sm bg-white/85 px-2 py-1 text-xs font-medium text-[#3F3600] ghost-border ghost-border-focus cursor-pointer tabular-nums"
            >
              <option value={5}>5 days</option>
              <option value={7}>7 days</option>
              <option value={10}>10 days</option>
              <option value={14}>14 days</option>
            </select>
          </label>

          <button
            type="button"
            onClick={onFilterIdle}
            className="rounded-md bg-white px-3.5 py-1.5 text-xs font-medium text-[#094CB2] transition-colors hover:bg-[#F3F5F9] whitespace-nowrap cursor-pointer"
          >
            Review Idle ({idleApps.length})
          </button>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss idle alerts banner"
            className="rounded-sm p-1.5 text-[#6D5E00] transition-colors hover:bg-[#6D5E00]/10 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
