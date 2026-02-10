import { useRef } from 'react'
import { useExplodedViewScroll } from '@/hooks/useExplodedViewScroll'
import ExplodedViewAnnotations from '@/components/common/ExplodedViewAnnotations'
import ExplodedViewCanvas from '@/components/common/ExplodedViewCanvas'
import { SHOWCASE_CONFIG } from '@/lib/constants'

interface ExplodedViewProps {
  id?: string
}

export default function ExplodedView({ id }: ExplodedViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { progressRef, scrollYProgress } = useExplodedViewScroll(containerRef)

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
      </div>
    </section>
  )
}
