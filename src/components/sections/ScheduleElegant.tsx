import { useEffect, useRef, useState } from 'react'
import { useScroll, useMotionValueEvent, motion, AnimatePresence } from 'motion/react'
import { SCHEDULE_PHASES } from '@/lib/constants'
import Container from '../common/Container'
import SectionHeader from '../common/SectionHeader'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { themeText } from '@/lib/theme-utils'

// ── Time helpers ──────────────────────────────────────────────────
function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return 0
  return (parseInt(match[1]) - 19) * 60 + parseInt(match[2])
}

function formatMinutesToClock(minutes: number): string {
  const h = 19 + Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

// ── Enriched event data ──────────────────────────────────────────
interface EnrichedEvent {
  time: string
  title: string
  description: string
  italic?: boolean
  bold?: boolean
  speakers?: readonly { readonly name: string; readonly title: string }[]
  phase: string
  startMinute: number
}

const EVENTS: EnrichedEvent[] = SCHEDULE_PHASES.flatMap((phase) =>
  phase.events.map((ev) => ({
    time: ev.time,
    title: ev.title,
    description: ev.description,
    italic: 'italic' in ev ? ev.italic : undefined,
    bold: 'bold' in ev ? ev.bold : undefined,
    speakers: 'speakers' in ev ? ev.speakers : undefined,
    phase: phase.name,
    startMinute: parseTimeToMinutes(ev.time),
  })),
)

// 19:00 → 22:30 = 210 minutes
const TOTAL_MINUTES = 210

// ── Scroll constants ─────────────────────────────────────────────
const SCROLL_PAGES = 5
const SCROLL_MARGIN = 0.04
const BOTTOM_PADDING = 48
const USABLE = 1 - 2 * SCROLL_MARGIN

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function progressToMinute(p: number): number {
  return Math.round(clamp((p - SCROLL_MARGIN) / USABLE, 0, 1) * TOTAL_MINUTES)
}

// ── Component ────────────────────────────────────────────────────
interface ScheduleElegantProps {
  id?: string
}

export default function ScheduleElegant({ id }: ScheduleElegantProps) {
  const { theme } = useTheme()
  const sectionRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)
  const [availableHeight, setAvailableHeight] = useState(0)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  // Initialize from current scroll position (covers direct #schedule navigation)
  const [currentMinute, setCurrentMinute] = useState(() =>
    progressToMinute(scrollYProgress.get()),
  )

  // Scroll progress → current minute (0 → 210)
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setCurrentMinute(progressToMinute(latest))
  })

  // Measure available height for content translation
  useEffect(() => {
    function measure() {
      const headerH = headerRef.current?.offsetHeight ?? 0
      setAvailableHeight(window.innerHeight - headerH - BOTTOM_PADDING)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Track content height via ResizeObserver
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setContentHeight(el.scrollHeight)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Translate content up so the latest event stays visible
  const translateY =
    contentHeight > availableHeight ? -(contentHeight - availableHeight) : 0

  const visibleEvents = EVENTS.filter((ev) => currentMinute >= ev.startMinute)
  const lastIndex = visibleEvents.length - 1
  const clockText = formatMinutesToClock(Math.max(0, currentMinute))

  return (
    <section
      ref={sectionRef}
      id={id}
      style={{ height: `${SCROLL_PAGES * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen flex flex-col overflow-hidden bg-background">
        <div ref={headerRef}>
          <Container className="pt-[5.5rem]">
            <SectionHeader title="Vad" titleHighlight="Händish?" className="text-center mb-10" />
          </Container>
        </div>

        <div className="flex-1 min-h-0">
          <Container className="h-full overflow-hidden">
            <motion.div
              ref={contentRef}
              className="max-w-2xl mx-auto"
              animate={{ y: translateY }}
              transition={{ type: 'spring', stiffness: 300, damping: 40 }}
            >
              <AnimatePresence initial={false}>
              {visibleEvents.map((ev, i) => {
                const isLast = i === lastIndex

                return (
                  <motion.div
                    key={`${ev.phase}-${ev.title}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={cn(
                      'grid grid-cols-1 md:grid-cols-[160px_1fr] lg:grid-cols-[200px_1fr] gap-2 md:gap-8',
                      i < lastIndex ? 'pb-6' : 'pb-0',
                    )}
                  >
                    {/* Clock column — big clock for last visible event, small time for others */}
                    {isLast ? (
                      <div className="flex items-start">
                        <span
                          className={cn(
                            'text-5xl lg:text-6xl font-display tabular-nums transition-colors duration-500',
                            themeText(theme, 'primary'),
                          )}
                        >
                          {clockText}
                        </span>
                      </div>
                    ) : (
                      <div className="hidden md:flex items-start">
                        <span
                          className={cn(
                            'text-sm tabular-nums pt-1 transition-colors duration-500',
                            themeText(theme, 'muted'),
                          )}
                        >
                          {ev.time}
                        </span>
                      </div>
                    )}

                    {/* Event content */}
                    <div
                      className={cn(
                        'pl-4 border-l-2 transition-colors duration-500',
                        isLast
                          ? theme === 'light'
                            ? 'border-zinc-400'
                            : 'border-zinc-500'
                          : 'border-transparent',
                      )}
                    >
                      <p
                        className={cn(
                          'text-xs uppercase tracking-widest mb-1 transition-colors duration-500',
                          themeText(theme, 'muted'),
                        )}
                      >
                        {ev.phase}
                      </p>
                      {/* Mobile inline time — hidden on desktop where the left column shows it */}
                      {!isLast && (
                        <p
                          className={cn(
                            'text-sm tabular-nums mb-1 md:hidden transition-colors duration-500',
                            themeText(theme, 'muted'),
                          )}
                        >
                          {ev.time}
                        </p>
                      )}
                      <h4
                        className={cn(
                          'text-2xl md:text-3xl font-display transition-colors duration-500',
                          themeText(theme, 'primary'),
                          ev.bold ? 'font-bold' : 'font-semibold',
                          ev.italic ? 'italic' : '',
                        )}
                      >
                        {ev.title}
                      </h4>
                      <p
                        className={cn(
                          'text-sm md:text-base leading-relaxed whitespace-pre-wrap mt-1 transition-colors duration-500',
                          themeText(theme, 'secondary'),
                        )}
                      >
                        {ev.description}
                      </p>
                      {ev.speakers && ev.speakers.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {ev.speakers.map((speaker, si) => (
                            <p
                              key={si}
                              className="transition-colors duration-500"
                            >
                              <span className="text-sm text-foreground transition-colors duration-500">
                                {speaker.name}
                              </span>
                              <span
                                className={cn(
                                  'text-sm ml-2 transition-colors duration-500',
                                  themeText(theme, 'muted'),
                                )}
                              >
                                {speaker.title}
                              </span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
              </AnimatePresence>
            </motion.div>
          </Container>
        </div>
      </div>
    </section>
  )
}
