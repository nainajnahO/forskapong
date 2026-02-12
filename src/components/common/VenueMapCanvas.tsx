import { useRef, useCallback } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import { useMotionValueEvent } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { VENUE_MAP_CONFIG } from '@/lib/constants';
import 'mapbox-gl/dist/mapbox-gl.css';

const { cameraWaypoints, mapStyle, venue } = VENUE_MAP_CONFIG;

// Cubic B-spline: approximates control points for maximum smoothness
// (doesn't pass through each point exactly — trades precision for buttery curves)
function bspline(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    ((1 - t) * (1 - t) * (1 - t) * p0 +
      (3 * t3 - 6 * t2 + 4) * p1 +
      (-3 * t3 + 3 * t2 + 3 * t + 1) * p2 +
      t3 * p3) /
    6
  );
}

// Unwrap bearing so transitions take the shortest angular path
function unwrapBearing(bearings: number[]) {
  const out = [bearings[0]];
  for (let i = 1; i < bearings.length; i++) {
    let diff = bearings[i] - out[i - 1];
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    out.push(out[i - 1] + diff);
  }
  return out;
}

// Clamp by repeating first/last points so the spline starts and ends exactly there
const padded = [
  cameraWaypoints[0],
  cameraWaypoints[0],
  ...cameraWaypoints,
  cameraWaypoints[cameraWaypoints.length - 1],
  cameraWaypoints[cameraWaypoints.length - 1],
];
const paddedBearings = unwrapBearing(padded.map((w) => w.bearing));

function interpolateWaypoints(progress: number) {
  const n = padded.length;
  const segments = n - 3;
  const u = Math.max(0, Math.min(1, progress)) * segments;
  const seg = Math.min(Math.floor(u), segments - 1);
  const t = u - seg;

  const i0 = seg;
  const i1 = seg + 1;
  const i2 = seg + 2;
  const i3 = seg + 3;

  const w0 = padded[i0];
  const w1 = padded[i1];
  const w2 = padded[i2];
  const w3 = padded[i3];

  return {
    center: [
      bspline(w0.center[0], w1.center[0], w2.center[0], w3.center[0], t),
      bspline(w0.center[1], w1.center[1], w2.center[1], w3.center[1], t),
    ] as [number, number],
    zoom: bspline(w0.zoom, w1.zoom, w2.zoom, w3.zoom, t),
    pitch: bspline(w0.pitch, w1.pitch, w2.pitch, w3.pitch, t),
    bearing: bspline(
      paddedBearings[i0],
      paddedBearings[i1],
      paddedBearings[i2],
      paddedBearings[i3],
      t,
    ),
  };
}

interface VenueMapCanvasProps {
  scrollYProgress: MotionValue<number>;
  isVisible?: boolean;
}

export default function VenueMapCanvas({ scrollYProgress, isVisible = true }: VenueMapCanvasProps) {
  const mapRef = useRef<MapRef>(null);

  // Event-driven camera: only runs when scroll value actually changes
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (!isVisible) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const { center, zoom, pitch, bearing } = interpolateWaypoints(v);
    map.jumpTo({ center, zoom, pitch, bearing });
  });

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const layers = map.getStyle().layers;
    if (!layers) return;

    // Find the first symbol layer to insert buildings below labels
    let labelLayerId: string | undefined;
    for (const layer of layers) {
      if (
        layer.type === 'symbol' &&
        (layer as { layout?: { 'text-field'?: unknown } }).layout?.['text-field']
      ) {
        labelLayerId = layer.id;
        break;
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
    );
  }, []);

  const initialCamera = {
    longitude: cameraWaypoints[0].center[0],
    latitude: cameraWaypoints[0].center[1],
    zoom: cameraWaypoints[0].zoom,
    pitch: cameraWaypoints[0].pitch,
    bearing: cameraWaypoints[0].bearing,
  };

  return (
    <Map
      ref={mapRef}
      initialViewState={initialCamera}
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      mapStyle={mapStyle}
      interactive={false}
      style={{ width: '100%', height: '100%' }}
      onLoad={handleLoad}
    >
      <Marker longitude={venue.lng} latitude={venue.lat} anchor="bottom">
        <svg
          width="32"
          height="40"
          viewBox="0 0 32 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z"
            fill="#e4e4e7"
          />
          <circle cx="16" cy="14" r="6" fill="#27272a" />
        </svg>
      </Marker>
    </Map>
  );
}
