import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { JobApplication, MockInterviewSession } from '../types/application';
import {
  computePipelineConversion,
  computeResumeVersionMetrics,
} from '../utils/analytics';

interface AnalyticsDashboardProps {
  applications: JobApplication[];
  mockSessions: MockInterviewSession[];
  resumePresets: string[];
  onAddResumePreset: (preset: string) => void;
  onRemoveResumePreset: (preset: string) => void;
  onBackToLedger: () => void;
  onOpenApplication: (app: JobApplication) => void;
}

export function AnalyticsDashboard({
  applications,
  mockSessions,
  resumePresets,
  onAddResumePreset,
  onRemoveResumePreset,
  onBackToLedger,
  onOpenApplication,
}: AnalyticsDashboardProps) {
  const [newPreset, setNewPreset] = useState('');

  const conversion = useMemo(() => computePipelineConversion(applications), [applications]);
  const resumeMetrics = useMemo(() => computeResumeVersionMetrics(applications), [applications]);

  const mockAverage = useMemo(() => {
    if (mockSessions.length === 0) return null;
    const sum = mockSessions.reduce((acc, s) => acc + s.overallAverage, 0);
    return Math.round((sum / mockSessions.length) * 10) / 10;
  }, [mockSessions]);

  const untaggedApps = useMemo(
    () => applications.filter((a) => !a.resumeVersion?.trim()),
    [applications]
  );

  const handleAddPresetSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = newPreset.trim();
    if (!cleaned) return;
    onAddResumePreset(cleaned);
    setNewPreset('');
  };

  return (
    <section aria-label="Pipeline conversion analytics" className="space-y-6">
      {/* Header Surface */}
      <div className="rounded-lg bg-white p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-label text-xs font-semibold text-[#094CB2]">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              <span>Pipeline Conversion &amp; Resume Telemetry</span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-[#141923] sm:text-3xl">
              Stage Pass Rates &amp; Resume Version Performance
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#4D5566]">
              Evaluate how effectively candidacies advance from initial submission through
              screening, interviews, and offers—and compare response rates across tailored resume
              editions.
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToLedger}
            className="inline-flex items-center gap-1.5 self-start rounded-md bg-[#E3E7F0] px-4 py-2 text-xs font-medium text-[#094CB2] hover:bg-[#D8DDE9] whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Ledger</span>
          </button>
        </div>

        {/* Top KPI Row */}
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-md bg-[#F3F5F9] px-4 py-3.5">
            <dt className="font-label text-[11px] font-medium text-[#4D5566]">Total Tracked</dt>
            <dd className="mt-1 font-serif text-2xl font-semibold text-[#141923] tabular-nums">
              {conversion.totalApplications}
            </dd>
          </div>

          <div className="rounded-md bg-[#E9F0FC] px-4 py-3.5">
            <dt className="font-label text-[11px] font-medium text-[#094CB2]">
              Applied → Screening
            </dt>
            <dd className="mt-1 font-serif text-2xl font-semibold text-[#094CB2] tabular-nums">
              {conversion.appliedToScreeningPct}%
            </dd>
          </div>

          <div className="rounded-md bg-[#E6F4EE] px-4 py-3.5">
            <dt className="font-label text-[11px] font-medium text-[#116341]">
              Applied → Interview
            </dt>
            <dd className="mt-1 font-serif text-2xl font-semibold text-[#116341] tabular-nums">
              {conversion.appliedToInterviewPct}%
            </dd>
          </div>

          <div className="rounded-md bg-[#FBF6DC] px-4 py-3.5">
            <dt className="font-label text-[11px] font-medium text-[#6D5E00]">
              Interview → Offer
            </dt>
            <dd className="mt-1 font-serif text-2xl font-semibold text-[#6D5E00] tabular-nums">
              {conversion.interviewToOfferPct}%
            </dd>
          </div>

          <div className="rounded-md bg-[#ECEFF5] px-4 py-3.5">
            <dt className="font-label text-[11px] font-medium text-[#4D5566]">Mock Avg Score</dt>
            <dd className="mt-1 font-serif text-2xl font-semibold text-[#141923] tabular-nums">
              {mockAverage !== null ? `${mockAverage.toFixed(1)}/5` : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Funnel & Stage Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-lg bg-white p-6 lg:col-span-7">
          <h3 className="font-serif text-lg font-semibold text-[#141923]">
            Stage-to-Stage Pass Rates
          </h3>
          <p className="mt-1 text-xs text-[#4D5566]">
            Based on the highest stage each submitted candidacy has reached.
          </p>

          <div className="mt-5 space-y-4">
            {conversion.funnelSteps.map((step) => (
              <div key={step.label} className="rounded-md bg-[#F8FAFC] p-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-label text-xs font-semibold text-[#141923]">
                    {step.label}
                  </span>
                  <span className="font-label text-xs font-semibold text-[#094CB2] tabular-nums">
                    {step.passRatePct}% ({step.reachedCount} of {step.baseCount})
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#ECEFF5]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#094CB2] to-[#1D63D0] transition-all duration-200"
                    style={{ width: `${Math.min(100, step.passRatePct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 lg:col-span-5">
          <h3 className="font-serif text-lg font-semibold text-[#141923]">
            Current Stage Distribution
          </h3>
          <p className="mt-1 text-xs text-[#4D5566]">
            Live breakdown across all {conversion.totalApplications} tracked roles.
          </p>

          <ul className="mt-4 space-y-2.5">
            {conversion.stageCounts.map((item) => (
              <li
                key={item.stage}
                className="flex items-center justify-between gap-3 rounded-sm bg-[#F8FAFC] px-3.5 py-2.5 text-xs"
              >
                <span className="font-medium text-[#141923]">{item.stage}</span>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="text-[#4D5566]">{item.sharePct}%</span>
                  <span className="min-w-[24px] rounded-sm bg-[#E3E7F0] px-2 py-0.5 text-center font-label font-semibold text-[#094CB2]">
                    {item.count}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Resume Version Performance Table + Saved Presets Manager */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-lg bg-white p-6 lg:col-span-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 font-label text-xs font-semibold text-[#094CB2]">
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Resume Version Comparison</span>
              </div>
              <h3 className="mt-1 font-serif text-lg font-semibold text-[#141923]">
                Pass Rates by Resume Edition
              </h3>
            </div>
            {untaggedApps.length > 0 && (
              <span className="rounded-sm bg-[#FBF6DC] px-2.5 py-1 font-label text-[11px] font-semibold text-[#6D5E00] tabular-nums">
                {untaggedApps.length} untagged {untaggedApps.length === 1 ? 'role' : 'roles'}
              </span>
            )}
          </div>

          {resumeMetrics.length === 0 ? (
            <div className="mt-4 rounded-md bg-[#F3F5F9] px-5 py-6 text-center text-xs text-[#4D5566]">
              No applications logged yet. Add roles and tag a resume version to compare conversion
              performance.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#F3F5F9] font-label text-[11px] font-semibold text-[#4D5566]">
                    <th className="rounded-l-sm px-3.5 py-2.5">Resume Version</th>
                    <th className="px-3.5 py-2.5">Apps</th>
                    <th className="px-3.5 py-2.5">Screening %</th>
                    <th className="px-3.5 py-2.5">Interview %</th>
                    <th className="rounded-r-sm px-3.5 py-2.5">Offer %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEFF5]">
                  {resumeMetrics.map((row) => (
                    <tr key={row.version} className="hover:bg-[#FAFBFD]">
                      <td className="px-3.5 py-3 font-medium text-[#141923]">
                        <span
                          className={
                            row.isUntagged ? 'italic text-[#4D5566]' : 'font-semibold text-[#141923]'
                          }
                        >
                          {row.version}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-[#4D5566] tabular-nums">
                        {row.totalCount}
                      </td>
                      <td className="px-3.5 py-3 tabular-nums">
                        <span className="font-semibold text-[#141923]">
                          {row.screeningPassPct}%
                        </span>{' '}
                        <span className="text-[#4D5566]">
                          ({row.screeningReached}/{row.appliedReached})
                        </span>
                      </td>
                      <td className="px-3.5 py-3 tabular-nums">
                        <span className="inline-flex rounded-sm bg-[#E9F0FC] px-2 py-0.5 font-label font-semibold text-[#094CB2]">
                          {row.interviewPassPct}%
                        </span>{' '}
                        <span className="text-[#4D5566]">
                          ({row.interviewReached}/{row.appliedReached})
                        </span>
                      </td>
                      <td className="px-3.5 py-3 tabular-nums">
                        <span className="font-semibold text-[#6D5E00]">{row.offerPassPct}%</span>{' '}
                        <span className="text-[#4D5566]">
                          ({row.offerReached}/{row.appliedReached})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {untaggedApps.length > 0 && (
            <div className="mt-4 rounded-md bg-[#F3F5F9] p-3.5">
              <p className="font-label text-[11px] font-semibold text-[#4D5566]">
                Quick-tag untagged roles:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {untaggedApps.slice(0, 5).map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => onOpenApplication(app)}
                    className="rounded-sm bg-white px-2.5 py-1 text-xs font-medium text-[#094CB2] hover:bg-[#E3E7F0] cursor-pointer"
                  >
                    {app.company} — {app.role}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Saved Resume Presets Manager */}
        <div className="rounded-lg bg-white p-6 lg:col-span-4">
          <h3 className="font-serif text-lg font-semibold text-[#141923]">
            Saved Resume Presets
          </h3>
          <p className="mt-1 text-xs text-[#4D5566]">
            Maintain reusable resume version tags for quick selection when logging applications.
          </p>

          <form onSubmit={handleAddPresetSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              value={newPreset}
              onChange={(e) => setNewPreset(e.target.value)}
              placeholder="e.g., v4-AI-Systems"
              aria-label="New resume preset name"
              className="flex-1 rounded-sm bg-white px-3 py-1.5 text-xs text-[#141923] ghost-border ghost-border-focus"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-sm bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-3 py-1.5 text-xs font-medium text-white hover:opacity-95 whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add</span>
            </button>
          </form>

          <ul className="mt-4 space-y-2">
            {resumePresets.map((preset) => (
              <li
                key={preset}
                className="flex items-center justify-between gap-2 rounded-sm bg-[#F8FAFC] px-3 py-2 text-xs"
              >
                <span className="font-medium text-[#141923] truncate">{preset}</span>
                <button
                  type="button"
                  onClick={() => onRemoveResumePreset(preset)}
                  aria-label={`Remove preset ${preset}`}
                  className="rounded-sm p-1 text-[#4D5566] hover:text-[#9F1239] cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
