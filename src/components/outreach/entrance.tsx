"use client";

// Page-specific entrances for /outreach and /sponsors — so neighbouring sections don't all use the
// same rise / wipe (the team: "it's all the same line swipe"). Same contract as the motion kit:
//   • the server renders the FINAL state (readable before JS, no hydration diff);
//   • after hydration, items already on screen stay static; items below the fold are "armed"
//     (set to the preset's start state) and play when THEY scroll in — items that arrive in the same
//     frame play as one staggered sequence (so a stacked mobile grid plays card by card);
//   • reduced motion: never armed, nothing moves.
//
//   <Entrance preset="tilt" className="grid …">  …<article data-enter>…</article>… </Entrance>
//   <Entrance preset="slide-left" self>…</Entrance>          animates the wrapper itself
//   <Entrance preset="tick" as="ul">  <li data-enter><svg><path data-check pathLength={1} …/></svg>…</li> </Entrance>
//        "tick": each line ticks in and its check glyph's stroke draws (pathLength 0 → 1).
//
// Presets: tilt (plates rise and tip up into place, rotateX), slide-left (rows slide in from the
// left), tick (benefit lines), fade (opacity only).

import { animate, stagger as staggerFrom, type DOMKeyframesDefinition } from "motion/react";
import { useLayoutEffect, useRef, type ElementType, type ReactNode } from "react";
import { ease } from "@/lib/motion";

export type EntrancePreset = "tilt" | "slide-left" | "tick" | "fade";

const PRESETS: Record<EntrancePreset, { from: DOMKeyframesDefinition; to: DOMKeyframesDefinition; duration: number }> = {
  tilt: {
    from: { opacity: 0, y: 64, rotateX: -16, transformPerspective: 1100 },
    to: { opacity: 1, y: 0, rotateX: 0, transformPerspective: 1100 },
    duration: 0.95,
  },
  "slide-left": { from: { opacity: 0, x: -44 }, to: { opacity: 1, x: 0 }, duration: 0.75 },
  tick: { from: { opacity: 0, x: -8 }, to: { opacity: 1, x: 0 }, duration: 0.4 },
  fade: { from: { opacity: 0 }, to: { opacity: 1 }, duration: 0.6 },
};

export interface EntranceProps {
  children: ReactNode;
  preset: EntrancePreset;
  as?: ElementType;
  className?: string;
  /** Animate the wrapper itself instead of its `[data-enter]` descendants. */
  self?: boolean;
  /** Seconds between items of one sequence. */
  stagger?: number;
  /** Seconds before the first item. */
  delay?: number;
  /** Fraction of the viewport bottom ignored before an item plays (default 0.1). */
  inset?: number;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function Entrance({
  children,
  preset,
  as: Tag = "div",
  className,
  self,
  stagger = 0.09,
  delay = 0,
  inset = 0.1,
  ...aria
}: EntranceProps) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const p = PRESETS[preset];
    const items = self ? [root] : Array.from(root.querySelectorAll<HTMLElement>("[data-enter]"));
    const checksOf = (els: HTMLElement[]) => els.flatMap((el) => Array.from(el.querySelectorAll<SVGPathElement>("[data-check]")));

    const vh = window.innerHeight;
    const armed = new Set(
      items.filter((el) => {
        if (el.dataset.entered) return false;
        const r = el.getBoundingClientRect();
        return !(r.top < vh && r.bottom > 0); // on screen at load → stays static
      }),
    );
    if (!armed.size) return;

    const list = [...armed];
    animate(list, p.from, { duration: 0 });
    const checks = checksOf(list);
    if (checks.length) animate(checks, { strokeDashoffset: 1 }, { duration: 0 });

    let queue: HTMLElement[] = [];
    let raf = 0;
    const flush = () => {
      raf = 0;
      const batch = queue.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      queue = [];
      batch.forEach((el) => {
        armed.delete(el);
        el.dataset.entered = "";
      });
      animate(batch, p.to, { duration: p.duration, ease: ease.out, delay: staggerFrom(stagger, { startDelay: delay }) });
      // Check glyphs draw just after their line lands; one per line, so the stagger lines up.
      const marks = checksOf(batch);
      if (marks.length)
        animate(marks, { strokeDashoffset: 0 }, { duration: 0.38, ease: ease.inOut, delay: staggerFrom(stagger, { startDelay: delay + 0.16 }) });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          queue.push(e.target as HTMLElement);
        }
        if (queue.length && !raf) raf = requestAnimationFrame(flush);
      },
      { rootMargin: `0px 0px -${Math.round(inset * 100)}% 0px` },
    );
    armed.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      // Hidden by Next's <Activity>: settle anything still waiting so it is never left invisible.
      const left = [...armed];
      if (left.length) {
        animate(left, p.to, { duration: 0 });
        const c = checksOf(left);
        if (c.length) animate(c, { strokeDashoffset: 0 }, { duration: 0 });
      }
    };
  }, [preset, self, stagger, delay, inset]);

  return (
    <Tag ref={ref} className={className} {...aria}>
      {children}
    </Tag>
  );
}

/** A small check glyph whose stroke draws in an <Entrance preset="tick"> line. Decorative. */
export function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="none" stroke="currentColor" aria-hidden="true" focusable="false">
      <path
        data-check=""
        d="M2 6.4 4.8 9.2 10 3"
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={0}
        strokeWidth={1.25}
        strokeLinecap="square"
      />
    </svg>
  );
}
