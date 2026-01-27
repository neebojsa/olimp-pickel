import React from "react"

interface ShapeIconProps {
  shape: string
  size?: number
  className?: string
}

/**
 * 6-layer icons with simple "perspective":
 * - each layer is translated + scaled slightly
 * - back layers are fainter
 * - front layer can be filled (for "solid" shapes)
 *
 * Color controlled via CSS (currentColor).
 */
export function ShapeIcon({ shape, size = 72, className = "" }: ShapeIconProps) {
  const s = shape.toLowerCase()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={shape}
      role="img"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {renderShape(s)}
      </g>
    </svg>
  )
}

/* ──────────────────────────────
   GLOBAL LAYER SETTINGS
────────────────────────────── */

const LAYERS = 4

// BEFORE
// const DX = -2
// const DY = 2

// AFTER – doubled layer spacing
const DX = -4
const DY = 4

// keep this as-is
const SCALE_STEP = 0.03

function layerTransform(depth: number) {
  const s = 1 - depth * SCALE_STEP
  const tx = depth * DX
  const ty = depth * DY

  // scale around center (50,50) + translate
  return `translate(${tx} ${ty}) translate(50 50) scale(${s}) translate(-50 -50)`
}

function layerStrokeOpacity(depth: number) {
  // depth 0 = front (1.0), depth max = back (~0.25)
  const max = LAYERS - 1
  const t = max === 0 ? 0 : depth / max
  return 1 - t * 0.75
}

function Layers({
  children,
}: {
  children: (opts: { depth: number; isFront: boolean; opacity: number; transform: string }) => React.ReactNode
}) {
  // Draw back -> front so front is on top
  const items: React.ReactNode[] = []
  for (let depth = LAYERS - 1; depth >= 0; depth--) {
    const isFront = depth === 0
    const opacity = layerStrokeOpacity(depth)
    const transform = layerTransform(depth)
    items.push(children({ depth, isFront, opacity, transform }))
  }
  return <>{items}</>
}

/* ──────────────────────────────
   SHAPE ROUTER
────────────────────────────── */

function renderShape(s: string) {
  if (s.includes("round bar")) return <RoundBar />
  if (s.includes("round tube")) return <RoundTube />

  if (s.includes("square bar")) return <SquareBar />
  if (s.includes("square tube")) return <SquareTube />

  if (s.includes("rectangular bar")) return <RectangularBar />
  if (s.includes("rectangular tube")) return <RectangularTube />

  if (s.includes("hex")) return <HexBar />

  if (s.includes("sheet") || s.includes("plate")) return <Sheet />

  if (s.includes("angle")) return <Angle />

  if (s.includes("upn") || s.includes("channel")) return <Channel />

  if (s.includes("beam") || s.includes("hea") || s.includes("heb") || s.includes("ipe")) return <Beam />

  return <SquareBar />
}

/* ──────────────────────────────
   ICONS (now all 6-layer)
────────────────────────────── */

function RoundBar() {
  return (
    <Layers>
      {({ isFront, opacity, transform }) => (
        <g transform={transform} strokeOpacity={opacity}>
          <circle
            cx="44"
            cy="56"
            r="16"
            fill={isFront ? "currentColor" : "none"}
            stroke="currentColor"
          />
        </g>
      )}
    </Layers>
  )
}

function RoundTube() {
  return (
    <Layers>
      {({ opacity, transform }) => (
        <g transform={transform} strokeOpacity={opacity}>
          <circle cx="44" cy="56" r="16" />
        </g>
      )}
    </Layers>
  )
}

function SquareBar() {
  return (
    <Layers>
      {({ isFront, opacity, transform }) => (
        <g transform={transform} strokeOpacity={opacity}>
          <rect
            x="26"
            y="40"
            width="32"
            height="32"
            rx="6"
            fill={isFront ? "currentColor" : "none"}
            stroke="currentColor"
          />
        </g>
      )}
    </Layers>
  )
}

function SquareTube() {
  return (
    <Layers>
      {({ opacity, transform }) => (
        <g transform={transform} strokeOpacity={opacity}>
          <rect x="26" y="40" width="32" height="32" rx="6" />
        </g>
      )}
    </Layers>
  )
}

function RectangularTube() {
  return (
    <Layers>
      {({ opacity, transform }) => (
        <g transform={transform} strokeOpacity={opacity}>
          <rect x="22" y="40" width="60" height="30" rx="6" />
        </g>
      )}
    </Layers>
  )
}

function RectangularBar() {
  return (
    <Layers>
      {({ isFront, opacity, transform }) => (
        <g transform={transform} strokeOpacity={opacity}>
          <rect
            x="22"
            y="40"
            width="60"
            height="30"
            rx="6"
            fill={isFront ? "currentColor" : "none"}
            stroke="currentColor"
          />
        </g>
      )}
    </Layers>
  )
}

function HexBar() {
  const pts = "42 38 58 48 58 68 42 78 26 68 26 48"
  return (
    <Layers>
      {({ isFront, opacity, transform }) => (
        <g transform={transform} strokeOpacity={opacity}>
          <polygon
            points={pts}
            fill={isFront ? "currentColor" : "none"}
            stroke="currentColor"
          />
        </g>
      )}
    </Layers>
  )
}

function Sheet() {
  // Top-facing "solid bar" (parallelogram), not hollow.
  // Front layer is filled like RectangularBar; back layers are outlines.
  const pts = "24 38 76 28 88 50 36 60" // solid top plate silhouette

  return (
    <Layers>
      {({ isFront, opacity, transform }) => (
        <g transform={transform} strokeOpacity={opacity}>
          <polygon
            points={pts}
            fill={isFront ? "currentColor" : "none"}
            stroke="currentColor"
          />

          {/* subtle edge hint only on the front layer (reads as thickness/face) */}
          {isFront && (
            <path
              d="M36 60 L88 50"
              stroke="currentColor"
              strokeOpacity={0.35}
            />
          )}
        </g>
      )}
    </Layers>
  )
}

function Angle() {
  // Two-line uppercase "L" shape, now layered with perspective
  const d = "M30 42 V78 H54"
  return (
    <Layers>
      {({ opacity, transform }) => (
        <g transform={transform} strokeOpacity={opacity}>
          <path d={d} />
        </g>
      )}
    </Layers>
  )
}

function Channel() {
  // base:sides = 2:1 (same geometry you approved), now layered
  const side = "M28 42 V66"
  const right = "M76 66 V42"
  const base = "M28 66 H76"

  return (
    <Layers>
      {({ opacity, transform }) => (
        <g transform={transform} strokeOpacity={opacity}>
          <path d={side} />
          <path d={right} />
          <path d={base} />
        </g>
      )}
    </Layers>
  )
}

function Beam() {
  // Slimmer beam front (filled), with lighter outline layers behind
  const outlineD = "M30 34 H70 M50 34 V74 M30 74 H70"

  return (
    <Layers>
      {({ isFront, opacity, transform }) => (
        <g transform={transform} strokeOpacity={opacity}>
          {!isFront ? (
            // Back layers: simple outline (lighter)
            <path d={outlineD} />
          ) : (
            // Front layer: slim filled beam
            <g fill="currentColor" stroke="currentColor">
              <rect x="24" y="44" width="40" height="6" rx="2" />
              <rect x="47" y="50" width="4" height="20" rx="2" />
              <rect x="24" y="70" width="40" height="6" rx="2" />
            </g>
          )}
        </g>
      )}
    </Layers>
  )
}
