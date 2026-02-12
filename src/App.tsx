import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import ExplodedView from './components/sections/ExplodedView'
import About from './components/sections/About'
import ScheduleVariant2 from './components/sections/ScheduleVariant2'
import VenueMap from './components/sections/VenueMap'
import TicketsComingSoon from './components/sections/TicketsComingSoon'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Navbar />
      <Hero />
      <ExplodedView id="showcase" />
      <About id="about" />
      <ScheduleVariant2 id="schedule-v4" />
      <VenueMap id="venue" />
      <TicketsComingSoon id="tickets" />
      <Footer />
    </div>
  )
}

export default App
