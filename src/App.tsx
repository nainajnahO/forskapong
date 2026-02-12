import { lazy, Suspense } from 'react'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import About from './components/sections/About'
import ScheduleVariant2 from './components/sections/schedule'
import ExplodedView from './components/sections/ExplodedView'

const VenueMap = lazy(() => import('./components/sections/VenueMap'))
const TicketsComingSoon = lazy(() => import('./components/sections/TicketsComingSoon'))

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Navbar />
      <Hero />
      <ExplodedView id="showcase" />
      <About id="about" />
      <ScheduleVariant2 id="schedule-v4" />
      <Suspense fallback={<div style={{ height: '400vh' }} />}>
        <VenueMap id="venue" />
      </Suspense>
      <Suspense fallback={<div className="py-16 md:py-24" />}>
        <TicketsComingSoon id="tickets" />
      </Suspense>
      <Footer />
    </div>
  )
}

export default App
