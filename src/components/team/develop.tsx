"use client";

// TEAM signature motion — "the prints develop".
//
// <Arrive> wraps a roster card (or a thumbnail). When it scrolls into view it TILTS IN — rotateX
// ~10° → 0 with perspective, hinged at its foot — and the portrait inside DEVELOPS: a 1-bit
// dither + a speckle of film grain dissolve in steps while the print underneath comes down from
// over-exposed to the finished engraved duotone (team.css §9). Cards in a row arrive left → right
// (the delay is read from the card's own x position when it is armed, so it follows the real
// column count at every breakpoint).
//
// Same trigger as the motion kit (useArm): final state on the server, cards on screen at load stay
// static, never armed under reduced motion; SettleOnHide clears data-m when the route hides.
//
//   <Arrive><Card>…<div className="relative"><img className="team-print" /><Grain /></div></Card></Arrive>

import { useRef, type ReactNode } from "react";
import { useArm } from "@/components/motion";
import { cn } from "@/lib/utils";
import "./team.css";

export interface ArriveProps {
  children: ReactNode;
  className?: string;
  /** Tilt in (cards). false = develop only (thumbnails). */
  tilt?: boolean;
  /** Seconds added before the row stagger. */
  delay?: number;
  /** Extra seconds of stagger across one viewport width (default 0.32). */
  spread?: number;
}

export function Arrive({
  children,
  className,
  tilt = true,
  delay = 0,
  spread = 0.32,
}: ArriveProps) {
  const ref = useRef<HTMLDivElement>(null);
  useArm(ref, {
    inset: 0.06,
    onArm: () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.min(
        1,
        Math.max(0, r.left / Math.max(1, window.innerWidth)),
      );
      el.style.setProperty(
        "--arrive-delay",
        `${(delay + x * spread).toFixed(3)}s`,
      );
    },
  });
  return (
    <div
      ref={ref}
      className={cn("team-arrive", tilt && "team-arrive--tilt", className)}
    >
      {children}
    </div>
  );
}

/** Film grain that dissolves in steps while the print develops (hidden once settled). */
export function Grain({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("team-grain", className)} />;
}
