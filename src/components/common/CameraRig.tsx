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

  tmpPos.set(
    a.position[0] + (b.position[0] - a.position[0]) * t,
    a.position[1] + (b.position[1] - a.position[1]) * t,
    a.position[2] + (b.position[2] - a.position[2]) * t,
  )

  tmpLook.set(
    a.lookAt[0] + (b.lookAt[0] - a.lookAt[0]) * t,
    a.lookAt[1] + (b.lookAt[1] - a.lookAt[1]) * t,
    a.lookAt[2] + (b.lookAt[2] - a.lookAt[2]) * t,
  )
}

export default function CameraRig({ scrollProgress }: CameraRigProps) {
  const { camera, size } = useThree()

  useFrame(() => {
    lerpWaypoints(scrollProgress.current)
    camera.position.copy(tmpPos)
    camera.lookAt(tmpLook)

    const aspect = size.width / size.height
    const targetFov = aspect < 1 ? 60 : 45
    if ((camera as THREE.PerspectiveCamera).fov !== targetFov) {
      ;(camera as THREE.PerspectiveCamera).fov = targetFov
      camera.updateProjectionMatrix()
    }
  })

  return null
}
