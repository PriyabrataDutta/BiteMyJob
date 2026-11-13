import {
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  Hourglass,
  Layers,
  Mic,
  X,
} from 'lucide-react';
import { NavSection } from '../types/application';

interface SidebarProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  counts: {
    all: number;
    followUps: number;
    idle: number;
    interviews: number;
    mockSessions: number;
  };
}

export function Sidebar({
  activeNav,
  onSelectNav,
  mobileOpen,
  onCloseMobile,
  counts,
}: SidebarProps) {
  const primaryItems: {
    id: NavSection;
    label: string;
    icon: typeof Layers;
    badge?: number;
  }[] = [
    { id: 'all', label: 'All Applications', icon: Layers, badge: counts.all },
    { id: 'follow-ups', label: 'Follow-ups', icon: Clock, badge: counts.followUps },
    { id: 'idle', label: 'Idle Watch', icon: Hourglass, badge: counts.idle },
    { id: 'interviews', label: 'Interviews', icon: Calendar, badge: counts.interviews },
  ];

  const studioItems: {
    id: NavSection;
    label: string;
    icon: typeof BookOpen;
    badge?: number;
  }[] = [
    { id: 'prep', label: 'Job Preparation', icon: BookOpen },
    { id: 'mock', label: 'Mock Interview', icon: Mic, badge: counts.mockSessions || undefined },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const handleSelect = (id: NavSection) => {
    onSelectNav(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <div className="flex items-center justify-between px-3 pb-6">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleSelect('all');
            }}
            className="font-serif text-xl font-semibold tracking-tight text-[#141923] whitespace-nowrap"
          >
            BiteMyJob
          </a>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded-md p-1.5 text-[#4D5566] hover:bg-[#F3F5F9] lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Workspace navigation" className="space-y-6">
          <div>
            <p className="px-3 font-label text-[11px] font-semibold uppercase tracking-wider text-[#4D5566]/80">
              Career Ledger
            </p>
            <ul className="mt-2 space-y-1">
              {primaryItems.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-[#E9F0FC] text-[#094CB2]'
                          : 'text-[#4D5566] hover:bg-[#F3F5F9] hover:text-[#141923]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.badge === 'number' && (
                        <span
                          className={`font-label text-xs tabular-nums ${
                            active ? 'text-[#094CB2]' : 'text-[#4D5566]/80'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="px-3 font-label text-[11px] font-semibold uppercase tracking-wider text-[#4D5566]/80">
              Prep &amp; Insights
            </p>
            <ul className="mt-2 space-y-1">
              {studioItems.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-[#E9F0FC] text-[#094CB2]'
                          : 'text-[#4D5566] hover:bg-[#F3F5F9] hover:text-[#141923]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.badge === 'number' && (
                        <span
                          className={`font-label text-xs tabular-nums ${
                            active ? 'text-[#094CB2]' : 'text-[#4D5566]/80'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>

      <div className="rounded-md bg-[#F3F5F9] p-3.5 text-xs text-[#4D5566]">
        <p className="font-label font-semibold text-[#141923]">Digital Curator</p>
        <p className="mt-1 leading-relaxed">
          All applications, prep checklists, mock scorecards, and presets save locally in your
          browser.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block lg:w-[248px] lg:shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">{navContent}</div>
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden bg-[#141923]/25 backdrop-blur-[2px]"
          onClick={onCloseMobile}
        >
          <aside
            className="alexandria-modal-shadow h-full w-[264px] max-w-[85vw] overflow-y-auto bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
