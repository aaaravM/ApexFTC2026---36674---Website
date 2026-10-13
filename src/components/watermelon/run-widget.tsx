'use client';

// Run Widget (base) — from Watermelon UI (https://ui.watermelon.sh), MIT License ·
// Copyright (c) 2025-present Watermelon Contributors.
// Rebuilt for Apex Robotics as the RANGE TO HIVE ruler (Robot "AIM playground", Code solver):
//   • keeps the mechanic: drag a tick ruler under a fixed centre needle, NumberFlow read-out
//   • fitness chrome removed ("miles", "Begin Run", 320px card, react-icons); ticks are one SVG
//     (1 in minor, 6 in mid, 12 in = 1 ft major with ft labels) instead of 200 divs
//   • a11y: role="slider" (focusable) with aria-valuemin/max/now/valuetext; ←/→ = 1 in,
//     PageUp/PageDown = 12 in, Home/End; the drag uses pointer events with touch-action pan-y so
//     phones can still scroll the page
//   • controlled: `value` (inches) + `onValueChange`; clamps to [min, max]
//
//   <RangeRuler value={range} onValueChange={setRange} min={24} max={144} label="Range to HIVE" />

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { cn } from '@/lib/utils';

const PX_PER_IN = 8;

export interface RangeRulerProps {
  value: number;
  onValueChange: (inches: number) => void;
  min?: number;
  max?: number;
  label?: string;
  /** Extra read-outs rendered under the number (RPM, TOF, apex…). */
  children?: ReactNode;
  className?: string;
}

const fmtFtIn = (v: number) => {
  const ft = Math.floor(v / 12);
  const inch = Math.round(v - ft * 12);
  return `${ft} ft ${inch} in`;
};

export function RangeRuler({ value, onValueChange, min = 24, max = 144, label = 'Range to HIVE', children, className }: RangeRulerProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const toX = (v: number) => -(clamp(v) - min) * PX_PER_IN;
  const x = useMotionValue(toX(value));
  const dragging = useRef(false);

  // Follow external value changes (keyboard, parent) when not dragging.
  useEffect(() => {
    if (dragging.current) return;
    const target = toX(value);
    if (reduce) x.set(target);
    else animate(x, target, { type: 'spring', stiffness: 260, damping: 30 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  useMotionValueEvent(x, 'change', (latest) => {
    if (!dragging.current) return;
    const v = clamp(Math.round(min + -latest / PX_PER_IN));
    if (v !== value) onValueChange(v);
  });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = value + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = value - 1;
    else if (e.key === 'PageUp') next = value + 12;
    else if (e.key === 'PageDown') next = value - 12;
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    if (next !== null) {
      e.preventDefault();
      onValueChange(clamp(next));
    }
  };

  const width = (max - min) * PX_PER_IN;
  const ticks = [];
  for (let v = min; v <= max; v++) {
    const major = v % 12 === 0;
    const mid = !major && v % 6 === 0;
    const px = (v - min) * PX_PER_IN;
    ticks.push(
      <line key={v} x1={px + 0.5} x2={px + 0.5} y1={major ? 4 : mid ? 12 : 18} y2={34} stroke="currentColor" strokeWidth={1} opacity={major ? 0.9 : mid ? 0.55 : 0.3} />,
    );
    if (major)
      ticks.push(
        <text key={`t${v}`} x={px} y={50} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6} fontFamily="var(--font-mono)">
          {v / 12} ft
        </text>,
      );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p id={`${id}-label`} className="type-label text-fg-muted">
            {label}
          </p>
          <p className="mt-2 flex items-baseline gap-2 font-mono text-[clamp(40px,5vw,64px)] leading-none font-light tabular-nums">
            <NumberFlow value={value} format={{ maximumFractionDigits: 0 }} locales="en-US" />
            <span className="text-[0.32em] tracking-[0.04em] text-fg-muted uppercase">in</span>
          </p>
          <p className="mt-1 font-mono text-[11px] tracking-[0.06em] text-fg-muted">{fmtFtIn(value)}</p>
        </div>
        {children}
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-labelledby={`${id}-label`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} inches (${fmtFtIn(value)})`}
        onKeyDown={onKeyDown}
        className="relative mt-6 h-16 overflow-hidden rounded-sm border border-hairline bg-surface-1 text-fg outline-offset-2 select-none"
        style={{ touchAction: 'pan-y' }}
      >
        {/* centre needle */}
        <span aria-hidden="true" className="absolute top-0 left-1/2 z-10 h-10 w-px -translate-x-1/2 bg-pollen-line" />
        <span aria-hidden="true" className="absolute top-0 left-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-pollen-line" />
        <motion.div
          drag="x"
          dragConstraints={{ left: -width, right: 0 }}
          dragElastic={0.04}
          dragMomentum={!reduce}
          onDragStart={() => (dragging.current = true)}
          onDragEnd={() => {
            dragging.current = false;
            const v = clamp(Math.round(min + -x.get() / PX_PER_IN));
            onValueChange(v);
            animate(x, toX(v), reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 });
          }}
          style={{ x, left: '50%' }}
          className="absolute top-0 cursor-grab active:cursor-grabbing"
        >
          <svg width={width + 1} height={56} className="block overflow-visible" aria-hidden="true">
            {ticks}
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

/** Original Watermelon export name. */
export const RunWidget = RangeRuler;
export default RangeRuler;
