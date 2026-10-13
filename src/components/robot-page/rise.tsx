"use client";

// Rise — the children of a group rise in sequence when it scrolls into view (max 6 steps, later
// children arrive together). Same look as the motion kit's Stagger, but built on the kit's useArm
// + CSS (./robot-page.css), so it is hydration-safe and reduced-motion safe:
//   • the server renders the FINAL state (readable without JavaScript)
//   • after hydration only groups below the fold are armed (hidden), then play when scrolled to
//   • under prefers-reduced-motion nothing is ever armed — no hidden copy, no movement
// (The kit's Stagger renders a different tree on the client under reduced motion, which leaves
//  the server's opacity:0 in place — reported to integration.)
//
//   <Rise as="dl" className="…">{rows.map((r) => <div key={r.label}>…</div>)}</Rise>

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useArm } from "@/components/motion";
import { cn } from "@/lib/utils";
import "./robot-page.css";

type RiseTag = "div" | "ul" | "ol" | "dl";

export function Rise({
  as: Tag = "div",
  className,
  delay = 0,
  children,
}: {
  as?: RiseTag;
  className?: string;
  /** Seconds before the first child moves. */
  delay?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useArm(ref, { inset: 0.08 });
  return (
    <Tag
      // the four tags share the same ref type at runtime; TS can't narrow the union
      ref={ref as never}
      className={cn("rp-rise", className)}
      style={{ "--m-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
