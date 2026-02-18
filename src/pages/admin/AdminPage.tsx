import { useState } from 'react';
import Container from '@/components/common/Container';
import AdminPassphraseGate from './AdminPassphraseGate';
import { useAdminTab } from '@/contexts/useAdminTab';
import TeamsTab from './tabs/TeamsTab';
import TournamentTab from './tabs/TournamentTab';
import SimulatorTab from './tabs/SimulatorTab';
import LiveTab from './tabs/LiveTab';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(
    () =>
      !!import.meta.env.VITE_ADMIN_PASSPHRASE ||
      sessionStorage.getItem('adminAuth') === 'true',
  );
  const adminTab = useAdminTab();
  const activeTab = adminTab?.activeTab ?? 'live';
  const setActiveTab = adminTab?.setActiveTab ?? (() => {});

  if (!authenticated) {
    return <AdminPassphraseGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <section className="min-h-screen pt-24 pb-16">
      <Container>
        <div className="space-y-8">
          {/* Content */}
          <div>
            {activeTab === 'live' && <LiveTab onTabChange={setActiveTab} />}
            {activeTab === 'teams' && <TeamsTab />}
            {activeTab === 'tournament' && <TournamentTab onTabChange={setActiveTab} />}
            {activeTab === 'simulator' && <SimulatorTab />}
          </div>
        </div>
      </Container>
    </section>
  );
}
