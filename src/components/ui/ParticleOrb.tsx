import { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 1500;
const SPHERE_RADIUS = 1.0;
const PULSE_AMPLITUDE = 0.08;
const PULSE_SPEED = 1.5;
const AUTO_ROTATE_SPEED = 0.15;
const GOLDEN_ANGLE = Math.PI * (1 + Math.sqrt(5));

const RIPPLE_SPEED = 3.0;
const RIPPLE_AMPLITUDE = 0.25;
const RIPPLE_WIDTH = 0.6;
const RIPPLE_DURATION = 1.5;

const INFLATE_AMOUNT = 0.12;
const INFLATE_ATTACK = 8;
const INFLATE_DECAY = 0.6;

const MAX_RIPPLES = 8;

const GLOW_AMOUNT = 0.4;
const GLOW_ATTACK = 8;
const GLOW_DECAY = 0.8;

const DIVE_CLICKS = 3;
const DIVE_CLICK_WINDOW = 1.5;
const DIVE_DURATION = 2.5;
const DIVE_TARGET_Z = 1;
const DIVE_RETURN_DELAY = 0.8;

interface Ripple {
  readonly origin: THREE.Vector3;
  readonly startTime: number;
}

interface ParticleOrbProps {
  onDiveChange?: (diving: boolean) => void;
  onGlowUpdate?: (intensity: number) => void;
}

export default function ParticleOrb({ onDiveChange, onGlowUpdate }: ParticleOrbProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const hitSphereRef = useRef<THREE.Mesh>(null);
  const inflateRef = useRef(0);
  const inflateTargetRef = useRef(0);
  const glowValueRef = useRef(0);
  const glowTargetRef = useRef(0);
  const clickTimesRef = useRef<number[]>([]);
  const diveRef = useRef<{ startTime: number; startPos: THREE.Vector3 } | null>(null);
  const divePendingRef = useRef(false);
  const clock = useThree((s) => s.clock);

  const { geometry, basePositions } = useMemo(() => {
    const base = new Float32Array(PARTICLE_COUNT * 3);
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / PARTICLE_COUNT);
      const theta = GOLDEN_ANGLE * i;

      const x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = SPHERE_RADIUS * Math.cos(phi);

      base[i * 3] = x;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = z;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      sizes[i] = 2.0 + ((i * 7919) % 1500) / 1000;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return { geometry: geo, basePositions: base };
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (diveRef.current) return;

      const point = e.point;
      const points = pointsRef.current;
      if (!points) return;
      const local = points.worldToLocal(point.clone()).normalize();
      const ripples = ripplesRef.current;
      ripples.push({ origin: local, startTime: clock.elapsedTime });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
      inflateTargetRef.current += INFLATE_AMOUNT;
      glowTargetRef.current += GLOW_AMOUNT;

      // Track clicks for dive trigger
      const now = clock.elapsedTime;
      const clicks = clickTimesRef.current;
      clicks.push(now);
      // Keep only clicks within the time window
      while (clicks.length > 0 && now - clicks[0] > DIVE_CLICK_WINDOW) {
        clicks.shift();
      }
      if (clicks.length >= DIVE_CLICKS) {
        clicks.length = 0;
        divePendingRef.current = true;
        onDiveChange?.(true);
      }
    },
    [clock, onDiveChange],
  );

  useFrame(({ clock, camera }, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const posAttr = points.geometry.attributes.position;
    const positions = posAttr.array as Float32Array;
    const t = clock.elapsedTime;

    // Initialize dive if pending
    if (divePendingRef.current) {
      diveRef.current = { startTime: t, startPos: camera.position.clone() };
      divePendingRef.current = false;
    }

    // Inflate spring: rush toward target, then decay target back to 0
    inflateTargetRef.current *= 1 - INFLATE_DECAY * delta;
    if (inflateTargetRef.current < 0.001) inflateTargetRef.current = 0;
    inflateRef.current += (inflateTargetRef.current - inflateRef.current) * (1 - Math.exp(-INFLATE_ATTACK * delta));
    const inflate = inflateRef.current;

    // Glow spring: same pattern as inflate
    glowTargetRef.current *= 1 - GLOW_DECAY * delta;
    if (glowTargetRef.current < 0.001) glowTargetRef.current = 0;
    glowValueRef.current += (glowTargetRef.current - glowValueRef.current) * (1 - Math.exp(-GLOW_ATTACK * delta));
    onGlowUpdate?.(Math.min(glowValueRef.current, 1));

    // Prune expired ripples from the front (oldest first)
    const ripples = ripplesRef.current;
    while (ripples.length > 0 && t - ripples[0].startTime >= RIPPLE_DURATION) {
      ripples.shift();
    }
    const rippleCount = ripples.length;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      const bz = basePositions[i * 3 + 2];
      const len = Math.sqrt(bx * bx + by * by + bz * bz);
      const nx = bx / len;
      const ny = by / len;
      const nz = bz / len;

      const phase = i * 0.004;
      let radialOffset = Math.sin(t * PULSE_SPEED + phase) * PULSE_AMPLITUDE + inflate;

      // Sum all active ripples
      for (let r = 0; r < rippleCount; r++) {
        const ripple = ripples[r];
        const elapsed = t - ripple.startTime;

        const dot = nx * ripple.origin.x + ny * ripple.origin.y + nz * ripple.origin.z;
        const angularDist = Math.acos(Math.min(1, Math.max(-1, dot)));

        const wavefront = elapsed * RIPPLE_SPEED;
        const distToWave = Math.abs(angularDist - wavefront);

        if (distToWave < RIPPLE_WIDTH) {
          const envelope = 1 - distToWave / RIPPLE_WIDTH;
          const fade = 1 - elapsed / RIPPLE_DURATION;
          radialOffset += envelope * fade * RIPPLE_AMPLITUDE;
        }
      }

      positions[i * 3] = bx + nx * radialOffset;
      positions[i * 3 + 1] = by + ny * radialOffset;
      positions[i * 3 + 2] = bz + nz * radialOffset;
    }

    posAttr.needsUpdate = true;
    points.rotation.y += delta * AUTO_ROTATE_SPEED;

    // Camera dive animation
    const dive = diveRef.current;
    if (dive) {
      const elapsed = t - dive.startTime;
      const totalDuration = DIVE_DURATION + DIVE_RETURN_DELAY + DIVE_DURATION;
      const { startPos } = dive;
      // Dive target: the orb center (origin), offset along the camera's original direction
      const dir = startPos.clone().normalize();
      const targetPos = dir.multiplyScalar(DIVE_TARGET_Z);

      if (elapsed < DIVE_DURATION) {
        // Phase 1: dive in — ease-in-out
        const p = elapsed / DIVE_DURATION;
        const ease = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        camera.position.lerpVectors(startPos, targetPos, ease);
      } else if (elapsed < DIVE_DURATION + DIVE_RETURN_DELAY) {
        // Phase 2: hold inside
        camera.position.copy(targetPos);
      } else if (elapsed < totalDuration) {
        // Phase 3: pull back out — ease-in-out
        const p = (elapsed - DIVE_DURATION - DIVE_RETURN_DELAY) / DIVE_DURATION;
        const ease = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        camera.position.lerpVectors(targetPos, startPos, ease);
      } else {
        // Done
        camera.position.copy(startPos);
        diveRef.current = null;
        onDiveChange?.(false);
      }
    }
  });

  return (
    <group>
      {/* Invisible sphere for raycasting clicks */}
      <mesh ref={hitSphereRef} onClick={handleClick}>
        <sphereGeometry args={[SPHERE_RADIUS * 1.1, 32, 32]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          size={0.02}
          color="#e4e4e7"
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
