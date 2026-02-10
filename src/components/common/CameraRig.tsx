import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SHOWCASE_CONFIG } from '@/lib/constants'

interface CameraRigProps {
  scrollProgress: React.RefObject<number>
}

const waypoints = SHOWCASE_CONFIG.cameraWaypoints
const tmpPos = new THREE.Vector3()
const tmpLook = new THREE.Vector3()

function lerpWaypoints(progress: number) {
  // Find the two waypoints we're between
  let i = 0
  for (; i < waypoints.length - 1; i++) {
    if (progress <= waypoints[i + 1].progress) break
  }
  i = Math.min(i, waypoints.length - 2)

  const a = waypoints[i]
  const b = waypoints[i + 1]
  const range = b.progress - a.progress
  const t = range === 0 ? 1 : Math.max(0, Math.min(1, (progress - a.progress) / range))

  // Smooth step for nicer interpolation
  const smooth = t * t * (3 - 2 * t)

  tmpPos.set(
    a.position[0] + (b.position[0] - a.position[0]) * smooth,
    a.position[1] + (b.position[1] - a.position[1]) * smooth,
    a.position[2] + (b.position[2] - a.position[2]) * smooth,
  )

  tmpLook.set(
    a.lookAt[0] + (b.lookAt[0] - a.lookAt[0]) * smooth,
    a.lookAt[1] + (b.lookAt[1] - a.lookAt[1]) * smooth,
    a.lookAt[2] + (b.lookAt[2] - a.lookAt[2]) * smooth,
  )
}

export default function CameraRig({ scrollProgress }: CameraRigProps) {
  const { camera } = useThree()

  useFrame(() => {
    lerpWaypoints(scrollProgress.current)
    camera.position.copy(tmpPos)
    camera.lookAt(tmpLook)
  })

  return null
}
