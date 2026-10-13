"use client"

// Rolling Number — from Cult UI (https://www.cult-ui.com/docs/components/rolling-number)
// MIT License · Copyright (c) 2023 Jordan Gilliam.
// Adapted for Apex Robotics:
//   • fixed en-US formatting by default (no server/browser locale hydration mismatch)
//   • mono + tabular figures; the animated span is aria-hidden and an sr-only copy carries the
//     FINAL value (screen readers never hear the in-between numbers)
//   • reduced motion → jumps straight to the value
//   • `source`: drive it from a MotionValue (e.g. written by an R3F useFrame loop) with no React
//     re-renders; `stiffness` defaults higher so readouts don't lag the turret
//
//   <RollingNumber value={rpm} format={fmtInt} />
//   <RollingNumber source={rpmMotionValue} label="Flywheel RPM" />

import { useEffect } from "react"
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react"

import { cn } from "@/lib/utils"

const en = new Intl.NumberFormat("en-US")

interface RollingNumberProps {
  /** Target value (ignored when `source` is given). */
  value?: number
  /** Live MotionValue to follow instead of `value` (no React re-renders per frame). */
  source?: MotionValue<number>
  mass?: number
  stiffness?: number
  damping?: number
  precision?: number
  format?: (value: number) => string
  /** Accessible label for the sr-only final value, e.g. "Flywheel RPM". */
  label?: string
  className?: string
  onAnimationStart?: () => void
  onAnimationComplete?: () => void
}

export function RollingNumber({
  value = 0,
  source,
  mass = 0.6,
  stiffness = 180,
  damping = 26,
  precision = 0,
  format = (num) => en.format(num),
  label,
  className,
  onAnimationStart,
  onAnimationComplete,
}: RollingNumberProps) {
  const reduce = useReducedMotion()
  const spring = useSpring(source ? source.get() : value, { mass, stiffness, damping })
  const display: MotionValue<string> = useTransform(spring, (current) =>
    format(parseFloat(current.toFixed(precision)))
  )
  const finalText = format(parseFloat(value.toFixed(precision)))

  // Follow a MotionValue source.
  useMotionValueEvent(source ?? spring, "change", (v) => {
    if (!source) return
    if (reduce) spring.jump(v)
    else spring.set(v)
  })

  useEffect(() => {
    if (source) return
    if (reduce) spring.jump(value)
    else spring.set(value)
    onAnimationStart?.()
    const unsubscribe = spring.on("change", () => {
      if (spring.get() === value) onAnimationComplete?.()
    })
    return () => unsubscribe()
    // format is usually an inline arrow; value/precision drive updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spring, value, reduce, precision, source])

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      <motion.span aria-hidden="true">{display}</motion.span>
      {!source && (
        <span className="sr-only">
          {label ? `${label}: ` : ""}
          {finalText}
        </span>
      )}
    </span>
  )
}
