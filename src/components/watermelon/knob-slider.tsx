'use client';

// Knob Slider (base) — from Watermelon UI (https://ui.watermelon.sh), MIT License ·
// Copyright (c) 2025-present Watermelon Contributors.
// Adapted for Apex Robotics as the TURRET DIAL (Robot "AIM playground"):
//   • limited arc: −170°…+170° with a hatched dead-zone wedge at the back (the real hard stops,
//     RobotConstants.Turret.MIN/MAX_ANGLE_RAD); viewed from above, robot forward = up, and
//     positive = counter-clockwise (the team's +heading CCW convention) — so the pointer shows
//     exactly where the turret points
//   • the slot-machine SlidingNumber read-out is kept (signed, padded: "+038°", mono) and still
//     motion-blurs while you spin fast (not under reduced motion)
//   • Pointer Events + pointer capture + touch-action:none (the original was mouse-only)
//   • a11y: role="slider" with aria-valuemin/max/now/valuetext; ←/→ = 1°, PageUp/PageDown = 15°,
//     Home/End; visible focus ring
//
//   <KnobSlider value={yaw} onChange={setYaw} />                    turret ±170°
//   <KnobSlider value={v} onChange={setV} min={-170} max={170} size={240} label="Turret" />

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, MotionValue, useReducedMotion, useSpring, useTransform, motionValue } from 'motion/react';
import useMeasure from 'react-use-measure';
import { cn } from '@/lib/utils';

const DIGIT_SPRING = { type: 'spring' as const, stiffness: 280, damping: 24, mass: 0.3 };

function Digit({ value, place }: { value: number; place: number }) {
  const digit = Math.floor(value / place) % 10;
  const mv = useMemo(() => motionValue(digit), [digit]);
  const spring = useSpring(mv, DIGIT_SPRING);
  useEffect(() => {
    spring.set(digit);
  }, [digit, spring]);
  return (
    <div className="relative inline-block overflow-hidden tabular-nums" style={{ width: '0.62em' }}>
      <div className="invisible">0</div>
      {Array.from({ length: 10 }, (_, i) => (
        <SlotDigit key={i} mv={spring} number={i} />
      ))}
    </div>
  );
}

function SlotDigit({ mv, number }: { mv: MotionValue<number>; number: number }) {
  const [ref, bounds] = useMeasure();
  const y = useTransform(mv, (latest) => {
    if (!bounds.height) return 0;
    const offset = (10 + number - (latest % 10)) % 10;
    let pos = offset * bounds.height;
    if (offset > 5) pos -= 10 * bounds.height;
    return pos;
  });
  if (!bounds.height)
    return (
      <span ref={ref} className="invisible absolute">
        {number}
      </span>
    );
  return (
    <motion.span ref={ref} style={{ y }} className="absolute inset-0 flex items-center justify-center">
      {number}
    </motion.span>
  );
}

/** Signed, zero-padded sliding read-out: "+038". */
function SlidingNumber({ value, blur, pad = 3 }: { value: number; blur: number; pad?: number }) {
  const abs = Math.abs(Math.round(value));
  const n = Math.max(pad, String(abs).length);
  const places = Array.from({ length: n }, (_, i) => Math.pow(10, n - i - 1));
  return (
    <motion.div
      animate={{ filter: `blur(${blur}px)` }}
      transition={{ duration: 0.15 }}
      className="flex items-center justify-center font-mono font-light tracking-tight text-fg tabular-nums"
    >
      <span className="inline-block w-[0.62em] text-center">{value < -0.5 ? '−' : '+'}</span>
      {places.map((place, i) => (
        <Digit key={`${place}-${i}`} value={abs} place={place} />
      ))}
      <span className="ml-0.5 text-[0.55em] text-fg-muted">°</span>
    </motion.div>
  );
}

interface KnobSliderProps {
  value: number;
  onChange: (value: number) => void;
  /** Degrees (default −170). */
  min?: number;
  /** Degrees (default +170). */
  max?: number;
  size?: number;
  label?: string;
  className?: string;
}

/** Screen angle (deg, clockwise from up) for a turret value (deg, CCW positive). */
const screenAngle = (v: number) => -v;

