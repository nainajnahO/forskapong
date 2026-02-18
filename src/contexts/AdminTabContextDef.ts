import { createContext } from 'react';

export type AdminTab = 'live' | 'teams' | 'tournament' | 'simulator';

export const ADMIN_TABS: { key: AdminTab; label: string }[] = [
  { key: 'live', label: 'Live' },
  { key: 'teams', label: 'Lag' },
  { key: 'tournament', label: 'Turnering' },
  { key: 'simulator', label: 'Simulator' },
];

export interface AdminTabContextValue {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

export const AdminTabContext = createContext<AdminTabContextValue | null>(null);
