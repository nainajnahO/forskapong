import { useRef } from 'react'
import { useScroll, useMotionValueEvent } from 'motion/react'
import VenueMapCanvas from '@/components/common/VenueMapCanvas'
import VenueMapAnnotations from '@/components/common/VenueMapAnnotations'
import { VENUE_MAP_CONFIG } from '@/lib/constants'
import { useViewportWidth } from '@/hooks/useViewportWidth'

interface VenueMapProps {
  id?: string
}

export default function VenueMap({ id }: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportWidth = useViewportWidth()
  const isMobile = viewportWidth < 768

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // On mobile, keep a ref synced for any imperative reads
  const progressRef = useRef(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progressRef.current = v
  })

  if (isMobile) {
    return (
      <section id={id} className="relative h-screen">
        <VenueMapCanvas scrollYProgress={scrollYProgress} isMobile />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6">
          <p className="font-display text-3xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center">
            Bridgens Hus
          </p>
          <p className="font-sans text-base text-zinc-400 text-center mt-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            Dragarbrunnsgatan 45, Uppsala
          </p>
          <p className="font-sans text-sm text-zinc-500 text-center mt-3 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            28 februari 2026
          </p>
          <a
            href="https://maps.google.com/?q=Bridgens+Hus+Uppsala"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto mt-4 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm border border-white/20 hover:bg-white/20 transition-colors"
          >
            Öppna i Google Maps
          </a>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={containerRef}
      id={id}
      style={{ height: `${VENUE_MAP_CONFIG.scrollPages * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <VenueMapCanvas scrollYProgress={scrollYProgress} isMobile={false} />
        <VenueMapAnnotations scrollYProgress={scrollYProgress} isMobile={false} />
      </div>
    </section>
  )
}
