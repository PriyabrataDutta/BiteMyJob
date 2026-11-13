import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ApplicationCard } from '../components/ApplicationCard';
import { ApplicationModal } from '../components/ApplicationModal';
import { InterviewsStrip } from '../components/InterviewsStrip';
import { Pagination } from '../components/Pagination';
import { JobApplication } from '../types/application';
import { addDaysToISO, getTodayISO } from '../utils/dateUtils';
import { MOCK_SESSIONS_STORAGE_KEY, RESUME_PRESETS_STORAGE_KEY } from '../utils/storage';

describe('Component & Integration Tests: New and Existing BiteMyJob Features', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('navigates across all tabs via Sidebar (All Applications, Job Preparation, Mock Interview, Analytics)', () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /workspace navigation/i });
    expect(within(nav).getByRole('button', { name: /all applications/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /follow-ups/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /idle watch/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /interviews/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /job preparation/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /mock interview/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /analytics/i })).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: /job preparation/i }));
    expect(screen.getByText(/Job Preparation Studio/i)).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: /mock interview/i }));
    expect(screen.getByText(/Live Mock-Interview Simulator/i)).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: /analytics/i }));
    expect(screen.getByText(/Stage Pass Rates & Resume Version Performance/i)).toBeInTheDocument();
  });

  it('runs a timed Mock Interview session, scores the 4-dimension rubric, and saves to localStorage', () => {
    vi.useFakeTimers();
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /workspace navigation/i });
    fireEvent.click(within(nav).getByRole('button', { name: /mock interview/i }));

    // Select 60s timer limit
    fireEvent.click(screen.getByRole('button', { name: '60s' }));
    expect(screen.getByText('01:00')).toBeInTheDocument();

    // Start countdown and advance 5 seconds
    fireEvent.click(screen.getByRole('button', { name: /start timer/i }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('00:55')).toBeInTheDocument();

    // Pause and rate on 4 rubric dimensions
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'Clarity 5 of 5' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Relevance 5 of 5' }));
    fireEvent.click(screen.getByRole('radio', { name: 'STAR Structure 4 of 5' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Confidence 4 of 5' }));
    expect(screen.getByText('4.5 / 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save mock session/i }));

    const stored = JSON.parse(window.localStorage.getItem(MOCK_SESSIONS_STORAGE_KEY) || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].overallAverage).toBe(4.5);
    expect(screen.getByText('1 session logged')).toBeInTheDocument();
  });

  it('renders Analytics Dashboard pass rates and allows adding a saved resume preset', () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /workspace navigation/i });
    fireEvent.click(within(nav).getByRole('button', { name: /analytics/i }));

    expect(screen.getByText(/Stage-to-Stage Pass Rates/i)).toBeInTheDocument();
    expect(screen.getByText(/Pass Rates by Resume Edition/i)).toBeInTheDocument();
    expect(screen.getAllByText('v3-Systems-Lead').length).toBeGreaterThanOrEqual(2);

    const input = screen.getByLabelText(/new resume preset name/i);
    fireEvent.change(input, { target: { value: 'v4-AI-Platform' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    expect(screen.getByText('v4-AI-Platform')).toBeInTheDocument();
    const savedPresets = JSON.parse(window.localStorage.getItem(RESUME_PRESETS_STORAGE_KEY) || '[]');
    expect(savedPresets).toContain('v4-AI-Platform');
  });

  it('triggers single and batch .ics calendar exports from InterviewsStrip', () => {
    const createObjectURLMock = vi.fn(() => 'blob:mock-ics');
    const revokeObjectURLMock = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURLMock, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURLMock, writable: true });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const noticeSpy = vi.fn();
    const today = getTodayISO();

    const interviews: JobApplication[] = [
      {
        id: 'i1',
        company: 'Linear',
        role: 'Staff Designer',
        stage: 'Interview',
        location: 'Remote',
        workMode: 'Remote',
        appliedDate: today,
        lastActivityDate: today,
        interviewDate: addDaysToISO(today, 1),
        interviewTime: '10:30',
        interviewRound: 'Portfolio Deep Dive',
        interviewFormat: 'Zoom · 60 min',
        notes: '',
        createdAt: today,
        updatedAt: today,
      },
    ];

    render(
      <InterviewsStrip
        interviews={interviews}
        onSelectApplication={vi.fn()}
        onScheduleInterview={vi.fn()}
        onViewAllInterviews={vi.fn()}
        onExportIcsNotice={noticeSpy}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^\.ics$/i }));
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(noticeSpy).toHaveBeenCalledWith('Exported calendar invite for Linear');

    fireEvent.click(screen.getByRole('button', { name: /export all \(\.ics\)/i }));
    expect(createObjectURLMock).toHaveBeenCalledTimes(2);
    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(noticeSpy).toHaveBeenCalledWith('Exported 1 upcoming interviews (.ics)');
  });

  it('supports editable resume version input and preset selection in ApplicationModal', () => {
    const onSave = vi.fn();
    const onAddPreset = vi.fn();

    render(
      <ApplicationModal
        isOpen={true}
        initialApplication={null}
        resumePresets={['v3-Systems-Lead', 'v2-Product-Design']}
        onAddResumePreset={onAddPreset}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('e.g., Linear'), { target: { value: 'Vercel' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., Staff Product Designer'), {
      target: { value: 'Staff DX Engineer' },
    });

    // Click saved preset chip, then customize via editable input
    fireEvent.click(screen.getByRole('button', { name: 'v3-Systems-Lead' }));
    const resumeInput = screen.getByLabelText(/resume version/i) as HTMLInputElement;
    expect(resumeInput.value).toBe('v3-Systems-Lead');

    fireEvent.change(resumeInput, { target: { value: 'v4-DX-Tailored' } });
    fireEvent.click(screen.getByRole('button', { name: /save application/i }));

    expect(onAddPreset).toHaveBeenCalledWith('v4-DX-Tailored');
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        company: 'Vercel',
        role: 'Staff DX Engineer',
        resumeVersion: 'v4-DX-Tailored',
      }),
      undefined
    );
  });

  it('persists Job Preparation checklist progress to localStorage (existing feature)', () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /workspace navigation/i });
    fireEvent.click(within(nav).getByRole('button', { name: /job preparation/i }));

    const firstTaskButton = screen.getByRole('button', {
      name: /Map 3 concrete STAR stories to core role competencies/i,
    });
    fireEvent.click(firstTaskButton);

    expect(screen.getByText(/20% · 1\/5 tasks/i)).toBeInTheDocument();
    const prepRaw = window.localStorage.getItem('bitemyjob_prep_v1');
    expect(prepRaw).toContain('"completed":true');
  });

  it('renders existing ApplicationCard badges (Due Today, Overdue, Idle) and Pagination controls', () => {
    const today = getTodayISO();
    const overdueApp: JobApplication = {
      id: 'card-1',
      company: 'Anthropic',
      role: 'Product Engineer',
      stage: 'Applied',
      resumeVersion: 'v3-Frontend-Core',
      location: 'San Francisco, CA',
      workMode: 'Hybrid',
      appliedDate: addDaysToISO(today, -12),
      lastActivityDate: addDaysToISO(today, -10),
      followUpDate: addDaysToISO(today, -2),
      notes: 'Notes',
      createdAt: today,
      updatedAt: today,
    };

    const onMarkFollowedUp = vi.fn();
    const onUpdateFollowUp = vi.fn();

    render(
      <ApplicationCard
        application={overdueApp}
        idleThresholdDays={7}
        onOpenDossier={vi.fn()}
        onEdit={vi.fn()}
        onUpdateFollowUp={onUpdateFollowUp}
        onMarkFollowedUp={onMarkFollowedUp}
        onStageChange={vi.fn()}
        onSaveJdInsights={vi.fn()}
      />
    );

    expect(screen.getByText(/Overdue · 2 days/i)).toBeInTheDocument();
    expect(screen.getByText(/Idle · 10d inactive/i)).toBeInTheDocument();
    expect(screen.getByText('v3-Frontend-Core')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /followed up/i }));
    expect(onMarkFollowedUp).toHaveBeenCalledWith('card-1');

    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        totalItems={15}
        pageSize={6}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />
    );

    expect(screen.getByText('1–6')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
