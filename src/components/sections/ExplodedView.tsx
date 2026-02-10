import { useRef } from 'react'
import { useTransform, motion } from 'motion/react'
import { useExplodedViewScroll } from '@/hooks/useExplodedViewScroll'
import ExplodedViewAnnotations from '@/components/common/ExplodedViewAnnotations'
import ExplodedViewCanvas from '@/components/common/ExplodedViewCanvas'
import { SHOWCASE_CONFIG } from '@/lib/constants'
import Container from '@/components/common/Container'

interface ExplodedViewProps {
  id?: string
}

export default function ExplodedView({ id }: ExplodedViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { progressRef, scrollYProgress } = useExplodedViewScroll(containerRef)

  const titleOpacity = useTransform(scrollYProgress, (v) => {
    if (v < 0.93) return 0
    if (v > 0.99) return 1
    return (v - 0.93) / 0.06
  })
  const titleY = useTransform(scrollYProgress, (v) => {
    if (v < 0.93) return 20
    if (v > 0.99) return 0
    return 20 - 20 * (v - 0.93) / 0.06
  })

  return (
    <section
      ref={containerRef}
      id={id}
      style={{ height: `${SHOWCASE_CONFIG.scrollPages * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-background">
        <ExplodedViewCanvas scrollProgress={progressRef} />
        <ExplodedViewAnnotations scrollYProgress={scrollYProgress} />

        {/* Title pinned to bottom-left, fades in at end of animation */}
        <motion.div
          className="absolute bottom-8 left-0 right-0 z-10 pointer-events-none"
          style={{ opacity: titleOpacity, y: titleY }}
        >
          <Container>
            <h1 className="text-4xl md:text-6xl font-display text-foreground transition-colors duration-500">
              Årets Mest<br />
              Hypade <span className="italic text-red-400">Event</span>
            </h1>
          </Container>
        </motion.div>
      </div>
    </section>
  )
}
