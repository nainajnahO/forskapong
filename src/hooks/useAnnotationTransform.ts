import { useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'

interface AnnotationTransformOptions {
  scrollYProgress: MotionValue<number>
  scrollRange: readonly [number, number]
  /** If true, the annotation is fully visible at the start instead of fading in */
  isFirst?: boolean
}

export function useAnnotationTransform({ scrollYProgress, scrollRange, isFirst = false }: AnnotationTransformOptions) {
  const [start, end] = scrollRange
  const midIn = start + (end - start) * 0.25
  const midOut = start + (end - start) * 0.75

  const opacity = useTransform(scrollYProgress, (v) => {
    if (v >= end) return 0
    if (!isFirst && v <= start) return 0
    if (isFirst && v < midIn) return 1
    if (v < midIn) return (v - start) / (midIn - start)
    if (v > midOut) return 1 - (v - midOut) / (end - midOut)
    return 1
  })

  const y = useTransform(scrollYProgress, (v) => {
    if (v >= end) return 20
    if (!isFirst && v <= start) return 20
    if (isFirst && v < midIn) return 0
    if (v < midIn) return 20 - 20 * (v - start) / (midIn - start)
    if (v > midOut) return -20 * (v - midOut) / (end - midOut)
    return 0
  })

  return { opacity, y }
}
