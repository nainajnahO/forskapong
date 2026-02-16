import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import About from './components/sections/About';
import ScheduleVariant2 from './components/sections/schedule';
import ExplodedView from './components/sections/ExplodedView';
import ErrorBoundary from './components/common/ErrorBoundary';
import { VENUE_MAP_CONFIG } from '@/lib/constants';

const VenueMap = lazy(() => import('./components/sections/VenueMap'));
const TicketsComingSoon = lazy(() => import('./components/sections/TicketsComingSoon'));
const Play = lazy(() => import('./pages/Play'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MatchPage = lazy(() => import('./pages/MatchPage'));
const Scoreboard = lazy(() => import('./pages/Scoreboard'));

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

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/play" element={<Suspense fallback={<div className="min-h-screen" />}><Play /></Suspense>} />
            <Route path="/play/dashboard" element={<Suspense fallback={<div className="min-h-screen" />}><Dashboard /></Suspense>} />
            <Route path="/play/match/:matchId" element={<Suspense fallback={<div className="min-h-screen" />}><MatchPage /></Suspense>} />
            <Route path="/scoreboard" element={<Suspense fallback={<div className="min-h-screen" />}><Scoreboard /></Suspense>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
