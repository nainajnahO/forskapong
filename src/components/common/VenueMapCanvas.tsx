import { useRef, useEffect } from 'react'
import Map from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
import { useMotionValueEvent } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { VENUE_MAP_CONFIG } from '@/lib/constants'
import 'mapbox-gl/dist/mapbox-gl.css'

const { cameraWaypoints, mapStyle, venue } = VENUE_MAP_CONFIG

function lerpWaypoints(progress: number) {
  let i = 0
  for (; i < cameraWaypoints.length - 1; i++) {
    if (progress <= cameraWaypoints[i + 1].progress) break
  }
  i = Math.min(i, cameraWaypoints.length - 2)

  const a = cameraWaypoints[i]
  const b = cameraWaypoints[i + 1]
  const range = b.progress - a.progress
  const t = range === 0 ? 1 : Math.max(0, Math.min(1, (progress - a.progress) / range))

  return {
    center: [
      a.center[0] + (b.center[0] - a.center[0]) * t,
      a.center[1] + (b.center[1] - a.center[1]) * t,
    ] as [number, number],
    zoom: a.zoom + (b.zoom - a.zoom) * t,
    pitch: a.pitch + (b.pitch - a.pitch) * t,
    bearing: a.bearing + (b.bearing - a.bearing) * t,
  }
}

interface VenueMapCanvasProps {
  scrollYProgress: MotionValue<number>
  isMobile: boolean
}

export default function VenueMapCanvas({ scrollYProgress, isMobile }: VenueMapCanvasProps) {
  const mapRef = useRef<MapRef>(null)
  const progressRef = useRef(0)

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progressRef.current = v
  })

  useEffect(() => {
    if (isMobile) return

    let rafId: number
    const loop = () => {
      const map = mapRef.current?.getMap()
      if (map) {
        const { center, zoom, pitch, bearing } = lerpWaypoints(progressRef.current)
        map.jumpTo({ center, zoom, pitch, bearing })
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [isMobile])

  const handleLoad = () => {
    const map = mapRef.current?.getMap()
    if (!map) return

    const layers = map.getStyle().layers
    if (!layers) return

    // Find the first symbol layer to insert buildings below labels
    let labelLayerId: string | undefined
    for (const layer of layers) {
      if (layer.type === 'symbol' && (layer as { layout?: { 'text-field'?: unknown } }).layout?.['text-field']) {
        labelLayerId = layer.id
        break
      }
    }

    map.addLayer(
      {
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#27272a',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.8,
        },
      },
      labelLayerId,
    )
  }

  const initialCamera = isMobile
    ? { longitude: venue.lng, latitude: venue.lat, zoom: 15.5, pitch: 45, bearing: 0 }
    : {
        longitude: cameraWaypoints[0].center[0],
        latitude: cameraWaypoints[0].center[1],
        zoom: cameraWaypoints[0].zoom,
        pitch: cameraWaypoints[0].pitch,
        bearing: cameraWaypoints[0].bearing,
      }

  return (
    <Map
      ref={mapRef}
      initialViewState={initialCamera}
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      mapStyle={mapStyle}
      interactive={false}
      style={{ width: '100%', height: '100%' }}
      onLoad={handleLoad}
    />
  )
}
