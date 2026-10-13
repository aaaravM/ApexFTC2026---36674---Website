"use client";

// WingsEngraving — the wings mark as pure line work: every feather outline of the real vector
// paths (brand/wings-paths.ts) stroked at a constant 1px with no fill, which reads as the
// engraving the logo was drawn from. Decorative (aria-hidden), colour = currentColor.
//
//   <WingsEngraving className="w-[640px] text-hairline-strong" />          static
//   <WingsEngraving draw className="…" />                                  engraves itself in view
//
// `draw`: each wing's 36 feather outlines are separate paths (DESIGN_SPEC errata 12), and they
// stroke themselves in feather by feather, from the root out, when the mark scrolls into view —
// the plate being engraved. The server renders the finished line work; on screen at load or under
// reduced motion it stays static (motion kit useArm).

import { animate, stagger } from "motion/react";
import { useRef } from "react";
import { useArm } from "@/components/motion";
import { WING_LEFT_PATH, WING_RIGHT_PATH, WINGS_VIEWBOX } from "@/components/brand/wings-paths";
import { ease } from "@/lib/motion";

const split = (d: string) =>
  d
    .split(/(?=M )/)
    .map((s) => s.trim())
    .filter(Boolean);
const LEFT = split(WING_LEFT_PATH);
const RIGHT = split(WING_RIGHT_PATH);

export function WingsEngraving({ className, draw }: { className?: string; draw?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const paths = () => Array.from(ref.current?.querySelectorAll<SVGPathElement>("path") ?? []);
  useArm(ref, {
    inset: 0.2,
    onArm: draw ? () => void animate(paths(), { strokeDashoffset: 1 }, { duration: 0 }) : undefined,
    onPlay: draw
      ? () => void animate(paths(), { strokeDashoffset: 0 }, { duration: 1.3, ease: ease.inOut, delay: stagger(0.03) })
      : undefined,
  });
  const { width, height } = WINGS_VIEWBOX;
  // Interleave the two wings so both engrave at once, mirror-wise.
  const strokes = LEFT.flatMap((d, i) => (RIGHT[i] ? [d, RIGHT[i]] : [d])).concat(RIGHT.slice(LEFT.length));
  return (
    <span ref={ref} className="block" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} className={className} fill="none" stroke="currentColor" strokeLinejoin="round" focusable="false">
        {strokes.map((d, i) => (
          <path
            key={i}
            d={d}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={draw ? "1 1" : undefined}
            strokeDashoffset={draw ? 0 : undefined}
          />
        ))}
      </svg>
    </span>
  );
}
