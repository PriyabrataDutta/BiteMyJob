import { FormEvent, useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import {
  ALL_STAGES,
  ApplicationStage,
  JobApplication,
  WorkMode,
} from '../types/application';
import { addDaysToISO, getTodayISO } from '../utils/dateUtils';

interface ApplicationModalProps {
  isOpen: boolean;
  initialApplication: JobApplication | null;
  focusInterviewFields?: boolean;
  resumePresets?: string[];
  onAddResumePreset?: (preset: string) => void;
  onClose: () => void;
  onSave: (data: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => void;
  onDelete?: (id: string) => void;
}

const WORK_MODES: WorkMode[] = ['Remote', 'Hybrid', 'On-site'];

export function ApplicationModal({
  isOpen,
  initialApplication,
  focusInterviewFields = false,
  resumePresets = [],
  onAddResumePreset,
  onClose,
  onSave,
  onDelete,
}: ApplicationModalProps) {
  const todayISO = getTodayISO();

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [stage, setStage] = useState<ApplicationStage>('Applied');
  const [workMode, setWorkMode] = useState<WorkMode>('Hybrid');
  const [location, setLocation] = useState('');
  const [compensation, setCompensation] = useState('');
  const [source, setSource] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [appliedDate, setAppliedDate] = useState(todayISO);
  const [lastActivityDate, setLastActivityDate] = useState(todayISO);
  const [followUpDate, setFollowUpDate] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewRound, setInterviewRound] = useState('');
  const [interviewFormat, setInterviewFormat] = useState('');
  const [resumeVersion, setResumeVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setConfirmDelete(false);
    if (initialApplication) {
      setCompany(initialApplication.company);
      setRole(initialApplication.role);
      setStage(initialApplication.stage);
      setWorkMode(initialApplication.workMode);
      setLocation(initialApplication.location);
      setCompensation(initialApplication.compensation ?? '');
      setSource(initialApplication.source ?? '');
      setJobUrl(initialApplication.jobUrl ?? '');
      setContactName(initialApplication.contactName ?? '');
      setContactEmail(initialApplication.contactEmail ?? '');
      setAppliedDate(initialApplication.appliedDate);
      setLastActivityDate(initialApplication.lastActivityDate);
      setFollowUpDate(initialApplication.followUpDate ?? '');
      setInterviewDate(initialApplication.interviewDate ?? '');
      setInterviewTime(initialApplication.interviewTime ?? '');
      setInterviewRound(initialApplication.interviewRound ?? '');
      setInterviewFormat(initialApplication.interviewFormat ?? '');
      setResumeVersion(initialApplication.resumeVersion ?? '');
      setNotes(initialApplication.notes);
    } else {
      setCompany('');
      setRole('');
      setStage(focusInterviewFields ? 'Interview' : 'Applied');
      setWorkMode('Hybrid');
      setLocation('');
      setCompensation('');
      setSource('');
      setJobUrl('');
      setContactName('');
      setContactEmail('');
      setAppliedDate(todayISO);
      setLastActivityDate(todayISO);
      setFollowUpDate(addDaysToISO(todayISO, 5));
      setInterviewDate(focusInterviewFields ? addDaysToISO(todayISO, 2) : '');
      setInterviewTime(focusInterviewFields ? '10:00' : '');
      setInterviewRound(focusInterviewFields ? 'Hiring Manager Sync' : '');
      setInterviewFormat(focusInterviewFields ? 'Zoom · 45 min' : '');
      setResumeVersion('');
      setNotes('');
    }
  }, [isOpen, initialApplication, focusInterviewFields, todayISO]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;
    const trimmedResume = resumeVersion.trim();
    if (trimmedResume && onAddResumePreset && !resumePresets.includes(trimmedResume)) {
      onAddResumePreset(trimmedResume);
    }

    onSave(
      {
        company: company.trim(),
        role: role.trim(),
        stage,
        resumeVersion: trimmedResume || undefined,
        workMode,
        location: location.trim() || 'Remote',
        compensation: compensation.trim() || undefined,
        source: source.trim() || undefined,
        jobUrl: jobUrl.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        appliedDate: appliedDate || todayISO,
        lastActivityDate: lastActivityDate || appliedDate || todayISO,
        followUpDate: followUpDate || undefined,
        interviewDate: interviewDate || undefined,
        interviewTime: interviewTime || undefined,
        interviewRound: interviewRound.trim() || undefined,
        interviewFormat: interviewFormat.trim() || undefined,
        notes: notes.trim(),
      },
      initialApplication?.id
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="application-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#141923]/30 p-4 backdrop-blur-[4px]"
    >
      <div className="alexandria-modal-shadow max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-label text-xs font-semibold text-[#094CB2]">
              {initialApplication ? 'Update Ledger Entry' : 'New Ledger Entry'}
            </p>
            <h2
              id="application-modal-title"
              className="mt-1 font-serif text-2xl font-semibold text-[#141923]"
            >
              {initialApplication
                ? `${initialApplication.company} — ${initialApplication.role}`
                : 'Log Job Application'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-md p-2 text-[#4D5566] transition-colors hover:bg-[#F3F5F9] hover:text-[#141923] cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Primary Identity */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Company *
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Linear"
                className="w-full rounded-md bg-white px-3 py-2 text-sm text-[#141923] ghost-border ghost-border-focus"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Role Title *
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Staff Product Designer"
                className="w-full rounded-md bg-white px-3 py-2 text-sm text-[#141923] ghost-border ghost-border-focus"
              />
            </div>
          </div>

          {/* Pipeline & Logistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Pipeline Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as ApplicationStage)}
                className="w-full rounded-md bg-white px-3 py-2 text-sm text-[#141923] ghost-border ghost-border-focus cursor-pointer"
              >
                {ALL_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Work Mode
              </label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="w-full rounded-md bg-white px-3 py-2 text-sm text-[#141923] ghost-border ghost-border-focus cursor-pointer"
              >
                {WORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full rounded-md bg-white px-3 py-2 text-sm text-[#141923] ghost-border ghost-border-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Compensation
              </label>
              <input
                type="text"
                value={compensation}
                onChange={(e) => setCompensation(e.target.value)}
                placeholder="$190k – $225k"
                className="w-full rounded-md bg-white px-3 py-2 text-sm text-[#141923] ghost-border ghost-border-focus"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Source / Referral
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Direct Referral"
                className="w-full rounded-md bg-white px-3 py-2 text-sm text-[#141923] ghost-border ghost-border-focus"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Posting URL
              </label>
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md bg-white px-3 py-2 text-sm text-[#141923] ghost-border ghost-border-focus"
              />
            </div>
          </div>

          {/* Resume Version Tagging (Editable Input + Saved Presets) */}
          <div className="rounded-md bg-[#F3F5F9] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="resume-version-input"
                className="font-label text-xs font-semibold text-[#141923]"
              >
                Resume Version
              </label>
              <span className="text-[11px] text-[#4D5566]">
                Type any custom version or choose a saved preset
              </span>
            </div>
            <input
              id="resume-version-input"
              type="text"
              list="resume-version-presets"
              value={resumeVersion}
              onChange={(e) => setResumeVersion(e.target.value)}
              placeholder="e.g., v3-Systems-Lead"
              className="mt-2 w-full rounded-md bg-white px-3 py-2 text-sm text-[#141923] ghost-border ghost-border-focus"
            />
            <datalist id="resume-version-presets">
              {resumePresets.map((preset) => (
                <option key={preset} value={preset} />
              ))}
            </datalist>
            {resumePresets.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="font-label text-[11px] text-[#4D5566]">Saved presets:</span>
                {resumePresets.map((preset) => {
                  const selected = resumeVersion.trim() === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setResumeVersion(preset)}
                      className={`rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#094CB2] text-white'
                          : 'bg-white text-[#4D5566] hover:bg-[#E3E7F0] hover:text-[#094CB2]'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dates & Follow-up Cadence */}
          <div className="rounded-md bg-[#F3F5F9] p-4">
            <h3 className="font-label text-xs font-semibold text-[#141923]">
              Follow-Up &amp; Activity Cadence
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block font-label text-xs text-[#4D5566]">
                  Applied Date
                </label>
                <input
                  type="date"
                  value={appliedDate}
                  onChange={(e) => setAppliedDate(e.target.value)}
                  className="w-full rounded-md bg-white px-3 py-2 text-xs text-[#141923] ghost-border ghost-border-focus tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-label text-xs text-[#4D5566]">
                  Last Activity Date
                </label>
                <input
                  type="date"
                  value={lastActivityDate}
                  onChange={(e) => setLastActivityDate(e.target.value)}
                  className="w-full rounded-md bg-white px-3 py-2 text-xs text-[#141923] ghost-border ghost-border-focus tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-label text-xs font-semibold text-[#094CB2]">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full rounded-md bg-white px-3 py-2 text-xs text-[#141923] ghost-border ghost-border-focus tabular-nums"
                />
                <div className="mt-1.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFollowUpDate(todayISO)}
                    className="rounded-sm bg-white px-2 py-0.5 text-[11px] font-medium text-[#094CB2] hover:bg-[#E3E7F0] cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpDate(addDaysToISO(todayISO, 3))}
                    className="rounded-sm bg-white px-2 py-0.5 text-[11px] font-medium text-[#094CB2] hover:bg-[#E3E7F0] cursor-pointer"
                  >
                    +3d
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpDate(addDaysToISO(todayISO, 7))}
                    className="rounded-sm bg-white px-2 py-0.5 text-[11px] font-medium text-[#094CB2] hover:bg-[#E3E7F0] cursor-pointer"
                  >
                    +7d
                  </button>
                  {followUpDate && (
                    <button
                      type="button"
                      onClick={() => setFollowUpDate('')}
                      className="rounded-sm px-1.5 py-0.5 text-[11px] text-[#4D5566] hover:text-[#141923] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Interview Details */}
          <div className="rounded-md bg-[#ECEFF5] p-4">
            <h3 className="font-label text-xs font-semibold text-[#141923]">
              Interview Schedule (Populates Upcoming Interviews Strip)
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block font-label text-xs text-[#4D5566]">
                  Interview Date
                </label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full rounded-md bg-white px-3 py-2 text-xs text-[#141923] ghost-border ghost-border-focus tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-label text-xs text-[#4D5566]">
                  Time
                </label>
                <input
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full rounded-md bg-white px-3 py-2 text-xs text-[#141923] ghost-border ghost-border-focus tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-label text-xs text-[#4D5566]">
                  Round / Focus
                </label>
                <input
                  type="text"
                  value={interviewRound}
                  onChange={(e) => setInterviewRound(e.target.value)}
                  placeholder="Portfolio Deep Dive"
                  className="w-full rounded-md bg-white px-3 py-2 text-xs text-[#141923] ghost-border ghost-border-focus"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-label text-xs text-[#4D5566]">
                  Format / Duration
                </label>
                <input
                  type="text"
                  value={interviewFormat}
                  onChange={(e) => setInterviewFormat(e.target.value)}
                  placeholder="Zoom · 45 min"
                  className="w-full rounded-md bg-white px-3 py-2 text-xs text-[#141923] ghost-border ghost-border-focus"
                />
              </div>
            </div>
          </div>

          {/* Contact & Dossier Notes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Recruiter / Contact Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Claire Vance"
                className="w-full rounded-md bg-white px-3 py-2 text-sm text-[#141923] ghost-border ghost-border-focus"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="claire@company.com"
                className="w-full rounded-md bg-white px-3 py-2 text-sm text-[#141923] ghost-border ghost-border-focus"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-label text-xs font-semibold text-[#4D5566]">
              Editorial Notes &amp; Interview Prep
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key projects to highlight, follow-up talking points, or compensation details..."
              className="w-full rounded-md bg-white px-3 py-2 text-sm leading-relaxed text-[#141923] ghost-border ghost-border-focus"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            {initialApplication && onDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDelete(initialApplication.id)}
                    className="rounded-md bg-[#9F1239] px-3 py-2 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md bg-[#ECEFF5] px-3 py-2 text-xs font-medium text-[#4D5566] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9F1239] hover:underline underline-offset-4 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Delete Application</span>
                </button>
              )
            ) : (
              <span />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-[#E3E7F0] px-4 py-2 text-sm font-medium text-[#094CB2] transition-colors hover:bg-[#D8DDE9] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95 cursor-pointer"
              >
                {initialApplication ? 'Save Changes' : 'Save Application'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
