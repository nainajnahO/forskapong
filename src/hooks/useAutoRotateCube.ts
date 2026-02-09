import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import type { RotatingCubeRef } from "@/components/common/RotatingCube"

export function useAutoRotateCube(
  _words: readonly string[]
): {
  cubeRef: RefObject<RotatingCubeRef | null>
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
} {
  const cubeRef = useRef<RotatingCubeRef>(null)
  const [isDragging, setIsDragging] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const velocityRef = useRef({ x: 0, y: 0 })
  const lastTimeRef = useRef<number>(0)

  // Initialize random rotation velocity
  useEffect(() => {
    // Random velocity between 10-30 degrees per second
    const randomSpeed = () => (Math.random() * 20 + 10) * (Math.random() > 0.5 ? 1 : -1)
    velocityRef.current = {
      x: randomSpeed(),
      y: randomSpeed()
    }
    lastTimeRef.current = Date.now()
  }, [])

  useEffect(() => {
    // Don't auto-rotate if dragging or tab is hidden
    if (isDragging || document.hidden) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    const animate = () => {
      const now = Date.now()
      const deltaTime = (now - lastTimeRef.current) / 1000 // Convert to seconds
      lastTimeRef.current = now

      if (cubeRef.current) {
        const current = cubeRef.current.getCurrentRotation()
        const newX = current.x + velocityRef.current.x * deltaTime
        const newY = current.y + velocityRef.current.y * deltaTime
        cubeRef.current.rotateTo(newX, newY)
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isDragging])

  // Pause/resume on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        lastTimeRef.current = Date.now() // Reset time to prevent jump
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return {
    cubeRef,
    isDragging,
    setIsDragging
  }
}
