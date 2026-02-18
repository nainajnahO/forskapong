import { useState, type ReactNode } from 'react';
import { AdminTabContext } from './AdminTabContextDef';
import type { AdminTab } from './AdminTabContextDef';

export function AdminTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('live');
  return (
    <AdminTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </AdminTabContext.Provider>
  );
}
