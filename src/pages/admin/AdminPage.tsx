import { useState } from 'react';
import Container from '@/components/common/Container';
import SectionLabel from '@/components/common/SectionLabel';
import AdminPassphraseGate from './AdminPassphraseGate';
import AdminTabBar, { type AdminTab } from './components/AdminTabBar';
import TeamsTab from './tabs/TeamsTab';
import TournamentTab from './tabs/TournamentTab';
import SimulatorTab from './tabs/SimulatorTab';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('adminAuth') === 'true',
  );
  const [activeTab, setActiveTab] = useState<AdminTab>('simulator');

  if (!authenticated) {
    return <AdminPassphraseGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <section className="min-h-screen pt-24 pb-16">
      <Container>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <SectionLabel variant="gradient">Admin</SectionLabel>
            <button
              onClick={() => {
                sessionStorage.removeItem('adminAuth');
                setAuthenticated(false);
              }}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition"
            >
              Logga ut
            </button>
          </div>

          {/* Tabs */}
          <AdminTabBar activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Content */}
          <div>
            {activeTab === 'teams' && <TeamsTab />}
            {activeTab === 'tournament' && <TournamentTab />}
            {activeTab === 'simulator' && <SimulatorTab />}
          </div>
        </div>
      </Container>
    </section>
  );
}
