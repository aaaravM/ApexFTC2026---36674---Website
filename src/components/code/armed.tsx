"use client";

// Code-page-specific scroll effects on the motion kit's trigger (useArm): the server renders the
// FINAL state, elements on screen at load stay static, elements below the fold are armed and play
// once when scrolled into view, and reduced motion never arms. The effect itself is a CSS class from
// code-motion.css that keys off data-m ("armed" | "play"):
//   code-plot     — the solver drawing plots itself: frame settles, the flight traces muzzle → CELL
//   code-tilt     — panels tilt up into place on a perspective hinge (gates)
//   code-swap     — sensor rows: the ⇄ turns and the new sensor slides across from the usual column
//   code-unfold   — tree rows print in from the left one after another (codebase)
//   code-assemble — tuning matrix: rails extend downward step by step, each dot stamps in
//   code-notes    — each note's rule draws, then its text settles (rules of the road)
//   code-flap     — spec rows flip down like a departure board (stack)

import { useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useArm } from "@/components/motion";
import { cn } from "@/lib/utils";

export type ArmedEffect = "plot" | "tilt" | "swap" | "unfold" | "assemble" | "notes" | "flap";

export function Armed({
  effect,
  as: Tag = "div",
  delay = 0,
  inset = 0.12,
  className,
  style,
  children,
  ...rest
}: {
  effect: ArmedEffect;
  as?: ElementType;
  delay?: number;
  inset?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & Record<`aria-${string}`, string | undefined>) {
  const ref = useRef<HTMLElement>(null);
  useArm(ref, { inset });
  return (
    <Tag ref={ref} className={cn(`code-${effect}`, className)} style={{ "--code-delay": `${delay}s`, ...style } as CSSProperties} {...rest}>
      {children}
    </Tag>
  );
}
