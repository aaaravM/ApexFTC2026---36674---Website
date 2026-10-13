"use client";

// Sponsors-only motion pieces (the page's own signature, so it doesn't share the generic wipes):
//
//   <MarchingAnts />   a dashed outline that slowly "marches" around an OPEN slot — an invitation,
//                      not an alarm. Fill the parent (which must be `relative`). The dashes only
//                      move while the slot is on screen; reduced motion → static dashes.
//   <WingsFlap />      the wings mark flaps once (up ~9° about each wing root, settles) when it comes
//                      into view beside the CTA. Reduced motion → MotionConfig skips it (static mark).

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { WING_LEFT_PATH, WING_RIGHT_PATH, WINGS_VIEWBOX } from "@/components/brand/wings-paths";
import { cn } from "@/lib/utils";

export function MarchingAnts({ className, dash = 5, gap = 4 }: { className?: string; dash?: number; gap?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { margin: "0px 0px -5% 0px" });
  const reduce = useReducedMotion();
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none absolute inset-[0.5px] size-[calc(100%-1px)] overflow-visible text-border-ui", className)}
    >
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray={`${dash} ${gap}`}
        shapeRendering="crispEdges"
      >
        {/* Added after mount only (inView is false on the server) → no hydration diff. */}
        {inView && !reduce && (
          <animate attributeName="stroke-dashoffset" from="0" to={String(-(dash + gap) * 2)} dur="2.4s" repeatCount="indefinite" />
        )}
      </rect>
    </svg>
  );
}

/** Pivots match the brand mark (globals.css §6b): wing roots at (388,540) and (415,540). */
const FLAP = { duration: 1.1, ease: [0.65, 0, 0.35, 1] as [number, number, number, number], times: [0, 0.36, 0.7, 1] };

export function WingsFlap({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.9, margin: "0px 0px -15% 0px" });
  const { width, height } = WINGS_VIEWBOX;
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 overflow-visible", className)}
      aria-hidden="true"
      focusable="false"
    >
      <motion.path
        d={WING_LEFT_PATH}
        fill="currentColor"
        fillRule="evenodd"
        style={{ transformBox: "view-box", originX: "388px", originY: "540px" }}
        animate={inView ? { rotate: [0, 9, -1.5, 0] } : undefined}
        transition={FLAP}
      />
      <motion.path
        d={WING_RIGHT_PATH}
        fill="currentColor"
        fillRule="evenodd"
        style={{ transformBox: "view-box", originX: "415px", originY: "540px" }}
        animate={inView ? { rotate: [0, -9, 1.5, 0] } : undefined}
        transition={FLAP}
      />
    </svg>
  );
}
