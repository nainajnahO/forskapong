import { useEffect, useRef, useState } from 'react'
import { useScroll, useMotionValueEvent, motion, AnimatePresence } from 'motion/react'
import { SCHEDULE_PHASES } from '@/lib/constants'
import Container from '../common/Container'
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
  phaseStartMinute: number
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
    phaseStartMinute: parseTimeToMinutes(phase.startTime),
    startMinute: parseTimeToMinutes(ev.time),
  })),
)

// Phase list for the spine badges
const PHASES = SCHEDULE_PHASES.map((p) => ({
  name: p.name,
  startMinute: parseTimeToMinutes(p.startTime),
}))

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
interface ScheduleVariant2Props {
  id?: string
}

export default function ScheduleVariant2({ id }: ScheduleVariant2Props) {
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

  const [currentMinute, setCurrentMinute] = useState(() =>
    progressToMinute(scrollYProgress.get()),
  )

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

  const translateY =
    contentHeight > availableHeight ? -(contentHeight - availableHeight) : 0

  const visibleEvents = EVENTS.filter((ev) => currentMinute >= ev.startMinute)
  const clockText = formatMinutesToClock(Math.max(0, currentMinute))

  // Current phase: last phase whose startMinute ≤ currentMinute
  const currentPhase =
    [...PHASES].reverse().find((p) => currentMinute >= p.startMinute)?.name ?? PHASES[0].name

  return (
    <section
      ref={sectionRef}
      id={id}
      style={{ height: `${SCROLL_PAGES * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen flex flex-col overflow-hidden bg-background">
        {/* ── Header + Clock ─────────────────────────────────── */}
        <div ref={headerRef}>
          <Container className="pt-[5.5rem]">

            {/* Big clock */}
            <div className="text-center mb-2">
              <span
                className={cn(
                  'text-6xl md:text-8xl lg:text-9xl font-display tabular-nums transition-colors duration-500',
                  themeText(theme, 'primary'),
                )}
              >
                {clockText}
              </span>
            </div>

            {/* Current phase label with lines */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div
                className={cn(
                  'h-px w-12 md:w-20 transition-colors duration-500',
                  theme === 'light' ? 'bg-zinc-300' : 'bg-zinc-700',
                )}
              />
              <span className="text-xs uppercase tracking-widest text-brand-500 font-medium">
                {currentPhase}
              </span>
              <div
                className={cn(
                  'h-px w-12 md:w-20 transition-colors duration-500',
                  theme === 'light' ? 'bg-zinc-300' : 'bg-zinc-700',
                )}
              />
            </div>
          </Container>
        </div>

        {/* ── Timeline ───────────────────────────────────────── */}
        <div className="flex-1 min-h-0">
          <Container className="h-full overflow-hidden">
            <motion.div
              ref={contentRef}
              className="max-w-4xl mx-auto"
              animate={{ y: translateY }}
              transition={{ type: 'spring', stiffness: 300, damping: 40 }}
            >
              {/* Desktop: 3-col zigzag | Mobile: 2-col left spine */}
              <div className="relative">
                <AnimatePresence initial={false}>
                  {visibleEvents.map((ev, i) => {
                    const isLeft = i % 2 === 0
                    const isLast = i === visibleEvents.length - 1
                    const isPast = !isLast

                    // Check if this event starts a new phase
                    const isPhaseStart =
                      i === 0 || ev.phase !== visibleEvents[i - 1].phase

                    return (
                      <motion.div
                        key={`${ev.phase}-${ev.title}`}
                        initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      >
                        {/* Phase badge on spine */}
                        {isPhaseStart && (
                          <div className="flex items-center mb-3">
                            {/* Mobile: spine-left layout */}
                            <div className="md:hidden flex items-center">
                              <div className="w-8 flex justify-center">
                                <span
                                  className={cn(
                                    'inline-block rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-widest font-medium',
                                    theme === 'light'
                                      ? 'bg-zinc-100 border border-zinc-300 text-zinc-600'
                                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400',
                                  )}
                                >
                                  {ev.phase}
                                </span>
                              </div>
                            </div>

                            {/* Desktop: centered badge */}
                            <div className="hidden md:flex w-full justify-center">
                              <span
                                className={cn(
                                  'inline-block rounded-full px-3 py-1 text-xs uppercase tracking-widest font-medium',
                                  theme === 'light'
                                    ? 'bg-zinc-100 border border-zinc-300 text-zinc-600'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400',
                                )}
                              >
                                {ev.phase}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Event row */}
                        <div
                          className={cn(
                            'mb-6',
                            'grid grid-cols-[32px_1fr] md:grid-cols-[1fr_48px_1fr]',
                          )}
                        >
                          {/* ── Desktop left column ── */}
                          <div className="hidden md:flex items-start justify-end">
                            {isLeft ? (
                              <EventEntry
                                ev={ev}
                                isLast={isLast}
                                isPast={isPast}
                                theme={theme}
                                side="left"
                              />
                            ) : (
                              <div />
                            )}
                          </div>

                          {/* ── Spine column (desktop) ── */}
                          <div className="hidden md:flex flex-col items-center relative">
                            {/* Connector line to card */}
                            <div className="flex items-center h-6 w-full">
                              {/* Left connector */}
                              <div
                                className={cn(
                                  'h-px flex-1',
                                  isLeft
                                    ? isPast
                                      ? theme === 'light' ? 'bg-zinc-300' : 'bg-zinc-700'
                                      : 'bg-brand-500/50'
                                    : 'bg-transparent',
                                )}
                              />
                              {/* Dot */}
                              {isLast ? (
                                <div className="relative flex items-center justify-center">
                                  <span className="absolute w-8 h-8 rounded-full bg-brand-500/20 animate-ping" />
                                  <span className="relative w-4 h-4 rounded-full bg-brand-500 border-2 border-brand-500/30" />
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    'w-3 h-3 rounded-full border-2 shrink-0',
                                    theme === 'light'
                                      ? 'bg-zinc-400 border-zinc-200'
                                      : 'bg-zinc-600 border-zinc-900',
                                  )}
                                />
                              )}
                              {/* Right connector */}
                              <div
                                className={cn(
                                  'h-px flex-1',
                                  !isLeft
                                    ? isPast
                                      ? theme === 'light' ? 'bg-zinc-300' : 'bg-zinc-700'
                                      : 'bg-brand-500/50'
                                    : 'bg-transparent',
                                )}
                              />
                            </div>
                            {/* Vertical spine segment below dot */}
                            <div
                              className={cn(
                                'w-px flex-1',
                                isLast
                                  ? 'border-l border-dashed'
                                    + (theme === 'light' ? ' border-zinc-300' : ' border-zinc-800')
                                  : theme === 'light' ? 'bg-zinc-300' : 'bg-zinc-700',
                              )}
                            />
                          </div>

                          {/* ── Desktop right column ── */}
                          <div className="hidden md:flex items-start">
                            {!isLeft ? (
                              <EventEntry
                                ev={ev}
                                isLast={isLast}
                                isPast={isPast}
                                theme={theme}
                                side="right"
                              />
                            ) : (
                              <div />
                            )}
                          </div>

                          {/* ── Mobile spine column ── */}
                          <div className="md:hidden flex flex-col items-center relative">
                            <div className="flex items-center h-5">
                              {isLast ? (
                                <div className="relative flex items-center justify-center">
                                  <span className="absolute w-6 h-6 rounded-full bg-brand-500/20 animate-ping" />
                                  <span className="relative w-3 h-3 rounded-full bg-brand-500 border-2 border-brand-500/30" />
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    'w-2.5 h-2.5 rounded-full border-2 shrink-0',
                                    theme === 'light'
                                      ? 'bg-zinc-400 border-zinc-200'
                                      : 'bg-zinc-600 border-zinc-900',
                                  )}
                                />
                              )}
                            </div>
                            <div
                              className={cn(
                                'w-px flex-1',
                                isLast
                                  ? 'border-l border-dashed'
                                    + (theme === 'light' ? ' border-zinc-300' : ' border-zinc-800')
                                  : theme === 'light' ? 'bg-zinc-300' : 'bg-zinc-700',
                              )}
                            />
                          </div>

                          {/* ── Mobile card column ── */}
                          <div className="md:hidden pl-3">
                            <EventEntry
                              ev={ev}
                              isLast={isLast}
                              isPast={isPast}
                              theme={theme}
                              side="right"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          </Container>
        </div>
      </div>
    </section>
  )
}

// ── Event Entry (no card — text directly on background) ─────────
interface EventEntryProps {
  ev: EnrichedEvent
  isLast: boolean
  isPast: boolean
  theme: 'light' | 'dark'
  side: 'left' | 'right'
}

function EventEntry({ ev, isLast, isPast, theme, side }: EventEntryProps) {
  return (
    <div
      className={cn(
        'w-full pb-1 transition-opacity duration-500',
        isPast && 'opacity-50',
        side === 'left' && 'md:text-right',
      )}
    >
      {/* Time */}
      <p
        className={cn(
          'text-sm tabular-nums mb-0.5 transition-colors duration-500',
          isLast ? 'text-brand-500' : themeText(theme, 'muted'),
        )}
      >
        {ev.time}
      </p>

      {/* Title */}
      <h4
        className={cn(
          'text-xl md:text-2xl font-display transition-colors duration-500',
          themeText(theme, 'primary'),
          ev.bold ? 'font-bold' : 'font-semibold',
          ev.italic ? 'italic' : '',
        )}
      >
        {ev.title}
      </h4>

      {/* Description */}
      <p
        className={cn(
          'text-sm md:text-base leading-relaxed whitespace-pre-wrap mt-1 transition-colors duration-500',
          themeText(theme, 'secondary'),
        )}
      >
        {ev.description}
      </p>

      {/* Speakers */}
      {ev.speakers && ev.speakers.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {ev.speakers.map((speaker, si) => (
            <p key={si} className="transition-colors duration-500">
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
  )
}
