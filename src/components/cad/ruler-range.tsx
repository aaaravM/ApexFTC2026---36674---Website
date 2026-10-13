"use client";

// RulerRange — a native <input type="range"> drawn as a drafting scale with a slide-rule cursor
// (paper window + ink hairline). Native for keyboard (arrows, PgUp/PgDn, Home/End), screen readers
// and touch; the ruler is decoration behind it, inset by half the thumb so ticks line up.
//
//   <RulerRange id="cad-explode" label="Explode" value={v} onValueChange={setV}
//     display="045 %" valueText="45 percent" ticks={…} />

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { styles } from "./styles";

export interface RulerTick {
  /** 0–1 along the scale. */
  at: number;
  /** Major ticks are taller; labelled ticks print their label underneath. */
  major?: boolean;
  label?: string;
}

export interface RulerRangeProps {
  id: string;
  label: ReactNode;
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Mono readout next to the label. */
  display: ReactNode;
  /** aria-valuetext (what a screen reader hears). */
  valueText: string;
  ticks: RulerTick[];
  /** Snap to these values when within `snapWithin` (e.g. the centreline). */
  snaps?: number[];
  snapWithin?: number;
  className?: string;
  hint?: ReactNode;
}

export function RulerRange({
  id,
  label,
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.005,
  display,
  valueText,
  ticks,
  snaps,
  snapWithin = 0.015,
  className,
  hint,
}: RulerRangeProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="type-label text-fg">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-[12px] leading-4 tracking-[0.04em] text-fg tabular-nums" aria-hidden="true">
          {display}
        </output>
      </div>
      <div className="relative mt-2">
        <svg aria-hidden="true" className={cn(styles.rulerTicks, "text-fg")}>
          <line x1="0" y1="33.5" x2="100%" y2="33.5" stroke="currentColor" strokeWidth="1" />
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={`${(t.at * 100).toFixed(3)}%`}
              x2={`${(t.at * 100).toFixed(3)}%`}
              y1={t.major ? 18 : 25}
              y2={34}
              stroke="currentColor"
              strokeWidth={t.major ? 1.25 : 0.75}
            />
          ))}
        </svg>
        <input
          id={id}
          type="range"
          className={cn(styles.range, "relative text-fg")}
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={valueText}
          onChange={(e) => {
            let v = Number(e.target.value);
            if (snaps) for (const s of snaps) if (Math.abs(v - s) < snapWithin * (max - min)) v = s;
            onValueChange(v);
          }}
        />
      </div>
      <div aria-hidden="true" className="relative mx-[7px] mt-1.5 h-3.5">
        {ticks
          .filter((t) => t.label)
          .map((t, i, arr) => (
            <span
              key={i}
              className="absolute top-0 font-mono text-[10px] leading-none tracking-[0.04em] whitespace-nowrap text-fg-muted"
              style={{
                left: `${t.at * 100}%`,
                transform: i === 0 && t.at === 0 ? "none" : i === arr.length - 1 && t.at === 1 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {t.label}
            </span>
          ))}
      </div>
      {hint && <p className="mt-2 text-[13px] leading-5 text-fg-muted">{hint}</p>}
    </div>
  );
}
