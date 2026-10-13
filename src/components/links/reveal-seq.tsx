"use client";

// RevealSeq — a container whose .lk-rise / .lk-rule / .lk-print children play in sequence (each
// delayed by its --i) when it scrolls into view, or on load with `immediate`. See use-reveal.ts and
// links-motion.css. Server HTML is the finished state, and reduced motion never hides anything
// (unlike a JS-variant stagger, there is no server/client style difference to hydrate).
//
//   <RevealSeq as="ol" className="grid gap-5">
//     {notes.map((n, i) => <li key={i} className="lk-rise" style={{ "--i": i }}>…</li>)}
//   </RevealSeq>

import { useRef, type CSSProperties, type ReactNode } from "react";
import "./links-motion.css";
import { useReveal } from "./use-reveal";
import { cn } from "@/lib/utils";

export function RevealSeq({
  as: Tag = "div",
  immediate,
  delay = 0.05,
  className,
  children,
}: {
  as?: "div" | "ul" | "ol" | "dl";
  immediate?: boolean;
  /** Seconds before the first child moves. */
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn("lk-seq", className)}
      data-m={immediate ? "play" : undefined}
      style={{ "--lk-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
