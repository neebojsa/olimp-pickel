import React from "react"

interface ShapeIconProps {
  shape: string
  size?: number
  className?: string
}

export function ShapeIcon({
  shape,
  size = 72,
  className = "",
}: ShapeIconProps) {
  // Center the 100x100 graphic in the 120x120 viewbox
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(10, 10)">
        {renderShape(shape.toLowerCase())}
      </g>
    </svg>
  )
}

function renderShape(s: string) {
  if (s.includes("round bar")) return roundBar()
  if (s.includes("round tube")) return roundTube()

  if (s.includes("square bar")) return squareBar()
  if (s.includes("square tube")) return squareTube()

  if (s.includes("rectangular bar")) return rectBar()
  if (s.includes("rectangular tube")) return rectTube()

  if (s.includes("hex")) return hexBar()

  if (s.includes("sheet") || s.includes("plate")) return sheet()

  if (s.includes("angle")) return angle()

  if (s.includes("upn") || s.includes("channel")) return channel()

  if (
    s.includes("beam") ||
    s.includes("hea") ||
    s.includes("heb") ||
    s.includes("ipe")
  ) {
    return beam()
  }

  // Fallback to square bar if unknown
  return squareBar()
}

/* ──────────────────────────────
   COLOR PALETTES (Based on Image)
────────────────────────────── */

const PALETTE_TEAL = { top: "#70CDE3", front: "#25A8C8", side: "#0081A1", inner: "#006F8A" } // Channel
const PALETTE_GREY = { top: "#E0E4E5", front: "#B0B8B9", side: "#909899", inner: "#757D7E" } // Angle
const PALETTE_BLUE = { top: "#CDE8F5", front: "#8ACDF0", side: "#5FAED6", inner: "#4889AB" } // Sq Tube / Rect Tube
const PALETTE_BEIGE= { top: "#EBE3DE", front: "#CBB6AE", side: "#A8928A", inner: "#8F7A72" } // Sq Bar / Rect Bar
const PALETTE_RED  = { top: "#E8A6B6", front: "#CC7A8E", side: "#A85366", inner: "#8C4050" } // Beam
const PALETTE_ORNG = { top: "#F9D6AC", front: "#F4B575", side: "#D99352", inner: "#BF7A3F" } // Round Bar
const PALETTE_CYAN_GRY = { top: "#CFE3EA", front: "#9BC5D4", side: "#729BAD", inner: "#567A8C" } // Round Tube
const PALETTE_GREEN= { top: "#C6DDB8", front: "#9CC484", side: "#7AA362", inner: "#60854B" } // Hex
const PALETTE_BROWN= { top: "#8D786B", front: "#756054", side: "#5E4B41" } // Sheet

/* ──────────────────────────────
   SHAPE RENDERERS
   (Isometric: Extruding Front-Left to Back-Right)
────────────────────────────── */

function squareBar() {
  const c = PALETTE_BEIGE
  return (
    <>
      {/* Front Face */}
      <path d="M10 40 L40 40 L40 85 L10 85 Z" fill={c.front} />
      {/* Top Face */}
      <path d="M10 40 L40 40 L90 10 L60 10 Z" fill={c.top} />
      {/* Side Face */}
      <path d="M40 40 L90 10 L90 55 L40 85 Z" fill={c.side} />
    </>
  )
}

function squareTube() {
  const c = PALETTE_BLUE
  return (
    <>
      {/* Inner Bottom/Side visible through hole */}
      <path d="M20 80 L35 72 L75 48 L20 48 Z" fill={c.inner} /> 
      
      {/* Front Face (Hollow Frame) */}
      <path 
        d="M10 40 L50 40 L50 80 L10 80 L10 40 Z M20 50 L20 70 L40 70 L40 50 L20 50 Z" 
        fill={c.front} 
        fillRule="evenodd"
      />
      {/* Top Face */}
      <path d="M10 40 L50 40 L90 10 L50 10 Z" fill={c.top} />
      {/* Side Face */}
      <path d="M50 40 L90 10 L90 50 L50 80 Z" fill={c.side} />
    </>
  )
}

