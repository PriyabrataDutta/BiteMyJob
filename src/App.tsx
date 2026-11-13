import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ApplicationCard } from './components/ApplicationCard';
import { ApplicationDrawer } from './components/ApplicationDrawer';
import { ApplicationLedger } from './components/ApplicationLedger';
import { ApplicationModal } from './components/ApplicationModal';
import { IdleAlertsBanner } from './components/IdleAlertsBanner';
import { InterviewsStrip } from './components/InterviewsStrip';
import { JobPreparationView } from './components/JobPreparationView';
import { MockInterviewView } from './components/MockInterviewView';
import { Pagination } from './components/Pagination';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { QuickFilter, WorkspaceToolbar } from './components/WorkspaceToolbar';
import {
  ApplicationPrepRecord,
  ApplicationStage,
  JobApplication,
  JobDescriptionInsights,
  MockInterviewSession,
  NavSection,
  SortOption,
  ViewMode,
} from './types/application';
import { getNextHighestStage } from './utils/analytics';
import {
  addDaysToISO,
  diffCalendarDays,
  getFollowUpUrgency,
  getTodayISO,
  isApplicationIdle,
  isUpcomingInterview,
} from './utils/dateUtils';
import {
  createDefaultPrepRecord,
  loadApplications,
  loadMockSessions,
  loadPrepRecords,
  loadResumePresets,
  loadSettings,
  normalizeApplication,
  saveApplications,
  saveMockSessions,
  savePrepRecords,
  saveResumePresets,
  saveSettings,
} from './utils/storage';

