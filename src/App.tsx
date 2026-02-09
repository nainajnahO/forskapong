import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import About from './components/sections/About'
import ScheduleElegant from './components/sections/ScheduleElegant'
import Sponsors from './components/sections/Sponsors'
import Tickets from './components/sections/Tickets'

function App() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <About id="about" />
      <ScheduleElegant id="schedule" />
      <Sponsors id="sponsors" />
      <Tickets id="tickets" />
      <Footer />
    </div>
  )
}

export default App
