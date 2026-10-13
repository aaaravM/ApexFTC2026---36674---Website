"use client";

/**
 * Skiper 19 — "SVG follow scroll" (the stroke that follows the scroll progress), from Skiper UI
 * (free tier). Inspired by comgio.ai (an independent recreation by Skiper UI).
 * Author: @gurvinder-singh02 · https://skiper-ui.com · Attribution to Skiper UI is required for
 * the free version (credited in the site footer colophon).
 *
 * Adapted for Apex Robotics: framer-motion → motion/react; the demo page (lime 20px squiggle,
 * "skiperui.com" footer) is removed. The mechanic is a reusable hairline:
 *
 *   <ScrollDrawPath d="M0 50 C 200 0, 400 0, 600 50" viewBox="0 0 600 60" className="text-fg-muted" />
 *     the stroke draws from `start` → 1 as the element scrolls through the viewport.
 *   offset / start / strokeWidth props tune it; colour = currentColor; non-scaling 1px stroke.
 * Good for: the Code page loop line, the Outreach timeline spine, CAD dimension leaders.
 * Reduced motion: the full path is drawn statically.
 */

import { motion, useReducedMotion, useScroll, useTransform, type UseScrollOptions } from "motion/react";
import React, { useRef } from "react";

import { cn } from "@/lib/utils";

export interface ScrollDrawPathProps {
  d: string;
  viewBox: string;
  className?: string;
  /** Starting drawn fraction (0–1). Default 0. */
  start?: number;
  strokeWidth?: number;
  /** motion useScroll offset (default: while the element crosses the viewport). */
  offset?: UseScrollOptions["offset"];
  preserveAspectRatio?: string;
}

export function ScrollDrawPath({
  d,
  viewBox,
  className,
  start = 0,
  strokeWidth = 1,
  offset = ["start 0.85", "end 0.35"],
  preserveAspectRatio = "xMidYMid meet",
}: ScrollDrawPathProps) {
  const ref = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();
  // motion types `target` as an HTMLElement ref; an SVG element measures the same way.
  const { scrollYProgress } = useScroll({ target: ref as unknown as React.RefObject<HTMLElement>, offset });
  const pathLength = useTransform(scrollYProgress, [0, 1], [start, 1]);

  return (
    <svg ref={ref} viewBox={viewBox} fill="none" preserveAspectRatio={preserveAspectRatio} className={cn("overflow-visible", className)} aria-hidden="true">
      <motion.path
        d={d}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        style={reduce ? undefined : { pathLength }}
      />
    </svg>
  );
}

/** The original demo, re-pointed (not used on the site). */
export const Skiper19 = () => (
  <div className="flex h-[200vh] items-center justify-center">
    <ScrollDrawPath d="M0 80 C 150 0, 450 0, 600 80" viewBox="0 0 600 90" className="w-full max-w-3xl text-fg-muted" />
  </div>
);

export default ScrollDrawPath;
