import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import About from './components/sections/About';
import ScheduleVariant2 from './components/sections/schedule';
import ExplodedView from './components/sections/ExplodedView';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AdminTabProvider } from '@/contexts/AdminTabContext';
import { VENUE_MAP_CONFIG } from '@/lib/constants';

const VenueMap = lazy(() => import('./components/sections/VenueMap'));
const TicketsComingSoon = lazy(() => import('./components/sections/TicketsComingSoon'));
const Play = lazy(() => import('./pages/Play'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MatchPage = lazy(() => import('./pages/MatchPage'));
const Scoreboard = lazy(() => import('./pages/Scoreboard'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const DisplayPage = lazy(() => import('./pages/DisplayPage'));

function HomePage() {
  return (
    <>
      <Hero />
      <ErrorBoundary>
        <ExplodedView id="showcase" />
      </ErrorBoundary>
      <About id="about" />
      <ScheduleVariant2 id="schedule-v4" />
      <ErrorBoundary>
        <Suspense fallback={<div style={{ height: `${VENUE_MAP_CONFIG.scrollPages * 100}vh` }} />}>
          <VenueMap id="venue" />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={<div className="py-16 md:py-24" />}>
          <TicketsComingSoon id="tickets" />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

function AppLayout() {
  return (
    <AdminTabProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
        <Navbar />
        <main>
          <Outlet />
        </main>
        <Footer />
      </div>
    </AdminTabProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Chrome-free routes */}
        <Route path="/display" element={<Suspense fallback={<div className="h-screen bg-zinc-950" />}><DisplayPage /></Suspense>} />

        {/* Standard layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/play" element={<Suspense fallback={<div className="min-h-screen" />}><Play /></Suspense>} />
          <Route path="/play/dashboard" element={<Suspense fallback={<div className="min-h-screen" />}><Dashboard /></Suspense>} />
          <Route path="/play/match/:matchId" element={<Suspense fallback={<div className="min-h-screen" />}><MatchPage /></Suspense>} />
          <Route path="/scoreboard" element={<Suspense fallback={<div className="min-h-screen" />}><Scoreboard /></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<div className="min-h-screen" />}><AdminPage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
