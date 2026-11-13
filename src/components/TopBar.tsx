import { Menu, Plus } from 'lucide-react';
import { NavSection } from '../types/application';

interface TopBarProps {
  activeNav: NavSection;
  onOpenMobileMenu: () => void;
  onNewApplication: () => void;
}

const SECTION_TITLES: Record<NavSection, string> = {
  all: 'Career Ledger / All Applications',
  'follow-ups': 'Career Ledger / Follow-ups',
  idle: 'Career Ledger / Idle Watch',
  interviews: 'Career Ledger / Interviews',
  prep: 'Prep & Insights / Job Preparation',
  mock: 'Prep & Insights / Mock Interview Simulator',
  analytics: 'Prep & Insights / Pipeline Analytics',
};

export function TopBar({ activeNav, onOpenMobileMenu, onNewApplication }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-[20px]">
      <div className="flex items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="rounded-md p-2 text-[#141923] hover:bg-[#F3F5F9] lg:hidden cursor-pointer"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <span className="font-serif text-lg font-semibold text-[#141923] lg:hidden whitespace-nowrap">
            BiteMyJob
          </span>

          <p className="hidden lg:block font-label text-xs font-semibold text-[#4D5566] truncate">
            {SECTION_TITLES[activeNav]}
          </p>
        </div>

        <button
          type="button"
          onClick={onNewApplication}
          className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:opacity-95 active:scale-[0.99] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#094CB2]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New Application</span>
        </button>
      </div>
    </header>
  );
}
