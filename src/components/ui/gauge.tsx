"use client"

// Gauge — from Watermelon UI (https://ui.watermelon.sh), MIT License ·
// Copyright (c) 2025-present Watermelon Contributors.
// Rebuilt for Apex Robotics as an instrument dial (flywheel RPM, turret yaw, battery…):
//   • fixes: the original treated `value` as a percent regardless of min/max, never applied the
//     half-gauge viewBox, shared one hard-coded gradient id across instances, and faked
//     "in view" with a timeout; it lacked "use client"
//   • monochrome: track = hairline, arc = text colour, butt caps, no gradients, no glow, no
//     traffic-light defaults. The optional READY `band` is the one pollen element.
//   • value text is mono + tabular; arc + number spring together (motion), jump under reduced motion
//   • a11y: role="meter" with aria-valuemin/max/now/valuetext
//
//   <Gauge value={rpm} min={0} max={5000} unit="RPM" label="Flywheel"
//     band={{ from: target - 100, to: target + 100 }} ticks={10} />
//   <Gauge value={yawDeg} min={-170} max={170} type="half" unit="°" label="Turret" />

import { useEffect, useId, type ReactNode } from "react"
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react"

import { cn } from "@/lib/utils"

const en = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })

export interface GaugeProps {
  value: number
  min?: number
  max?: number
  /** Rendered size in px (square for "full", 2:1 for "half"). */
  size?: number
  /** Arc thickness in viewBox units (0–100 box). */
  strokeWidth?: number
  type?: "full" | "half"
  unit?: string
  label?: string
  showValue?: boolean
  format?: (v: number) => string
  /** Highlighted value range (e.g. the READY window) drawn as a pollen arc just outside the track. */
  band?: { from: number; to: number }
  /** Number of tick marks (0 = none). */
  ticks?: number
  /** Extra markers (e.g. hard stops) as values. */
  markers?: { value: number; label?: string }[]
  /** Arc colour (CSS colour). Default currentColor. */
  color?: string
  className?: string
  /** Accessible name; defaults to `label`. */
  "aria-label"?: string
  children?: ReactNode
}

const C = 50 // centre in a 100×100 box

/** Rounded to 1/1000 so server and browser stringify identical attributes (no hydration diff). */
const r3 = (n: number) => Math.round(n * 1000) / 1000

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180
  return { x: r3(C + r * Math.cos(a)), y: r3(C + r * Math.sin(a)) }
}

/** SVG arc path from angle a0 to a1 (degrees, clockwise, 0° = +x). */
function arcPath(r: number, a0: number, a1: number) {
  const s = polar(r, a0)
  const e = polar(r, a1)
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`
}

export function Gauge({
  value,
  min = 0,
  max = 100,
  size = 160,
  strokeWidth = 6,
  type = "full",
  unit,
  label,
  showValue = true,
  format = (v) => en.format(v),
  band,
  ticks = 0,
  markers,
  color = "currentColor",
  className,
  "aria-label": ariaLabel,
  children,
}: GaugeProps) {
  const id = useId()
  const reduce = useReducedMotion()
  const clampFrac = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min || 1)))

  // Geometry: full = 0.5 turn gap at the bottom? (keep a 270° instrument sweep), half = 180°.
  const a0 = type === "half" ? 180 : 135
  const sweep = type === "half" ? 180 : 270
  const a1 = a0 + sweep
  const r = 50 - strokeWidth / 2 - (band ? 5 : 1)
  const angleOf = (v: number) => a0 + clampFrac(v) * sweep

  const frac = useSpring(clampFrac(value), { stiffness: 120, damping: 24, mass: 1 })
  const shown = useSpring(value, { stiffness: 120, damping: 24, mass: 1 })
  useEffect(() => {
    if (reduce) {
      frac.jump(clampFrac(value))
      shown.jump(value)
    } else {
      frac.set(clampFrac(value))
      shown.set(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max, reduce])
  const text = useTransform(shown, (v) => format(v))

  const vbH = type === "half" ? 56 : 100
  const height = type === "half" ? size * 0.56 : size

  return (
    <div
      role="meter"
      aria-label={ariaLabel ?? label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value * 100) / 100}
      aria-valuetext={`${format(value)}${unit ? ` ${unit}` : ""}`}
      className={cn("relative inline-block text-fg", className)}
      style={{ width: size, height }}
    >
      <svg viewBox={`0 0 100 ${vbH}`} width={size} height={height} fill="none" aria-hidden="true" className="overflow-visible">
        {/* track */}
        <path d={arcPath(r, a0, a1)} stroke="var(--hairline)" strokeWidth={strokeWidth} strokeLinecap="butt" />
        {/* ticks */}
        {ticks > 0 &&
          Array.from({ length: ticks + 1 }, (_, i) => {
            const a = a0 + (i / ticks) * sweep
            const p1 = polar(r - strokeWidth / 2 - 1.5, a)
            const p2 = polar(r - strokeWidth / 2 - (i % (ticks / 2 || 1) === 0 ? 5 : 3), a)
            return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="currentColor" strokeWidth={0.6} opacity={0.45} />
          })}
        {/* READY band */}
        {band && (
          <path
            d={arcPath(50 - 2, angleOf(Math.max(min, band.from)), Math.max(angleOf(Math.max(min, band.from)) + 0.5, angleOf(Math.min(max, band.to))))}
            stroke="var(--pollen-line)"
            strokeWidth={2}
            strokeLinecap="butt"
          />
        )}
        {/* markers */}
        {markers?.map((m, i) => {
          const a = angleOf(m.value)
          const p1 = polar(r + strokeWidth / 2 + 0.5, a)
          const p2 = polar(r - strokeWidth / 2 - 0.5, a)
          return <line key={`${id}-m${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="currentColor" strokeWidth={1} />
        })}
        {/* value arc */}
        <motion.path
          d={arcPath(r, a0, a1)}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          style={{ pathLength: frac }}
        />
      </svg>
      {(showValue || label || children) && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 flex flex-col items-center text-center",
            type === "half" ? "bottom-0" : "top-1/2 -translate-y-1/2"
          )}
        >
          {showValue && (
            <p className="font-mono text-[clamp(16px,22%,28px)] leading-none font-light tabular-nums" style={{ fontSize: Math.round(size * 0.15) }}>
              <motion.span>{text}</motion.span>
              {unit && <span className="ml-1 text-[0.45em] text-fg-muted">{unit}</span>}
            </p>
          )}
          {label && <p className="mt-1.5 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">{label}</p>}
          {children}
        </div>
      )}
    </div>
  )
}
