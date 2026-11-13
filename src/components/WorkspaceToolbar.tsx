import { Search, LayoutGrid, List, Download, Upload, RefreshCw } from 'lucide-react';
import { ChangeEvent, useRef } from 'react';
import {
  ALL_STAGES,
  ApplicationStage,
  SortOption,
  ViewMode,
} from '../types/application';

export type QuickFilter = 'all' | 'due-today' | 'overdue' | 'attention' | 'idle' | 'interviews';

interface WorkspaceToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  quickFilter: QuickFilter;
  onQuickFilterChange: (filter: QuickFilter) => void;
  stageFilter: ApplicationStage | 'All';
  onStageFilterChange: (stage: ApplicationStage | 'All') => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  counts: {
    all: number;
    dueToday: number;
    overdue: number;
    idle: number;
    interviews: number;
  };
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onReloadFromStorage: () => void;
}

export function WorkspaceToolbar({
  searchQuery,
  onSearchChange,
  quickFilter,
  onQuickFilterChange,
  stageFilter,
  onStageFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  counts,
  onExportJson,
  onImportJson,
  onReloadFromStorage,
}: WorkspaceToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      e.target.value = '';
    }
  };

  const filterTabs: { id: QuickFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'attention', label: 'Due & Overdue', count: counts.dueToday + counts.overdue },
    { id: 'due-today', label: 'Due Today', count: counts.dueToday },
    { id: 'overdue', label: 'Overdue', count: counts.overdue },
    { id: 'idle', label: 'Idle', count: counts.idle },
    { id: 'interviews', label: 'Interviews', count: counts.interviews },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Segmented Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter applications by urgency"
          className="flex flex-wrap items-center gap-1 rounded-md bg-[#E3E7F0] p-1"
        >
          {filterTabs.map((tab) => {
            const active = quickFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => onQuickFilterChange(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-[#141923] shadow-xs'
                    : 'text-[#4D5566] hover:text-[#141923]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-label text-[11px] tabular-nums ${
                    active ? 'text-[#094CB2]' : 'text-[#4D5566]/80'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Stage, Sort & View Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#4D5566]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search company, role, notes..."
              aria-label="Search applications"
              className="w-full rounded-md bg-white py-1.5 pl-8 pr-3 text-xs text-[#141923] placeholder:text-[#4D5566]/70 ghost-border ghost-border-focus"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => onStageFilterChange(e.target.value as ApplicationStage | 'All')}
            aria-label="Filter by pipeline stage"
            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-[#141923] ghost-border ghost-border-focus cursor-pointer"
          >
            <option value="All">All Stages</option>
            {ALL_STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Sort applications"
            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-[#141923] ghost-border ghost-border-focus cursor-pointer"
          >
            <option value="follow-up">Sort: Follow-up Urgency</option>
            <option value="recent-activity">Sort: Recent Activity</option>
            <option value="applied-newest">Sort: Applied Date</option>
            <option value="company-asc">Sort: Company A–Z</option>
          </select>

          {/* View Switcher: Cards / Ledger */}
          <div className="flex items-center rounded-md bg-[#E3E7F0] p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange('board')}
              aria-label="Cards view"
              title="Cards view"
              className={`inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-white text-[#094CB2] shadow-xs'
                  : 'text-[#4D5566] hover:text-[#141923]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('ledger')}
              aria-label="Ledger table view"
              title="Ledger table view"
              className={`inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'ledger'
                  ? 'bg-white text-[#094CB2] shadow-xs'
                  : 'text-[#4D5566] hover:text-[#141923]'
              }`}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Ledger</span>
            </button>
          </div>

          {/* localStorage Load & Export / Import Backup */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onReloadFromStorage}
              title="Load saved data from localStorage"
              className="inline-flex items-center gap-1 rounded-md bg-[#E3E7F0] px-2.5 py-1.5 text-xs font-medium text-[#094CB2] transition-colors hover:bg-[#D8DDE9] cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden xl:inline">Load Saved</span>
            </button>
            <button
              type="button"
              onClick={onExportJson}
              title="Export applications JSON"
              className="inline-flex items-center gap-1 rounded-md bg-[#E3E7F0] px-2.5 py-1.5 text-xs font-medium text-[#094CB2] transition-colors hover:bg-[#D8DDE9] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden xl:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Import applications JSON"
              className="inline-flex items-center gap-1 rounded-md bg-[#E3E7F0] px-2.5 py-1.5 text-xs font-medium text-[#094CB2] transition-colors hover:bg-[#D8DDE9] cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden xl:inline">Import</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
