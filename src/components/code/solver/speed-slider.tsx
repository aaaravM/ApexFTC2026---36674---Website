"use client";

// A signed speed control: native <input type="range"> (keyboard, screen readers and touch for free)
// drawn as an instrument scale — hairline track, centre detent at 0, a filled segment from 0 to the
// value, mono ticks. Arrow keys = 1 in/s, PageUp/PageDown = 10 in/s (browser default for range).

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SpeedSliderProps {
  label: string;
  /** What + means, e.g. "toward the CELL". */
  plus: string;
  minus: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  className?: string;
}

export function SpeedSlider({ label, plus, minus, value, onChange, max, className }: SpeedSliderProps) {
  const id = useId();
  const pct = (v: number) => ((v + max) / (2 * max)) * 100;
  const lo = Math.min(pct(0), pct(value));
  const hi = Math.max(pct(0), pct(value));
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const dir = value > 0 ? plus : value < 0 ? minus : "stopped";
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="type-label text-fg-muted">
          {label}
        </label>
        <p className="font-mono text-[13px] text-fg tabular-nums">
          {sign}
          {Math.abs(value)}
          <span className="ml-1 text-[11px] text-fg-muted">in/s</span>
          <span className="ml-2 text-[10px] tracking-[0.08em] text-fg-muted uppercase">{dir}</span>
        </p>
      </div>
      <div className="relative mt-2 h-9">
        {/* track + centre detent + fill */}
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-ui" />
        <span aria-hidden="true" className="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-fg-muted" style={{ left: "50%" }} />
        <span aria-hidden="true" className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-fg" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
        {[-max, -max / 2, max / 2, max].map((t) => (
          <span key={t} aria-hidden="true" className="absolute top-[calc(50%+5px)] h-1.5 w-px -translate-x-1/2 bg-border-ui" style={{ left: `${pct(t)}%` }} />
        ))}
        <input
          id={id}
          type="range"
          min={-max}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={value === 0 ? "0 inches per second, stopped" : `${Math.abs(value)} inches per second, ${dir}`}
          className={cn(
            "relative z-10 m-0 h-9 w-full cursor-pointer appearance-none bg-transparent outline-offset-4",
            "[&::-webkit-slider-runnable-track]:h-9 [&::-webkit-slider-runnable-track]:bg-transparent",
            "[&::-webkit-slider-thumb]:mt-[11px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:w-[8px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[1px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-fg [&::-webkit-slider-thumb]:bg-bg",
            "[&::-moz-range-track]:h-9 [&::-moz-range-track]:bg-transparent",
            "[&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:w-[8px] [&::-moz-range-thumb]:rounded-[1px] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-fg [&::-moz-range-thumb]:bg-bg",
            "hover:[&::-webkit-slider-thumb]:bg-fg focus-visible:[&::-webkit-slider-thumb]:bg-pollen hover:[&::-moz-range-thumb]:bg-fg",
          )}
        />
      </div>
      <div aria-hidden="true" className="mt-0.5 flex justify-between font-mono text-[10px] text-fg-muted tabular-nums">
        <span>−{max}</span>
        <span>0</span>
        <span>+{max}</span>
      </div>
    </div>
  );
}
