import { useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useScheduleScroll } from './useScheduleScroll'
import { SCROLL_PAGES } from './schedule-data'
import ScheduleHeader from './ScheduleHeader'
import ScheduleTimeline from './ScheduleTimeline'

interface ScheduleVariant2Props {
  id?: string
}

export default function ScheduleVariant2({ id }: ScheduleVariant2Props) {
  const { theme } = useTheme()
  const sectionRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const { contentRef, translateY, visibleEvents, clockText, currentPhase } =
    useScheduleScroll(sectionRef, headerRef)

  return (
    <section
      ref={sectionRef}
      id={id}
      style={{ height: `${SCROLL_PAGES * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen flex flex-col overflow-hidden bg-background">
        <div ref={headerRef}>
          <ScheduleHeader clockText={clockText} currentPhase={currentPhase} theme={theme} />
        </div>
        <ScheduleTimeline
          contentRef={contentRef}
          translateY={translateY}
          visibleEvents={visibleEvents}
          theme={theme}
        />
      </div>
    </section>
  )
}