export default function App() {
  const [applications, setApplications] = useState<JobApplication[]>(() => loadApplications());
  const [settings, setSettings] = useState(() => loadSettings());
  const [prepRecords, setPrepRecords] = useState<Record<string, ApplicationPrepRecord>>(() =>
    loadPrepRecords()
  );
  const [resumePresets, setResumePresets] = useState<string[]>(() => loadResumePresets());
  const [mockSessions, setMockSessions] = useState<MockInterviewSession[]>(() =>
    loadMockSessions()
  );

  const [activeNav, setActiveNav] = useState<NavSection>('all');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [stageFilter, setStageFilter] = useState<ApplicationStage | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('follow-up');
  const [currentPage, setCurrentPage] = useState(1);
  const [idleBannerDismissed, setIdleBannerDismissed] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [scheduleInterviewMode, setScheduleInterviewMode] = useState(false);
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    saveApplications(applications);
  }, [applications]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    savePrepRecords(prepRecords);
  }, [prepRecords]);

  useEffect(() => {
    saveResumePresets(resumePresets);
  }, [resumePresets]);

  useEffect(() => {
    saveMockSessions(mockSessions);
  }, [mockSessions]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const todayISO = getTodayISO();

  const selectedDossier = useMemo(
    () => applications.find((a) => a.id === selectedDossierId) ?? null,
    [applications, selectedDossierId]
  );

  // Derived collections
  const dueTodayApps = useMemo(
    () =>
      applications.filter(
        (a) => getFollowUpUrgency(a.followUpDate, a.stage, todayISO) === 'due-today'
      ),
    [applications, todayISO]
  );

  const overdueApps = useMemo(
    () =>
      applications.filter(
        (a) => getFollowUpUrgency(a.followUpDate, a.stage, todayISO) === 'overdue'
      ),
    [applications, todayISO]
  );

  const idleApps = useMemo(
    () =>
      applications.filter((a) =>
        isApplicationIdle(a, settings.idleThresholdDays, todayISO)
      ),
    [applications, settings.idleThresholdDays, todayISO]
  );

  const upcomingInterviews = useMemo(() => {
    return applications
      .filter((a) => isUpcomingInterview(a, todayISO))
      .sort((a, b) => {
        const dateA = `${a.interviewDate ?? ''} ${a.interviewTime ?? '23:59'}`;
        const dateB = `${b.interviewDate ?? ''} ${b.interviewTime ?? '23:59'}`;
        return dateA.localeCompare(dateB);
      });
  }, [applications, todayISO]);

  // Synchronize top navigation tabs with workspace filter
  const handleSelectNav = (nav: NavSection) => {
    setActiveNav(nav);
    setCurrentPage(1);
    if (nav === 'all') setQuickFilter('all');
    if (nav === 'follow-ups') setQuickFilter('attention');
    if (nav === 'idle') setQuickFilter('idle');
    if (nav === 'interviews') setQuickFilter('interviews');
  };

  const handleQuickFilterChange = (filter: QuickFilter) => {
    setQuickFilter(filter);
    setCurrentPage(1);
    if (filter === 'all') setActiveNav('all');
    else if (filter === 'attention' || filter === 'due-today' || filter === 'overdue')
      setActiveNav('follow-ups');
    else if (filter === 'idle') setActiveNav('idle');
    else if (filter === 'interviews') setActiveNav('interviews');
  };

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matches = applications.filter((app) => {
      if (stageFilter !== 'All' && app.stage !== stageFilter) return false;

      if (quickFilter === 'due-today') {
        if (getFollowUpUrgency(app.followUpDate, app.stage, todayISO) !== 'due-today') {
          return false;
        }
      } else if (quickFilter === 'overdue') {
        if (getFollowUpUrgency(app.followUpDate, app.stage, todayISO) !== 'overdue') {
          return false;
        }
      } else if (quickFilter === 'attention') {
        const u = getFollowUpUrgency(app.followUpDate, app.stage, todayISO);
        if (u !== 'due-today' && u !== 'overdue') return false;
      } else if (quickFilter === 'idle') {
        if (!isApplicationIdle(app, settings.idleThresholdDays, todayISO)) return false;
      } else if (quickFilter === 'interviews') {
        if (!isUpcomingInterview(app, todayISO)) return false;
      }

      if (!query) return true;
      return (
        app.company.toLowerCase().includes(query) ||
        app.role.toLowerCase().includes(query) ||
        app.location.toLowerCase().includes(query) ||
        app.notes.toLowerCase().includes(query) ||
        (app.source ?? '').toLowerCase().includes(query)
      );
    });

    return [...matches].sort((a, b) => {
      if (sortBy === 'follow-up') {
        const rank = (app: JobApplication) => {
          const u = getFollowUpUrgency(app.followUpDate, app.stage, todayISO);
          if (u === 'overdue') return 0;
          if (u === 'due-today') return 1;
          if (u === 'upcoming') return 2;
          return 3;
        };
        const rDiff = rank(a) - rank(b);
        if (rDiff !== 0) return rDiff;
        if (a.followUpDate && b.followUpDate) {
          return diffCalendarDays(a.followUpDate, b.followUpDate);
        }
        return b.lastActivityDate.localeCompare(a.lastActivityDate);
      }

      if (sortBy === 'recent-activity') {
        return b.lastActivityDate.localeCompare(a.lastActivityDate);
      }

      if (sortBy === 'applied-newest') {
        return b.appliedDate.localeCompare(a.appliedDate);
      }

      return a.company.localeCompare(b.company);
    });
  }, [
    applications,
    stageFilter,
    quickFilter,
    searchQuery,
    sortBy,
    todayISO,
    settings.idleThresholdDays,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / settings.pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedApplications = useMemo(() => {
    const start = (safePage - 1) * settings.pageSize;
    return filteredApplications.slice(start, start + settings.pageSize);
  }, [filteredApplications, safePage, settings.pageSize]);

  // Handlers
  const openNewApplicationModal = (forInterview = false) => {
    setEditingApp(null);
    setScheduleInterviewMode(forInterview);
    setModalOpen(true);
  };

  const openEditModal = (app: JobApplication) => {
    setEditingApp(app);
    setScheduleInterviewMode(false);
    setModalOpen(true);
  };

  const handleSaveApplication = (
    data: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    const nowIso = new Date().toISOString();
    if (existingId) {
      setApplications((prev) =>
        prev.map((item) =>
          item.id === existingId
            ? {
                ...item,
                ...data,
                highestStageReached: getNextHighestStage(
                  item.highestStageReached ?? item.stage,
                  data.stage
                ),
                updatedAt: nowIso,
              }
            : item
        )
      );
      setToastMessage(`Updated ${data.company} — ${data.role}`);
    } else {
      const created: JobApplication = {
        ...data,
        highestStageReached: getNextHighestStage(undefined, data.stage),
        id: `bmj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setApplications((prev) => [created, ...prev]);
      setToastMessage(`Logged ${data.company} to ledger`);
    }
    setModalOpen(false);
    setEditingApp(null);
  };

  const handleDeleteApplication = (id: string) => {
    setApplications((prev) => prev.filter((item) => item.id !== id));
    if (selectedDossierId === id) setSelectedDossierId(null);
    setModalOpen(false);
    setEditingApp(null);
    setToastMessage('Application removed from ledger');
  };

  const handleUpdateFollowUp = (id: string, nextDate: string | undefined) => {
    const nowIso = new Date().toISOString();
    setApplications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, followUpDate: nextDate, updatedAt: nowIso } : item
      )
    );
  };

  const handleMarkFollowedUp = (id: string) => {
    const nowIso = new Date().toISOString();
    const nextSuggestedFollowUp = addDaysToISO(todayISO, 5);
    setApplications((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              lastActivityDate: todayISO,
              followUpDate: nextSuggestedFollowUp,
              updatedAt: nowIso,
            }
          : item
      )
    );
    setToastMessage('Check-in logged · Next follow-up set for +5 days');
  };

  const handleStageChange = (id: string, nextStage: ApplicationStage) => {
    const nowIso = new Date().toISOString();
    setApplications((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              stage: nextStage,
              highestStageReached: getNextHighestStage(
                item.highestStageReached ?? item.stage,
                nextStage
              ),
              lastActivityDate: todayISO,
              updatedAt: nowIso,
            }
          : item
      )
    );
  };

  const handleSaveJdInsights = (
    id: string,
    jobDescription: string,
    aiInsights?: JobDescriptionInsights
  ) => {
    const nowIso = new Date().toISOString();
    setApplications((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              jobDescription,
              aiInsights: aiInsights ?? item.aiInsights,
              updatedAt: nowIso,
            }
          : item
      )
    );
    if (aiInsights) {
      setToastMessage('Extracted key skills, 3 interview questions, and follow-up draft');
    }
  };

  const handleUpdatePrepRecord = (
    appId: string,
    updater: (current: ApplicationPrepRecord) => ApplicationPrepRecord
  ) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;
    setPrepRecords((prev) => {
      const base = prev[appId] ?? createDefaultPrepRecord(targetApp);
      return {
        ...prev,
        [appId]: updater(base),
      };
    });
  };

  const handleMarkQuestionRehearsed = (appId: string, questionId: string) => {
    handleUpdatePrepRecord(appId, (record) => ({
      ...record,
      practiceQuestions: record.practiceQuestions.map((q) =>
        q.id === questionId ? { ...q, rehearsed: true } : q
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddResumePreset = (preset: string) => {
    const cleaned = preset.trim();
    if (!cleaned) return;
    setResumePresets((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
    setToastMessage(`Saved resume preset "${cleaned}"`);
  };

  const handleRemoveResumePreset = (preset: string) => {
    setResumePresets((prev) => prev.filter((item) => item !== preset));
  };

  const handleSaveMockSession = (session: MockInterviewSession) => {
    setMockSessions((prev) => [session, ...prev]);
    setToastMessage(
      `Saved mock session (${session.overallAverage.toFixed(1)}/5) for ${session.company}`
    );
  };

  const handleDeleteMockSession = (sessionId: string) => {
    setMockSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const handleReloadFromStorage = () => {
    const loadedApps = loadApplications();
    const loadedSettings = loadSettings();
    const loadedPrep = loadPrepRecords();
    const loadedPresets = loadResumePresets();
    const loadedMockSessions = loadMockSessions();
    setApplications(loadedApps);
    setSettings(loadedSettings);
    setPrepRecords(loadedPrep);
    setResumePresets(loadedPresets);
    setMockSessions(loadedMockSessions);
    setCurrentPage(1);
    setToastMessage(`Loaded ${loadedApps.length} applications from localStorage`);
  };

  const handleExportJson = () => {
    const payload = JSON.stringify(applications, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bitemyjob-ledger-${todayISO}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToastMessage('Exported career ledger JSON');
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const rawList = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.applications)
            ? parsed.applications
            : null;
        if (!rawList) {
          setToastMessage('Invalid JSON format: expected an array of applications');
          return;
        }
        const normalized = rawList.map((entry: unknown, idx: number) =>
          normalizeApplication((entry ?? {}) as Record<string, unknown>, idx)
        );
        setApplications((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const merged = [...prev];
          for (const item of normalized) {
            if (existingIds.has(item.id)) {
              const idx = merged.findIndex((x) => x.id === item.id);
              merged[idx] = item;
            } else {
              merged.push(item);
            }
          }
          return merged;
        });
        setToastMessage(`Imported ${normalized.length} applications`);
      } catch {
        setToastMessage('Could not parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  const activeCount = applications.filter(
    (a) => a.stage !== 'Rejected' && a.stage !== 'Withdrawn'
  ).length;

  const isStudioTab = activeNav === 'prep' || activeNav === 'mock' || activeNav === 'analytics';

  return (
    <div id="top" className="min-h-screen bg-[#F3F5F9] text-[#141923] flex">
      <Sidebar
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        counts={{
          all: applications.length,
          followUps: dueTodayApps.length + overdueApps.length,
          idle: idleApps.length,
          interviews: upcomingInterviews.length,
          mockSessions: mockSessions.length,
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeNav={activeNav}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onNewApplication={() => openNewApplicationModal(false)}
        />

        {/* Editorial Overview Header Surface (Ledger Views) */}
        {!isStudioTab && (
          <section className="bg-white pb-8 pt-7">
            <div className="mx-auto max-w-[1360px] px-6 lg:px-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="font-label text-xs font-semibold text-[#094CB2]">
                    Career Ledger · Active Search
                  </p>
                  <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#141923] sm:text-4xl [text-wrap:balance]">
                    Curated Application Dossier &amp; Follow-Up Cadence
                  </h1>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#4D5566]">
                    Track every active candidacy, keep follow-up commitments visible, catch silent
                    pipelines early, and walk into interviews prepared.
                  </p>
                </div>

                {/* Quiet Tonal Metric Row */}
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-md bg-[#F3F5F9] px-4 py-3">
                    <dt className="font-label text-[11px] font-medium text-[#4D5566]">
                      Active Roles
                    </dt>
                    <dd className="mt-1 font-serif text-2xl font-semibold text-[#141923] tabular-nums">
                      {activeCount}
                    </dd>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickFilterChange('due-today')}
                    className="rounded-md bg-[#FBF6DC] px-4 py-3 text-left transition-colors hover:bg-[#F7EEBE] cursor-pointer"
                  >
                    <dt className="font-label text-[11px] font-medium text-[#6D5E00]">Due Today</dt>
                    <dd className="mt-1 font-serif text-2xl font-semibold text-[#6D5E00] tabular-nums">
                      {dueTodayApps.length}
                    </dd>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFilterChange('overdue')}
                    className="rounded-md bg-[#FDF1F2] px-4 py-3 text-left transition-colors hover:bg-[#FBE2E5] cursor-pointer"
                  >
                    <dt className="font-label text-[11px] font-medium text-[#9F1239]">Overdue</dt>
                    <dd className="mt-1 font-serif text-2xl font-semibold text-[#9F1239] tabular-nums">
                      {overdueApps.length}
                    </dd>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFilterChange('idle')}
                    className="rounded-md bg-[#ECEFF5] px-4 py-3 text-left transition-colors hover:bg-[#E3E7F0] cursor-pointer"
                  >
                    <dt className="font-label text-[11px] font-medium text-[#4D5566]">
                      Idle ({settings.idleThresholdDays}d+)
                    </dt>
                    <dd className="mt-1 font-serif text-2xl font-semibold text-[#141923] tabular-nums">
                      {idleApps.length}
                    </dd>
                  </button>
                </dl>
              </div>

              {/* Upcoming Interviews Summary Strip */}
              <div className="mt-7">
                <InterviewsStrip
                  interviews={upcomingInterviews}
                  onSelectApplication={(app) => setSelectedDossierId(app.id)}
                  onScheduleInterview={() => openNewApplicationModal(true)}
                  onViewAllInterviews={() => handleQuickFilterChange('interviews')}
                  onExportIcsNotice={setToastMessage}
                />
              </div>
            </div>
          </section>
        )}

        {/* Main Workspace Canvas */}
        <main className="mx-auto w-full max-w-[1360px] space-y-6 px-6 py-8 lg:px-10">
          {activeNav === 'prep' ? (
            <JobPreparationView
              applications={applications}
              prepRecords={prepRecords}
              onUpdatePrepRecord={handleUpdatePrepRecord}
              onSaveJdInsights={handleSaveJdInsights}
              onOpenNewApplication={() => openNewApplicationModal(false)}
            />
          ) : activeNav === 'mock' ? (
            <MockInterviewView
              applications={applications}
              prepRecords={prepRecords}
              mockSessions={mockSessions}
              onSaveMockSession={handleSaveMockSession}
              onDeleteMockSession={handleDeleteMockSession}
              onMarkQuestionRehearsed={handleMarkQuestionRehearsed}
              onOpenNewApplication={() => openNewApplicationModal(false)}
            />
          ) : activeNav === 'analytics' ? (
            <AnalyticsDashboard
              applications={applications}
              mockSessions={mockSessions}
              resumePresets={resumePresets}
              onAddResumePreset={handleAddResumePreset}
              onRemoveResumePreset={handleRemoveResumePreset}
              onBackToLedger={() => handleSelectNav('all')}
              onOpenApplication={(app) => openEditModal(app)}
            />
          ) : (
            <>
            {/* Idle Applications Alert Banner */}
            {!idleBannerDismissed && idleApps.length > 0 && (
              <IdleAlertsBanner
                idleApps={idleApps}
                idleThresholdDays={settings.idleThresholdDays}
                onChangeThreshold={(days) =>
                  setSettings((prev) => ({ ...prev, idleThresholdDays: days }))
                }
                onFilterIdle={() => handleQuickFilterChange('idle')}
                onQuickCheckIn={handleMarkFollowedUp}
                onSelectApplication={(app) => setSelectedDossierId(app.id)}
                onDismiss={() => setIdleBannerDismissed(true)}
              />
            )}

            {/* Workspace Toolbar */}
            <WorkspaceToolbar
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                setCurrentPage(1);
              }}
              quickFilter={quickFilter}
              onQuickFilterChange={handleQuickFilterChange}
              stageFilter={stageFilter}
              onStageFilterChange={(st) => {
                setStageFilter(st);
                setCurrentPage(1);
              }}
              sortBy={sortBy}
              onSortChange={(s) => {
                setSortBy(s);
                setCurrentPage(1);
              }}
              viewMode={settings.viewMode}
              onViewModeChange={(viewMode: ViewMode) =>
                setSettings((prev) => ({ ...prev, viewMode }))
              }
              counts={{
                all: applications.length,
                dueToday: dueTodayApps.length,
                overdue: overdueApps.length,
                idle: idleApps.length,
                interviews: upcomingInterviews.length,
              }}
              onExportJson={handleExportJson}
              onImportJson={handleImportJson}
              onReloadFromStorage={handleReloadFromStorage}
            />

            {/* Application Grid or Ledger */}
            {filteredApplications.length === 0 ? (
              <div className="rounded-lg bg-white px-6 py-14 text-center">
                <h2 className="font-serif text-xl font-semibold text-[#141923]">
                  No applications match this view
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#4D5566]">
                  Clear your active filters or log a new job application to start tracking follow-up
                  dates and interview schedules.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  {(quickFilter !== 'all' || stageFilter !== 'All' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickFilter('all');
                        setStageFilter('All');
                        setSearchQuery('');
                        setActiveNav('all');
                        setCurrentPage(1);
                      }}
                      className="rounded-md bg-[#E3E7F0] px-4 py-2 text-sm font-medium text-[#094CB2] hover:bg-[#D8DDE9] cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openNewApplicationModal(false)}
                    className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-4 py-2 text-sm font-medium text-white hover:opacity-95 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Log Application</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {settings.viewMode === 'board' ? (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {paginatedApplications.map((app) => (
                      <ApplicationCard
                        key={app.id}
                        application={app}
                        idleThresholdDays={settings.idleThresholdDays}
                        onOpenDossier={(selected) => setSelectedDossierId(selected.id)}
                        onEdit={openEditModal}
                        onUpdateFollowUp={handleUpdateFollowUp}
                        onMarkFollowedUp={handleMarkFollowedUp}
                        onStageChange={handleStageChange}
                        onSaveJdInsights={handleSaveJdInsights}
                      />
                    ))}
                  </div>
                ) : (
                  <ApplicationLedger
                    applications={paginatedApplications}
                    idleThresholdDays={settings.idleThresholdDays}
                    onOpenDossier={(selected) => setSelectedDossierId(selected.id)}
                    onEdit={openEditModal}
                    onUpdateFollowUp={handleUpdateFollowUp}
                    onMarkFollowedUp={handleMarkFollowedUp}
                    onStageChange={handleStageChange}
                  />
                )}

                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  totalItems={filteredApplications.length}
                  pageSize={settings.pageSize}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onPageSizeChange={(pageSize) => {
                    setSettings((prev) => ({ ...prev, pageSize }));
                    setCurrentPage(1);
                  }}
                />
              </>
            )}
          </>
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <ApplicationModal
        isOpen={modalOpen}
        initialApplication={editingApp}
        focusInterviewFields={scheduleInterviewMode}
        resumePresets={resumePresets}
        onAddResumePreset={handleAddResumePreset}
        onClose={() => {
          setModalOpen(false);
          setEditingApp(null);
        }}
        onSave={handleSaveApplication}
        onDelete={handleDeleteApplication}
      />

      <ApplicationDrawer
        application={selectedDossier}
        idleThresholdDays={settings.idleThresholdDays}
        onClose={() => setSelectedDossierId(null)}
        onEdit={(app) => {
          setSelectedDossierId(null);
          openEditModal(app);
        }}
        onUpdateFollowUp={handleUpdateFollowUp}
        onMarkFollowedUp={handleMarkFollowedUp}
        onStageChange={handleStageChange}
        onSaveJdInsights={handleSaveJdInsights}
        onExportIcsNotice={setToastMessage}
      />

      {/* Quiet Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 rounded-md bg-[#141923] px-4 py-2.5 text-xs font-medium text-white shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
