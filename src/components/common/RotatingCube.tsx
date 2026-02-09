import { forwardRef, useImperativeHandle, useRef } from "react"
import type { CSSProperties } from "react"
import { motion, useMotionValue, useSpring } from "motion/react"
import type { SpringOptions } from "motion/react"
import { cn } from "@/lib/utils"

interface RotatingCubeProps {
  words: readonly string[]
  className?: string
  size?: number
  draggable?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  springConfig?: {
    stiffness?: number
    damping?: number
  }
}

export interface RotatingCubeRef {
  showFront: () => void
  showRight: () => void
  showBack: () => void
  showLeft: () => void
  showTop: () => void
  showBottom: () => void
  getCurrentRotation: () => { x: number; y: number }
  rotateTo: (x: number, y: number) => void
}

const RotatingCube = forwardRef<RotatingCubeRef, RotatingCubeProps>(
  (
    {
      words,
      className = "",
      size = 120,
      draggable = true,
      onDragStart,
      onDragEnd,
      springConfig = { stiffness: 50, damping: 25 }
    },
    ref
  ) => {
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    const springConfig_: SpringOptions = {
      stiffness: springConfig.stiffness,
      damping: springConfig.damping,
      mass: 1
    }

    const rotateX = useSpring(x, springConfig_)
    const rotateY = useSpring(y, springConfig_)

    const isDraggingRef = useRef(false)

    useImperativeHandle(ref, () => ({
      showFront: () => {
        x.set(0)
        y.set(0)
      },
      showRight: () => {
        x.set(0)
        y.set(90)
      },
      showBack: () => {
        x.set(0)
        y.set(180)
      },
      showLeft: () => {
        x.set(0)
        y.set(-90)
      },
      showTop: () => {
        x.set(-90)
        y.set(0)
      },
      showBottom: () => {
        x.set(90)
        y.set(0)
      },
      getCurrentRotation: () => ({
        x: x.get(),
        y: y.get()
      }),
      rotateTo: (newX: number, newY: number) => {
        x.set(newX)
        y.set(newY)
      }
    }))

    // Word placement on faces (opposite faces show the same word)
    const faceWords = {
      front: words[0],   // "Enheter"
      back: words[0],    // "Enheter"
      right: words[1],   // "Bra kast"
      left: words[1],    // "Bra kast"
      top: words[2],     // "Tofflor"
      bottom: words[2]   // "Tofflor"
    }

    const faces = [
      {
        name: "front",
        transform: `translateZ(${size / 2}px)`,
        text: faceWords.front
      },
      {
        name: "back",
        transform: `rotateY(180deg) translateZ(${size / 2}px)`,
        text: faceWords.back
      },
      {
        name: "right",
        transform: `rotateY(90deg) translateZ(${size / 2}px)`,
        text: faceWords.right
      },
      {
        name: "left",
        transform: `rotateY(-90deg) translateZ(${size / 2}px)`,
        text: faceWords.left
      },
      {
        name: "top",
        transform: `rotateX(90deg) translateZ(${size / 2}px)`,
        text: faceWords.top
      },
      {
        name: "bottom",
        transform: `rotateX(-90deg) translateZ(${size / 2}px)`,
        text: faceWords.bottom
      }
    ]

    const handleDragStart = () => {
      isDraggingRef.current = true
      onDragStart?.()
    }

    const handleDragEnd = () => {
      isDraggingRef.current = false
      onDragEnd?.()
    }

    return (
      <div
        style={{
          perspective: "1000px",
          width: size,
          height: size
        }}
        className="inline-block"
      >
        <motion.div
          drag={draggable}
          dragElastic={0}
          dragMomentum={false}
          dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
          whileTap={{ cursor: "grabbing" }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{
            width: size,
            height: size,
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
            cursor: draggable ? "grab" : "default",
            x: 0,
            y: 0
          }}
          onDrag={(_, info) => {
            if (isDraggingRef.current) {
              const newX = x.get() + info.delta.y * 0.5
              const newY = y.get() + info.delta.x * 0.5
              x.set(newX)
              y.set(newY)
            }
          }}
        >
          {faces.map((face) => (
            <div
              key={face.name}
              style={{
                position: "absolute",
                width: size,
                height: size,
                transform: face.transform,
                backfaceVisibility: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              } as CSSProperties}
              className={cn(
                "select-none pointer-events-none",
                className
              )}
            >
              {face.text}
            </div>
          ))}
        </motion.div>
      </div>
    )
  }
)

RotatingCube.displayName = "RotatingCube"

export default RotatingCube
