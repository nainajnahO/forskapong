import { lazy, Suspense } from 'react';
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

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Navbar />
      <main>
        <Hero />
        <ErrorBoundary>
          <ExplodedView id="showcase" />
        </ErrorBoundary>
        <About id="about" />
        <ScheduleVariant2 id="schedule-v4" />
        <ErrorBoundary>
          <Suspense
            fallback={<div style={{ height: `${VENUE_MAP_CONFIG.scrollPages * 100}vh` }} />}
          >
            <VenueMap id="venue" />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<div className="py-16 md:py-24" />}>
            <TicketsComingSoon id="tickets" />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

export default App;
