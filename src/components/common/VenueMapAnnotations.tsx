import { useTransform, motion } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { VENUE_MAP_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface VenueMapAnnotationsProps {
  scrollYProgress: MotionValue<number>
  isMobile: boolean
}

function Annotation({
  text,
  subtext,
  position,
  scrollRange,
  scrollYProgress,
  isMobile,
}: {
  text: string
  subtext: string
  position: readonly [string, string]
  scrollRange: readonly [number, number]
  scrollYProgress: MotionValue<number>
  isMobile: boolean
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
      className={cn(
        'absolute pointer-events-none',
        !isMobile && 'max-w-[80vw]',
      )}
      style={{
        top: isMobile ? '6rem' : position[0],
        left: isMobile ? 0 : position[1],
        right: isMobile ? 0 : 'auto',
        transform: isMobile ? 'none' : 'translate(-50%, -50%)',
        opacity,
        y,
      }}
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
          'font-sans text-base md:text-xl text-zinc-400 text-center mt-1',
          'drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]',
        )}
      >
        {subtext}
      </p>
    </motion.div>
  )
}

export default function VenueMapAnnotations({ scrollYProgress, isMobile }: VenueMapAnnotationsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {VENUE_MAP_CONFIG.annotations.map((annotation) => (
        <Annotation
          key={annotation.text}
          text={annotation.text}
          subtext={annotation.subtext}
          position={annotation.position}
          scrollRange={annotation.scrollRange}
          scrollYProgress={scrollYProgress}
          isMobile={isMobile}
        />
      ))}
    </div>
  )
}
