// Marquee — from Watermelon UI (https://ui.watermelon.sh), MIT License ·
// Copyright (c) 2025-present Watermelon Contributors.
// Adapted for Apex Robotics: keyframes (`animate-marquee`, `animate-marquee-vertical`) now live in
// src/app/globals.css (the registry never shipped them); copies 2…n are aria-hidden so screen
// readers read the content once; pauses on hover AND keyboard focus; paused under reduced motion;
// `gap` prop. Server-safe. Use only for REAL data (e.g. what sponsorship funds) — never a fake
// logo wall.
//
//   <Marquee pauseOnHover gap={48} speed="slow">
//     <span className="type-label">CONTROL HUBS · ≈ $550</span> …
//   </Marquee>

import { type ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  className?: string
  /** Reverse the direction. */
  reverse?: boolean
  /** Pause on hover / focus-within. */
  pauseOnHover?: boolean
  children: React.ReactNode
  vertical?: boolean
  /** Number of copies (≥ 2 for a seamless loop). */
  repeat?: number
  speed?: "slow" | "normal" | "fast"
  /** Gap between items/copies in px. */
  gap?: number
}

const speedVariants = {
  slow: "[--duration:120s]",
  normal: "[--duration:60s]",
  fast: "[--duration:24s]",
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  speed = "normal",
  gap = 32,
  style,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      style={{ ["--gap" as string]: `${gap}px`, ...style }}
      className={cn(
        "group flex [gap:var(--gap)] overflow-hidden",
        speedVariants[speed],
        vertical ? "flex-col" : "flex-row",
        className
      )}
    >
      {Array.from({ length: Math.max(2, repeat) }, (_, i) => (
        <div
          key={i}
          aria-hidden={i > 0 ? true : undefined}
          className={cn(
            "flex shrink-0 justify-around [gap:var(--gap)] motion-reduce:[animation-play-state:paused]",
            vertical ? "animate-marquee-vertical flex-col" : "animate-marquee flex-row",
            pauseOnHover && "group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]",
            reverse && "[animation-direction:reverse]"
          )}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
