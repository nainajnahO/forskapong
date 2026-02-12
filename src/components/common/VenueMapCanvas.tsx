import { useRef, useEffect, useState, useCallback } from 'react'
import Map, { Marker } from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
import { useMotionValueEvent } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { VENUE_MAP_CONFIG } from '@/lib/constants'
import 'mapbox-gl/dist/mapbox-gl.css'

// ── DEBUG MODE ──────────────────────────────────────────────
// Set to true to enable interactive map + "T" to record waypoints.
// Set back to false when done tuning.
const DEBUG_MODE = false
// ────────────────────────────────────────────────────────────

const { cameraWaypoints, mapStyle, venue } = VENUE_MAP_CONFIG

interface Waypoint {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

// Cubic B-spline: approximates control points for maximum smoothness
// (doesn't pass through each point exactly — trades precision for buttery curves)
function bspline(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return (
    ((1 - t) * (1 - t) * (1 - t) * p0 +
      (3 * t3 - 6 * t2 + 4) * p1 +
      (-3 * t3 + 3 * t2 + 3 * t + 1) * p2 +
      t3 * p3) / 6
  )
}

// Unwrap bearing so transitions take the shortest angular path
function unwrapBearing(bearings: number[]) {
  const out = [bearings[0]]
  for (let i = 1; i < bearings.length; i++) {
    let diff = bearings[i] - out[i - 1]
    while (diff > 180) diff -= 360
    while (diff < -180) diff += 360
    out.push(out[i - 1] + diff)
  }
  return out
}

// Clamp by repeating first/last points so the spline starts and ends exactly there
const padded = [
  cameraWaypoints[0], cameraWaypoints[0],
  ...cameraWaypoints,
  cameraWaypoints[cameraWaypoints.length - 1], cameraWaypoints[cameraWaypoints.length - 1],
]
const paddedBearings = unwrapBearing(padded.map(w => w.bearing))

function interpolateWaypoints(progress: number) {
  const n = padded.length
  const segments = n - 3
  const u = Math.max(0, Math.min(1, progress)) * segments
  const seg = Math.min(Math.floor(u), segments - 1)
  const t = u - seg

  const i0 = seg
  const i1 = seg + 1
  const i2 = seg + 2
  const i3 = seg + 3

  const w0 = padded[i0]
  const w1 = padded[i1]
  const w2 = padded[i2]
  const w3 = padded[i3]

  return {
    center: [
      bspline(w0.center[0], w1.center[0], w2.center[0], w3.center[0], t),
      bspline(w0.center[1], w1.center[1], w2.center[1], w3.center[1], t),
    ] as [number, number],
    zoom: bspline(w0.zoom, w1.zoom, w2.zoom, w3.zoom, t),
    pitch: bspline(w0.pitch, w1.pitch, w2.pitch, w3.pitch, t),
    bearing: bspline(paddedBearings[i0], paddedBearings[i1], paddedBearings[i2], paddedBearings[i3], t),
  }
}

interface VenueMapCanvasProps {
  scrollYProgress: MotionValue<number>
  isVisible?: boolean
}

export default function VenueMapCanvas({ scrollYProgress, isVisible = true }: VenueMapCanvasProps) {
  const mapRef = useRef<MapRef>(null)
  const progressRef = useRef(0)
  const lastProgressRef = useRef<number>(-1)
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progressRef.current = v
  })

  // Normal scroll-driven camera (disabled in debug mode)
  useEffect(() => {
    if (DEBUG_MODE) return
    if (!isVisible) return

    let rafId: number
    const loop = () => {
      const map = mapRef.current?.getMap()
      const progress = progressRef.current
      if (map && Math.abs(progress - lastProgressRef.current) > 0.0001) {
        lastProgressRef.current = progress
        const { center, zoom, pitch, bearing } = interpolateWaypoints(progress)
        map.jumpTo({ center, zoom, pitch, bearing })
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [isVisible])

  // Debug: press T to snapshot, C to copy, R to reset
  const captureWaypoint = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const c = map.getCenter()
    const wp: Waypoint = {
      center: [parseFloat(c.lng.toFixed(6)), parseFloat(c.lat.toFixed(6))],
      zoom: parseFloat(map.getZoom().toFixed(1)),
      pitch: parseFloat(map.getPitch().toFixed(0)),
      bearing: parseFloat(map.getBearing().toFixed(0)),
    }
    setWaypoints(prev => {
      const next = [...prev, wp]
      console.log(`[waypoint ${next.length}]`, wp)
      return next
    })
  }, [])

  const copyWaypoints = useCallback(() => {
    if (waypoints.length === 0) return
    const lines = waypoints.map((wp, i) => {
      const progress = waypoints.length === 1 ? 0 : parseFloat((i / (waypoints.length - 1)).toFixed(2))
      return `    { progress: ${progress}, center: [${wp.center[0]}, ${wp.center[1]}] as const, zoom: ${wp.zoom}, pitch: ${wp.pitch}, bearing: ${wp.bearing} },`
    })
    const output = `cameraWaypoints: [\n${lines.join('\n')}\n],`
    navigator.clipboard.writeText(output)
    console.log('\n✅ Copied to clipboard:\n' + output + '\n')
  }, [waypoints])

  const resetWaypoints = useCallback(() => {
    setWaypoints([])
    console.log('🗑️ Waypoints cleared')
  }, [])

  useEffect(() => {
    if (!DEBUG_MODE) return
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 't' || e.key === 'T') captureWaypoint()
      if (e.key === 'c' || e.key === 'C') copyWaypoints()
      if (e.key === 'r' || e.key === 'R') resetWaypoints()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [captureWaypoint, copyWaypoints, resetWaypoints])

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

  const initialCamera = {
    longitude: cameraWaypoints[0].center[0],
    latitude: cameraWaypoints[0].center[1],
    zoom: cameraWaypoints[0].zoom,
    pitch: cameraWaypoints[0].pitch,
    bearing: cameraWaypoints[0].bearing,
  }

  return (
    <>
      <Map
        ref={mapRef}
        initialViewState={initialCamera}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        mapStyle={mapStyle}
        interactive={DEBUG_MODE}
        style={{ width: '100%', height: '100%' }}
        onLoad={handleLoad}
      >
        <Marker longitude={venue.lng} latitude={venue.lat} anchor="bottom">
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z"
              fill="#e4e4e7"
            />
            <circle cx="16" cy="14" r="6" fill="#27272a" />
          </svg>
        </Marker>
      </Map>

      {DEBUG_MODE && (
        <div className="absolute top-4 left-4 z-50 bg-black/80 text-white text-xs font-mono p-3 rounded-lg backdrop-blur-sm max-w-xs">
          <div className="text-yellow-400 font-bold mb-1">DEBUG MODE</div>
          <div>T = record waypoint</div>
          <div>C = copy all to clipboard</div>
          <div>R = reset waypoints</div>
          <div className="mt-2 text-zinc-400">
            Drag to pan, right-drag to rotate/pitch, scroll to zoom
          </div>
          <div className="mt-2 text-green-400">
            {waypoints.length} waypoint{waypoints.length !== 1 && 's'} recorded
          </div>
          {waypoints.length > 0 && (
            <div className="mt-1 max-h-32 overflow-y-auto text-zinc-500">
              {waypoints.map((wp, i) => (
                <div key={i}>
                  #{i + 1}: [{wp.center[0]}, {wp.center[1]}] z{wp.zoom} p{wp.pitch} b{wp.bearing}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
