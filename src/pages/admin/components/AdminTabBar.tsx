import { cn } from '@/lib/utils';

export type AdminTab = 'teams' | 'tournament' | 'simulator';

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const TABS: { key: AdminTab; label: string }[] = [
  { key: 'teams', label: 'Lag' },
  { key: 'tournament', label: 'Turnering' },
  { key: 'simulator', label: 'Simulator' },
];

export default function AdminTabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex gap-1 p-1 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            'flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all',
            activeTab === tab.key
              ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
              : 'text-zinc-500 border border-transparent hover:text-zinc-300',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
