import { useTransform, motion } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { SHOWCASE_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface ExplodedViewAnnotationsProps {
  scrollYProgress: MotionValue<number>
}

function Annotation({
  text,
  subtext,
  position,
  scrollRange,
  scrollYProgress,
}: {
  text: string
  subtext?: string
  position: readonly [string, string]
  scrollRange: readonly [number, number]
  scrollYProgress: MotionValue<number>
}) {
  const [start, end] = scrollRange
  const midIn = start + (end - start) * 0.25
  const midOut = start + (end - start) * 0.75

  const opacity = useTransform(
    scrollYProgress,
    [start, midIn, midOut, end],
    [0, 1, 1, 0],
  )

  const y = useTransform(
    scrollYProgress,
    [start, midIn, midOut, end],
    [20, 0, 0, -20],
  )

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        top: position[0],
        left: position[1],
        transform: 'translate(-50%, -50%)',
        opacity,
        y,
      }}
    >
      <p className={cn(
        'font-display text-3xl md:text-5xl text-white',
        'drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]',
        'text-center whitespace-nowrap',
      )}>
        {text}
      </p>
      {subtext && (
        <p className={cn(
          'font-sans text-sm md:text-lg text-zinc-400 text-center mt-1',
          'drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]',
        )}>
          {subtext}
        </p>
      )}
    </motion.div>
  )
}

export default function ExplodedViewAnnotations({ scrollYProgress }: ExplodedViewAnnotationsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {SHOWCASE_CONFIG.annotations.map((annotation) => (
        <Annotation
          key={annotation.text}
          text={annotation.text}
          subtext={annotation.subtext}
          position={annotation.position}
          scrollRange={annotation.scrollRange}
          scrollYProgress={scrollYProgress}
        />
      ))}
    </div>
  )
}