function rectBar() {
  const c = PALETTE_BEIGE
  return (
    <>
      <path d="M10 50 L30 50 L30 90 L10 90 Z" fill={c.front} />
      <path d="M10 50 L30 50 L90 15 L70 15 Z" fill={c.top} />
      <path d="M30 50 L90 15 L90 55 L30 90 Z" fill={c.side} />
    </>
  )
}

function rectTube() {
  const c = PALETTE_BLUE
  return (
    <>
      {/* Inner */}
      <path d="M18 80 L25 75 L75 45 L18 45 Z" fill={c.inner} />
      
      {/* Front Frame */}
      <path 
        d="M10 45 L40 45 L40 90 L10 90 L10 45 Z M18 53 L18 82 L32 82 L32 53 L18 53 Z" 
        fill={c.front} 
        fillRule="evenodd" 
      />
      {/* Top */}
      <path d="M10 45 L40 45 L90 15 L60 15 Z" fill={c.top} />
      {/* Side */}
      <path d="M40 45 L90 15 L90 60 L40 90 Z" fill={c.side} />
    </>
  )
}

function roundBar() {
  const c = PALETTE_ORNG
  return (
    <>
      {/* Cylinder Body */}
      <path d="M42 22 L82 22 L82 72 L42 72 Z" transform="rotate(-30 62 47)" fill={c.top} />
      {/* This is a visual trick for iso cylinder side */}
      <path d="M22 68 Q 35 88 58 78 L 98 44 Q 85 24 62 34 Z" fill={c.side} /> 
      
      {/* Front Face (Circle) */}
      <ellipse cx="40" cy="70" rx="20" ry="12" transform="rotate(-30 40 70)" fill={c.front} />
      {/* Top Cap (Circle) */}
      <ellipse cx="80" cy="36" rx="20" ry="12" transform="rotate(-30 80 36)" fill={c.top} />
    </>
  )
}

function roundTube() {
  const c = PALETTE_CYAN_GRY
  return (
    <>
      {/* Outer Body */}
      <path d="M22 68 Q 35 88 58 78 L 98 44 Q 85 24 62 34 Z" fill={c.side} />
      {/* Top Cap (Outer) */}
      <ellipse cx="80" cy="36" rx="20" ry="12" transform="rotate(-30 80 36)" fill={c.top} />
      
      {/* Front Face (Ring) */}
      <path 
        d="M40 70 L40 70" 
        stroke={c.front} 
        strokeWidth="15" // Thick stroke to simulate ring thickness
        strokeLinecap="round"
      />
      <ellipse cx="40" cy="70" rx="20" ry="12" transform="rotate(-30 40 70)" fill={c.front} />
      
      {/* Inner Hole */}
      <ellipse cx="40" cy="70" rx="10" ry="6" transform="rotate(-30 40 70)" fill={c.inner} />
    </>
  )
}

function hexBar() {
  const c = PALETTE_GREEN
  return (
    <>
      {/* Body Faces */}
      {/* Top Right */}
      <path d="M45 35 L75 35 L105 15 L75 15 Z" fill={c.top} />
      {/* Side Right */}
      <path d="M75 35 L105 15 L105 50 L75 70 Z" fill={c.side} />
      {/* Bottom Right */}
      <path d="M45 90 L75 70 L105 50 L75 70 Z" fill={c.inner} />

      {/* Front Hexagon */}
      <path 
        d="M15 62 L15 42 L30 32 L45 42 L45 62 L30 72 Z" 
        transform="translate(0, 5) scale(1.3)"
        fill={c.front} 
      />
      
      {/* Connecting Extrusions manually to fit the front hex scale */}
      <path d="M39 46 L75 15 L95 15 L58 46 Z" fill={c.top} />
      <path d="M58 46 L95 15 L95 45 L58 72 Z" fill={c.side} />
      
    </>
  )
}

