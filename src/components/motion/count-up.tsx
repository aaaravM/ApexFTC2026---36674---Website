"use client";

// CountUp — a real number counts up from zero when it scrolls into view (server renders the final
// value; on-screen-at-load numbers stay static). Only for REAL numbers.
//   <CountUp value={12} />                         → "12"
//   <CountUp value={5000} suffix=" RPM" />         → "5,000 RPM"
//   <CountUp value={4.094} decimals={3} />         → "4.094"
//   <CountUp value={170} prefix="±" suffix="°" />  → "±170°"

import { animate } from "motion/react";
import { useRef } from "react";
import { nf } from "@/lib/format";
import { useArm } from "./use-arm";

export interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Seconds (default scales with magnitude, 0.9–1.6). */
  duration?: number;
  immediate?: boolean;
  className?: string;
}

export function CountUp({ value, decimals = 0, prefix = "", suffix = "", duration, immediate, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) => `${prefix}${nf({ minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)}${suffix}`;
  const final = fmt(value);

  useArm(ref, {
    immediate,
    onArm: () => {
      if (textRef.current) textRef.current.textContent = fmt(0);
    },
    onPlay: () => {
      const el = textRef.current;
      if (!el) return;
      const d = duration ?? Math.min(1.6, 0.9 + Math.log10(Math.abs(value) + 1) * 0.18);
      animate(0, value, {
        duration: d,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => {
          el.textContent = fmt(v);
        },
        onComplete: () => {
          el.textContent = final;
        },
      });
    },
  });

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      <span className="sr-only">{final}</span>
      <span ref={textRef} aria-hidden="true">
        {final}
      </span>
    </span>
  );
}
