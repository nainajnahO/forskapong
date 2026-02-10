import { useTransform, motion } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { VENUE_MAP_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface VenueMapAnnotationsProps {
  scrollYProgress: MotionValue<number>
}

function Annotation({
  text,
  subtext,
  scrollRange,
  scrollYProgress,
}: {
  text: string
  subtext: string
  scrollRange: readonly [number, number]
  scrollYProgress: MotionValue<number>
}) {
  const [start, end] = scrollRange
  const midIn = start + (end - start) * 0.25
  const midOut = start + (end - start) * 0.75

  const opacity = useTransform(scrollYProgress, (v) => {
    if (v <= start || v >= end) return 0
    if (v < midIn) return (v - start) / (midIn - start)
    if (v > midOut) return 1 - (v - midOut) / (end - midOut)
    return 1
  })

  const y = useTransform(scrollYProgress, (v) => {
    if (v <= start || v >= end) return 20
    if (v < midIn) return 20 - 20 * (v - start) / (midIn - start)
    if (v > midOut) return -20 * (v - midOut) / (end - midOut)
    return 0
  })

  return (
    <motion.div
      className="absolute pointer-events-none left-0 right-0 top-24"
      style={{ opacity, y }}
    >
      <p
        className={cn(
          'font-display text-3xl md:text-5xl lg:text-6xl text-white',
          'drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]',
          'text-center',
        )}
      >
        {text}
      </p>
      <p
        className={cn(
          'font-sans text-base md:text-xl text-zinc-400 text-center mt-1 whitespace-pre-line',
          'drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]',
        )}
      >
        {subtext}
      </p>
    </motion.div>
  )
}

export default function VenueMapAnnotations({ scrollYProgress }: VenueMapAnnotationsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {VENUE_MAP_CONFIG.annotations.map((annotation) => (
        <Annotation
          key={annotation.text}
          text={annotation.text}
          subtext={annotation.subtext}
          scrollRange={annotation.scrollRange}
          scrollYProgress={scrollYProgress}
        />
      ))}
    </div>
  )
}