export const KnobSlider: React.FC<KnobSliderProps> = ({ value, onChange, min = -170, max = 170, size = 260, label = 'Turret', className }) => {
  const id = useId();
  const reduce = useReducedMotion();
  const knobRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const innerSize = size * 0.62;

  const [prev, setPrev] = useState(value);
  const [blur, setBlur] = useState(0);
  if (prev !== value) {
    setBlur(dragging && !reduce ? Math.min(6, Math.abs(value - prev) / 3) : 0);
    setPrev(value);
  }

  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);

  const updateFromPointer = useCallback(
    (x: number, y: number) => {
      if (!knobRef.current) return;
      const rect = knobRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // clockwise-from-up screen angle in (−180, 180]
      let a = (Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI;
      if (a > 180) a -= 360;
      onChange(clamp(Math.round(-a)));
    },
    [onChange, clamp],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = value + 1; // CCW
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = value - 1;
    else if (e.key === 'PageUp') next = value + 15;
    else if (e.key === 'PageDown') next = value - 15;
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    if (next !== null) {
      e.preventDefault();
      onChange(clamp(next));
    }
  };

  // dead zone wedge (the back of the robot, outside [min, max])
  const deadFrom = screenAngle(max); // e.g. −170 → screen −170
  const deadTo = screenAngle(min) - 360; // e.g. +170 → −190
  const wedge = (r1: number, r2: number) => {
    // rounded so server and browser stringify the same path (no hydration diff)
    const p = (r: number, deg: number) => {
      const a = ((deg - 90) * Math.PI) / 180;
      return `${(50 + r * Math.cos(a)).toFixed(3)} ${(50 + r * Math.sin(a)).toFixed(3)}`;
    };
    return `M ${p(r2, deadTo)} A ${r2} ${r2} 0 0 1 ${p(r2, deadFrom)} L ${p(r1, deadFrom)} A ${r1} ${r1} 0 0 0 ${p(r1, deadTo)} Z`;
  };

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <div
        ref={knobRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value > 0 ? '+' : ''}${value} degrees${value > 0 ? ' (left)' : value < 0 ? ' (right)' : ''}`}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          setDragging(true);
          updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => dragging && updateFromPointer(e.clientX, e.clientY)}
        onPointerUp={() => {
          setDragging(false);
          setBlur(0);
        }}
        onPointerCancel={() => {
          setDragging(false);
          setBlur(0);
        }}
        className="relative flex cursor-grab items-center justify-center rounded-full outline-offset-4 select-none active:cursor-grabbing"
        style={{ width: size, height: size, touchAction: 'none' }}
      >
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full text-fg" aria-hidden="true">
          <defs>
            <pattern id={`${id}-hatch`} width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="0.5" height="2.4" fill="currentColor" opacity="0.5" />
            </pattern>
          </defs>
          {/* engraved tick ring: 72 ticks, majors every 45° */}
          {Array.from({ length: 72 }).map((_, i) => {
            const angle = i * 5;
            const major = angle % 45 === 0;
            return (
              <line
                key={i}
                x1="50"
                y1={major ? 2.5 : 4}
                x2="50"
                y2="8"
                transform={`rotate(${angle} 50 50)`}
                stroke="currentColor"
                strokeWidth={major ? 0.6 : 0.4}
                opacity={major ? 0.85 : 0.4}
              />
            );
          })}
          {/* dead zone */}
          <path d={wedge(9.5, 48.5)} fill={`url(#${id}-hatch)`} stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
          {/* forward marker */}
          <text x="50" y="14" textAnchor="middle" fontSize="3.4" fill="currentColor" opacity="0.6" fontFamily="var(--font-mono)">
            FWD
          </text>
        </svg>

        {/* pointer */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={{ rotate: screenAngle(value) }}
          transition={reduce || dragging ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }}
        >
          <span className="absolute left-1/2 h-[16%] w-px -translate-x-1/2 bg-pollen-line" style={{ top: '9%' }} />
          <span className="absolute left-1/2 size-1.5 -translate-x-1/2 rotate-45 bg-pollen-line" style={{ top: '8%' }} />
        </motion.div>

        <div
          className="relative flex items-center justify-center rounded-full border border-hairline bg-surface-1"
          style={{ width: innerSize, height: innerSize }}
        >
          <div style={{ fontSize: innerSize * 0.24 }}>
            <SlidingNumber value={value} blur={blur} />
          </div>
        </div>
      </div>
      <p className="mt-3 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">
        {label} · {min}° … +{max}°
      </p>
    </div>
  );
};

export default KnobSlider;
