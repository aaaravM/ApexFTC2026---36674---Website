"use client";

// Scramble — mono telemetry labels "decode" left→right (instrument readout feel).
// Plays once when scrolled into view and, optionally, again on hover. Screen readers get the
// plain text. Use on MONO labels/eyebrows only — never on headings or body text.
//   <Scramble text="[ 01 / TEAM ]" className="font-mono text-[11px] uppercase" />
//   <Scramble text="SUB-04 / TURRET" hover />

import { useRef, type ElementType } from "react";
import { cn } from "@/lib/utils";
import { useArm } from "./use-arm";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#·-_";

export interface ScrambleProps {
  text: string;
  as?: ElementType;
  /** Replay on pointer hover / keyboard focus of this element. */
  hover?: boolean;
  /** Seconds for the full decode (default 0.6). */
  duration?: number;
  immediate?: boolean;
  className?: string;
}

export function Scramble({ text, as: Tag = "span", hover, duration = 0.6, immediate, className }: ScrambleProps) {
  const ref = useRef<HTMLElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);

  const run = () => {
    const el = out.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(raf.current);
    const chars = Array.from(text);
    const start = performance.now();
    const ms = duration * 1000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // each character resolves at its own time, sweeping left → right
      el.textContent = chars
        .map((ch, i) => {
          if (ch === " " || t >= (i + 1) / chars.length) return ch;
          if (t < (i / chars.length) * 0.35) return ch === "[" || ch === "]" ? ch : "·";
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else el.textContent = text;
    };
    raf.current = requestAnimationFrame(tick);
  };

  useArm(ref, {
    immediate,
    onArm: () => {
      if (out.current) out.current.textContent = Array.from(text).map((c) => (c === " " ? c : "·")).join("");
    },
    onPlay: run,
  });

  return (
    <Tag
      ref={ref}
      className={cn("whitespace-pre-wrap", className)}
      onPointerEnter={hover ? run : undefined}
      onFocus={hover ? run : undefined}
    >
      <span className="sr-only">{text}</span>
      <span ref={out} aria-hidden="true">
        {text}
      </span>
    </Tag>
  );
}
