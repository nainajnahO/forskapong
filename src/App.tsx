import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import ExplodedView from './components/sections/ExplodedView'
import About from './components/sections/About'
import ScheduleElegant from './components/sections/ScheduleElegant'
import VenueMap from './components/sections/VenueMap'
import Tickets from './components/sections/Tickets'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Navbar />
      <Hero />
      <ExplodedView id="showcase" />
      <About id="about" />
      <ScheduleElegant id="schedule" />
      <VenueMap id="venue" />
      <Tickets id="tickets" />
      <Footer />
    </div>
  )
}

export default App
