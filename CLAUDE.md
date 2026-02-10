# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Forskåpong is a React single-page application for a beer pong tournament in Uppsala, Sweden. All user-facing text is in Swedish.

## Development Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # TypeScript check + Vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

No testing framework is configured.

## Architecture

**Single Page App**: `App.tsx` composes sections in order: Navbar → Hero → ExplodedView → About → ScheduleElegant → Sponsors → Tickets → Footer. Each section receives an `id` prop for anchor navigation.

**Path Alias**: `@/` → `./src/` (configured in both `tsconfig.json` and `vite.config.ts`). Always use this alias.

**Constants**: All event data, schedule, navigation links, and text content lives in `src/lib/constants.ts`. Update this file to change content — not the components.

**Barrel Exports**: Common components are re-exported from `src/components/index.ts` (Card, Container, SectionLabel, SectionHeader, MediaBetweenText).

**Types**: Shared TypeScript interfaces live in `src/types/index.ts` (schedule, navigation, attendee, 3D showcase types).

**Design Tokens**: `src/lib/design-tokens.ts` exports a `COLORS` object with semantic Tailwind class mappings (text.primary, text.secondary, border.default).

### Theme System

The theme system has two layers that coexist:

1. **CSS Variables** (`index.css`): `:root` defines dark theme variables, `.light` class overrides them. Note: this is inverted from typical Tailwind dark mode — the *default* (no class) is dark, and the `light` class activates light mode.

2. **Theme utility functions** (`src/lib/theme-utils.ts`): `themeBorder()`, `themeText()`, `themeBg()`, `themeLine()`, `themeGradientLine()` — these take a `theme` parameter and return explicit zinc-* classes for each mode. Use these when you need theme-aware classes that go beyond the CSS variable system.

Access the current theme via `useTheme()` from `@/contexts/ThemeContext` (returns `{ theme, toggleTheme }`). Theme persists to localStorage.

### Styling Conventions

- `cn()` from `@/lib/utils` for conditional class merging (clsx + tailwind-merge)
- Color palette: use `zinc-*` (not `gray-*`) throughout
- Section padding: use `SECTION_PADDING` constant from `@/lib/constants` (`py-16 md:py-24`)
- Fonts: `font-display` (Irish Grover) for headings, `font-sans` (Inter) for body
- Animations: Framer Motion via `motion` from `motion/react`

### ExplodedView 3D Section

The most complex section — a scroll-driven 3D camera journey with text overlays. Key files:

- `ExplodedView.tsx` — Outer section: tall scrollable div (`scrollPages * 100vh`) with a `sticky` viewport. Sets up snap points from camera waypoints.
- `ExplodedViewCanvas.tsx` — R3F `<Canvas>` with lighting, environment, model, and camera rig.
- `CameraRig.tsx` — Reads `scrollProgress` ref in `useFrame` to interpolate camera between waypoints using **smoothstep easing**.
- `BeerPongModel.tsx` — Loads the `.glb` model via drei's `useGLTF`.
- `ExplodedViewAnnotations.tsx` — HTML overlay with scroll-driven opacity/position via Framer Motion `useTransform`.
- `useExplodedViewScroll.ts` — Single `useScroll` hook that bridges Framer Motion `scrollYProgress` to a plain ref for R3F's render loop. This is the glue between the two animation systems.

The ref-based bridge is necessary because R3F's `useFrame` runs outside React's render cycle and can't consume MotionValues directly.

## Tech Stack

- React 19, Vite 7, TypeScript, Tailwind CSS 3.4 (with tailwindcss-animate plugin)
- Framer Motion (`motion` package), lucide-react for icons
- React Three Fiber (`@react-three/fiber`), drei (`@react-three/drei`), Three.js — used for the ExplodedView 3D section
- Package manager: npm

## Known Gotchas

- **motion.create()**: Do NOT use `motion.create()` inside render — it triggers `react-hooks/static-components` lint error. Use `motion.div`, `motion.p`, etc. directly.
- **Pre-existing lint errors**: ThemeContext, useAutoRotateCube, and useScreenSize have pre-existing lint warnings. Don't try to fix these unless specifically asked.
- **Schedule.tsx is deleted**: Only `ScheduleElegant.tsx` exists (supports a `variant` prop). Don't recreate Schedule.tsx.
- **MediaBetweenText API**: Uses `variant` prop ("hover" | "scroll" | "controlled"), `videoConfig` object for video props, `animationConfig` object for animation customization. It's a `forwardRef` component with imperative `animate()`/`reset()` methods.

## ExplodedView Annotation Timing — What Was Tried and Failed

The ExplodedView section has scroll-driven text annotations overlaid on a 3D camera journey. Getting the text to appear at the right time relative to the camera has been an ongoing challenge. Here's what was tried:

### Current architecture
- Single `useScroll` → shared `scrollYProgress` MotionValue feeds both the 3D camera (via `progressRef` in `useFrame`) and the HTML annotations (via `useTransform`).
- Camera uses **smoothstep easing** (`t * t * (3 - 2 * t)`) to interpolate between waypoints.
- Annotations use **linear** `useTransform` opacity mapping with `scrollRange` from `constants.ts`.
- Snap points are derived from **camera waypoint progress values** (not from `scrollRange`).

### Approaches that failed

1. **Multiple `useScroll` instances** — Each annotation had its own `useScroll({ target, offset })`. Despite identical config, different instances produced slightly different progress values. Calibration values from one instance didn't match what another instance saw.

2. **Calibration HUD without snap active** — Built an A/B key calibration tool to mark where each annotation should appear. Calibrated with `scroll-snap` disabled for smooth scrolling, but in production snap changes scroll physics. Values calibrated without snap were wrong with snap active.

3. **Calibrate with snap active + snap points derived from `scrollRange`** — Circular dependency: changing `scrollRange` moved the snap points, which changed scroll physics, which invalidated the calibration. The system chased itself.

4. **JS scroll detents (wheel event absorption)** — Intercepted wheel events at checkpoint zones, absorbed ~400px of delta before releasing. Fast trackpad scrolling jumped right over catch zones. Added crossing-detection but complexity grew unmanageable.

5. **Wheel-event scroll jacking** — Replaced tall-section + sticky with wheel interception to "lock" the page. Broke Framer Motion `useScroll` integration and caused unnecessary re-renders. Abandoned and reverted.

6. **Smoothstep-adjusted `scrollRange` values** — Mathematically compensated for the easing mismatch (camera uses smoothstep, annotations use linear). Proposed out-of-bounds values like `[-0.10, 0.18]`. Applied but caused a black page due to missing `<Suspense>` around async R3F components. After fixing Suspense, the timing result was not verified as correct.

### Root cause (unresolved)
The camera's **smoothstep easing** and the annotations' **linear `useTransform`** are fundamentally out of sync. At any given `scrollYProgress`, the camera has already eased further toward its target than the linear annotation opacity predicts. For example, at progress 0.275, the camera is 93% at its target waypoint but the annotation is only at 55% opacity. Fixing this requires either:
- Making annotation opacity follow the same smoothstep curve as the camera
- Making the camera use linear interpolation
- Empirically tuning `scrollRange` values to compensate for the mismatch