function sheet() {
  const c = PALETTE_BROWN
  // Stack of 3 sheets
  return (
    <>
      {/* Sheet 3 (Bottom) */}
      <g transform="translate(10, 10)">
        <path d="M10 70 L60 70 L90 55 L40 55 Z" fill={c.top} />
        <path d="M10 70 L60 70 L60 72 L10 72 Z" fill={c.front} />
        <path d="M60 70 L90 55 L90 57 L60 72 Z" fill={c.side} />
      </g>
      {/* Sheet 2 (Middle) */}
      <g transform="translate(5, 5)">
        <path d="M10 70 L60 70 L90 55 L40 55 Z" fill={c.top} opacity="0.9"/>
        <path d="M10 70 L60 70 L60 72 L10 72 Z" fill={c.front} />
        <path d="M60 70 L90 55 L90 57 L60 72 Z" fill={c.side} />
      </g>
      {/* Sheet 1 (Top) */}
      <g>
        <path d="M10 70 L60 70 L90 55 L40 55 Z" fill="#A4877C" />
        <path d="M10 70 L60 70 L60 72 L10 72 Z" fill="#8D6E63" />
        <path d="M60 70 L90 55 L90 57 L60 72 Z" fill="#5D4037" />
      </g>
    </>
  )
}

function angle() {
  const c = PALETTE_GREY
  return (
    <>
      {/* Inner Side (The inside of the L) */}
      <path d="M25 55 L25 80 L75 50 L75 25 Z" fill={c.inner} />
      <path d="M25 55 L55 55 L95 30 L75 25 Z" fill={c.inner} />

      {/* Top Face */}
      <path d="M10 40 L25 40 L75 10 L60 10 Z" fill={c.top} />
      
      {/* Front Face (L Shape) */}
      <path d="M10 40 L25 40 L25 85 L55 85 L55 100 L10 100 Z" fill={c.front} />
      
      {/* Side Face (Bottom leg side) */}
      <path d="M55 85 L95 55 L95 70 L55 100 Z" fill={c.side} />
      {/* Side Face (Top leg back) */}
      <path d="M25 40 L75 10 L75 25 L25 55 Z" fill={c.side} opacity="0.6" />
    </>
  )
}

function channel() {
  const c = PALETTE_TEAL
  return (
    <>
      {/* UPN Geometry */}
      
      {/* Inner Bottom */}
      <path d="M25 80 L45 80 L95 50 L75 50 Z" fill={c.inner} />
      {/* Inner Left Wall */}
      <path d="M25 45 L25 80 L75 50 L75 15 Z" fill={c.side} />

      {/* Top Left Leg */}
      <path d="M10 45 L25 45 L75 15 L60 15 Z" fill={c.top} />
      {/* Top Right Leg */}
      <path d="M45 45 L60 45 L110 15 L95 15 Z" fill={c.top} />
      
      {/* Front Face (U Shape) */}
      <path d="M10 45 L25 45 L25 80 L45 80 L45 45 L60 45 L60 95 L10 95 Z" fill={c.front} />
      
      {/* Side Face (Right Outer) */}
      <path d="M60 45 L110 15 L110 65 L60 95 Z" fill={c.side} />
    </>
  )
}

function beam() {
  const c = PALETTE_RED
  return (
    <>
      {/* HEA/IPE Geometry */}
      
      {/* Top Flange Surface */}
      <path d="M10 40 L50 40 L100 10 L60 10 Z" fill={c.top} />
      
      {/* Web Side (Right side of the web) */}
      <path d="M35 50 L40 50 L90 20 L85 20 Z" fill={c.inner} />
      
      {/* Bottom Flange Top Surface (Visible part) */}
      <path d="M10 80 L25 80 L75 50 L60 50 Z" fill={c.inner} />
      <path d="M35 80 L50 80 L100 50 L85 50 Z" fill={c.inner} />
      
      {/* Front Face (I Shape) */}
      <path 
        d="M10 40 L50 40 L50 50 L35 50 L35 80 L50 80 L50 90 L10 90 L10 80 L25 80 L25 50 L10 50 Z" 
        fill={c.front} 
      />
      
      {/* Side Face (Right edges) */}
      <path d="M50 40 L100 10 L100 20 L50 50 Z" fill={c.side} />
      <path d="M50 80 L100 50 L100 60 L50 90 Z" fill={c.side} />
      
      {/* Web Side (Extruded) */}
      <path d="M35 50 L85 20 L85 50 L35 80 Z" fill={c.side} opacity="0.8"/>
    </>
  )
}