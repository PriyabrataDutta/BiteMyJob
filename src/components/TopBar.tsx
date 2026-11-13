import { Plus } from 'lucide-react';
import { NavSection } from '../types/application';

interface TopBarProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  onNewApplication: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: 'all', label: 'All Applications' },
  { id: 'follow-ups', label: 'Follow-ups' },
  { id: 'idle', label: 'Idle Watch' },
  { id: 'interviews', label: 'Interviews' },
];

export function TopBar({ activeNav, onSelectNav, onNewApplication }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-[20px]">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-6 py-4 lg:px-10">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectNav('all');
          }}
          className="font-serif text-xl font-semibold tracking-tight text-[#141923] whitespace-nowrap shrink-0"
        >
          BiteMyJob
        </a>

        {/* Zone 2: Clean typographic navigation links */}
        <nav aria-label="Primary sections" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectNav(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-[#094CB2]'
                    : 'text-[#4D5566] hover:text-[#141923] hover:underline underline-offset-4'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-[#094CB2]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary gradient CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewApplication}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#094CB2] to-[#1D63D0] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:opacity-95 active:scale-[0.99] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#094CB2]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* Mobile horizontal nav row */}
      <div className="flex md:hidden items-center gap-5 overflow-x-auto px-6 pb-3 editorial-scroll">
        {NAV_ITEMS.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNav(item.id)}
              className={`text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                isActive ? 'text-[#094CB2] underline underline-offset-4' : 'text-[#4D5566]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
