"use client"

// Halo Segmented — from Cult UI (https://www.cult-ui.com/docs/components/halo-segmented)
// MIT License · Copyright (c) 2023 Jordan Gilliam.
// Adapted for Apex Robotics ("instrument mode switch"): the multicolour animated rims, gradient
// fills, glows, shadows and frosted blur are removed. A hairline track with a 2px-radius thumb
// that slides on the servo spring; mono uppercase labels; the active label is full-strength text
// with a 1px pollen tick under it (the "active" yellow). Mechanics unchanged: Base UI ToggleGroup
// (aria-pressed, roving focus, keyboard), measured sliding thumb, reduced-motion aware.
//
//   <HaloSegmented
//     items={[{ value: "assembled", label: "Assembled" }, { value: "exploded", label: "Exploded" },
//             { value: "xray", label: "X-ray" }]}
//     value={mode} onValueChange={setMode} aria-label="Robot view mode" />

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

/** Servo spring (DESIGN_SPEC §2). */
const servo = { type: "spring" as const, stiffness: 260, damping: 30, mass: 1 }

export interface HaloSegmentedItem {
  value: string
  label: ReactNode
  disabled?: boolean
}

export interface HaloSegmentedProps {
  items: HaloSegmentedItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (next: string) => void
  className?: string
  /** Kept for API compatibility; the frosted look is intentionally gone (never blur over a canvas). */
  translucent?: boolean
  disabled?: boolean
  /** Accessible name for the group, e.g. "Robot view mode". */
  "aria-label"?: string
  size?: "sm" | "md"
}

export function HaloSegmented({
  items,
  value: valueProp,
  defaultValue,
  onValueChange,
  className,
  disabled = false,
  "aria-label": ariaLabel,
  size = "md",
}: HaloSegmentedProps) {
  const reduceMotion = useReducedMotion() ?? false
  const trackRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [thumb, setThumb] = useState({ x: 0, width: 0 })

  const isControlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? items[0]?.value ?? "")
  const selected = isControlled ? (valueProp ?? "") : uncontrolled

  const setSelected = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  const groupValue = useMemo(() => (selected ? [selected] : []), [selected])

  const measureThumb = useCallback(() => {
    const track = trackRef.current
    const active = selected ? itemRefs.current.get(selected) : undefined
    if (!(track && active)) {
      setThumb({ x: 0, width: 0 })
      return
    }
    const tr = track.getBoundingClientRect()
    const br = active.getBoundingClientRect()
    setThumb({ x: br.left - tr.left, width: br.width })
  }, [selected])

  useLayoutEffect(() => {
    measureThumb()
  }, [measureThumb])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => measureThumb())
    ro.observe(track)
    return () => ro.disconnect()
  }, [measureThumb])

  return (
    <div className={cn("relative inline-flex max-w-full rounded-sm border border-hairline bg-bg", className)}>
      <div className="relative p-0.5" ref={trackRef}>
        <motion.div
          aria-hidden
          animate={{ x: thumb.width > 0 ? thumb.x - 2 : 0, width: thumb.width }}
          className="pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 rounded-sm border border-border-ui bg-surface-2"
          initial={false}
          transition={reduceMotion ? { duration: 0 } : servo}
        >
          <span className="absolute inset-x-3 -bottom-px h-px bg-pollen-line" />
        </motion.div>

        <ToggleGroup
          aria-label={ariaLabel}
          className="relative z-1 flex min-w-0 gap-0"
          disabled={disabled}
          multiple={false}
          onValueChange={(next) => {
            const first = next[0]
            if (typeof first === "string") setSelected(first)
          }}
          value={groupValue}
        >
          {items.map((item) => (
            <Toggle
              className={cn(
                "relative flex min-w-0 flex-1 items-center justify-center rounded-sm whitespace-nowrap",
                size === "sm" ? "min-h-8 px-3" : "min-h-10 px-4",
                "font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase",
                "transition-colors duration-[120ms] ease-out hover:text-fg",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                "disabled:pointer-events-none disabled:opacity-40",
                "aria-pressed:text-fg"
              )}
              disabled={item.disabled}
              key={item.value}
              ref={(el) => {
                if (el) itemRefs.current.set(item.value, el)
                else itemRefs.current.delete(item.value)
              }}
              value={item.value}
            >
              {item.label}
            </Toggle>
          ))}
        </ToggleGroup>
      </div>
    </div>
  )
}
