'use client';

// Cursor — from Watermelon UI (https://ui.watermelon.sh), a port of animate-ui's Cursor.
// MIT License · Copyright (c) 2025-present Watermelon Contributors (animate-ui, MIT).
// Adapted for Apex Robotics (targeting reticle over the 3D robot):
//   • SCOPED by default (the parent of <CursorProvider> is the zone); global mode kept but
//     discouraged (it hides the cursor on the whole page)
//   • fine pointers only — on touch / coarse pointers nothing renders and the native cursor stays
//   • positions are MotionValues + transforms (no React state per pointermove, no top/left
//     layout); read them yourself with useCursor().x / .y (container-relative px) to aim a turret
//   • default <Cursor> is a hairline crosshair reticle (ticks at 0/90/180/270, centre gap);
//     `variant="arrow"` keeps the original pointer; `locked` draws the LOCK brackets
//   • reduced motion → the follow label has no spring lag
//   • cursor:none comes from `.cursor-none-scope` in globals.css (no runtime <style> injection)
//
//   <div className="relative">            ← the zone (e.g. the robot canvas wrapper)
//     <CursorProvider>
//       <Cursor locked={solution.valid} />
//       <CursorFollow side="bottom" align="end">RANGE 72.4 in · 2,180 RPM</CursorFollow>
//     </CursorProvider>
//   </div>

import * as React from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type HTMLMotionProps,
  type MotionValue,
  type SpringOptions,
} from 'motion/react';
import { cn } from '@/lib/utils';

/* =============================================================================
 * Context
 * ========================================================================== */
type CursorContextType = {
  /** Pointer position relative to the zone (or the viewport in global mode). */
  x: MotionValue<number>;
  y: MotionValue<number>;
  active: boolean;
  global: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

const CursorContext = React.createContext<CursorContextType | null>(null);

function useCursor() {
  const ctx = React.useContext(CursorContext);
  if (!ctx) throw new Error('useCursor must be used within <CursorProvider>');
  return ctx;
}

const subscribeFine = (cb: () => void) => {
  const mql = window.matchMedia('(hover: hover) and (pointer: fine)');
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
};
const getFine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* =============================================================================
 * Provider
 * ========================================================================== */
type CursorProviderProps = Omit<HTMLMotionProps<'div'>, 'ref'> & {
  children?: React.ReactNode;
  global?: boolean;
  /** Hide the native cursor inside the zone while active (default true). */
  hideNativeCursor?: boolean;
};

function CursorProvider({ children, global = false, hideNativeCursor = true, className, ...props }: CursorProviderProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [active, setActive] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const fine = React.useSyncExternalStore(subscribeFine, getFine, () => false);

  React.useEffect(() => {
    if (!fine) return;
    const zone: HTMLElement | Window | null = global ? window : containerRef.current?.parentElement ?? null;
    if (!zone) return;
    const el = global ? document.documentElement : (zone as HTMLElement);
    if (!global && getComputedStyle(el).position === 'static') el.style.position = 'relative';

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      if (global) {
        x.set(e.clientX);
        y.set(e.clientY);
      } else {
        const r = el.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }
      setActive((a) => a || true);
    };
    const leave = (e: PointerEvent | MouseEvent) => {
      if (global) {
        if (e.relatedTarget === null) setActive(false);
      } else if (e.relatedTarget === null || !el.contains(e.relatedTarget as Node)) {
        setActive(false);
      }
    };
    const vis = () => {
      if (document.visibilityState === 'hidden') setActive(false);
    };

    const target = global ? window : el;
    target.addEventListener('pointermove', move as EventListener, { passive: true });
    target.addEventListener('pointerout', leave as EventListener, { passive: true });
    document.addEventListener('visibilitychange', vis);
    return () => {
      target.removeEventListener('pointermove', move as EventListener);
      target.removeEventListener('pointerout', leave as EventListener);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [fine, global, x, y]);

  // Hide the native cursor while the reticle is showing.
  React.useEffect(() => {
    if (!hideNativeCursor) return;
    const el = global ? document.documentElement : containerRef.current?.parentElement;
    if (!el) return;
    el.classList.toggle('cursor-none-scope', active);
    return () => el.classList.remove('cursor-none-scope');
  }, [active, global, hideNativeCursor]);

  return (
    <CursorContext.Provider value={{ x, y, active: active && fine, global, containerRef }}>
      <motion.div
        ref={containerRef}
        data-slot="cursor-container"
        data-global={global}
        data-active={active && fine}
        className={cn('contents', className)}
        {...props}
      >
        {fine ? children : null}
      </motion.div>
    </CursorContext.Provider>
  );
}

/* =============================================================================
 * Cursor (reticle)
 * ========================================================================== */
type CursorProps = Omit<HTMLMotionProps<'div'>, 'ref' | 'children'> & {
  variant?: 'reticle' | 'arrow';
  /** Draw the LOCK brackets (e.g. when the solver has a valid solution). */
  locked?: boolean;
  /** Strike the reticle through (e.g. target out of range). */
  blocked?: boolean;
  /** Reticle size in px (default 40). */
  size?: number;
};

function Cursor({ className, style, variant = 'reticle', locked = false, blocked = false, size = 40, ...props }: CursorProps) {
  const { x, y, active, global } = useCursor();
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          data-slot="cursor"
          aria-hidden="true"
          className={cn('text-fg', className)}
          style={{
            position: global ? 'fixed' : 'absolute',
            left: 0,
            top: 0,
            x,
            y,
            translateX: '-50%',
            translateY: '-50%',
            pointerEvents: 'none',
            zIndex: 30,
            ...style,
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.12 }}
          {...props}
        >
          {variant === 'arrow' ? (
            <svg className="size-6" viewBox="0 0 40 40">
              <path
                fill="currentColor"
                d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
              />
            </svg>
          ) : (
            <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1">
              {/* crosshair with a centre gap */}
              <path d="M20 2v12M20 26v12M2 20h12M26 20h12" />
              <circle cx="20" cy="20" r="1" fill="currentColor" stroke="none" />
              {/* lock brackets */}
              <motion.g initial={false} animate={{ opacity: locked ? 1 : 0, scale: locked ? 1 : 1.35 }} style={{ originX: '20px', originY: '20px' }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
                <path d="M8 13V8h5M27 8h5v5M32 27v5h-5M13 32H8v-5" stroke="var(--pollen-line)" />
              </motion.g>
              {blocked && <path d="M9 31 31 9" strokeOpacity={0.8} />}
            </svg>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* =============================================================================
 * Cursor follow (the spring-lagged readout label)
 * ========================================================================== */
type CursorFollowSide = 'top' | 'right' | 'bottom' | 'left';
type CursorFollowAlign = 'start' | 'center' | 'end';

type CursorFollowProps = Omit<HTMLMotionProps<'div'>, 'ref' | 'transition'> & {
  side?: CursorFollowSide;
  sideOffset?: number;
  align?: CursorFollowAlign;
  alignOffset?: number;
  transition?: SpringOptions;
  children?: React.ReactNode;
};

function CursorFollow({
  className,
  style,
  side = 'bottom',
  sideOffset = 22,
  align = 'end',
  alignOffset = 8,
  transition = { stiffness: 500, damping: 50 },
  children,
  ...props
}: CursorFollowProps) {
  const { x, y, active, global } = useCursor();
  const reduce = useReducedMotion();
  const sx = useSpring(x, reduce ? { stiffness: 1000, damping: 100 } : transition);
  const sy = useSpring(y, reduce ? { stiffness: 1000, damping: 100 } : transition);

  // Offsets are expressed as translate percentages + px so the label never needs measuring.
  const tx =
    side === 'left' ? `calc(-100% - ${sideOffset}px)` : side === 'right' ? `${sideOffset}px` : align === 'start' ? `calc(-100% - ${alignOffset}px)` : align === 'center' ? '-50%' : `${alignOffset}px`;
  const ty =
    side === 'top' ? `calc(-100% - ${sideOffset}px)` : side === 'bottom' ? `${sideOffset}px` : align === 'start' ? `calc(-100% - ${alignOffset}px)` : align === 'center' ? '-50%' : `${alignOffset}px`;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          data-slot="cursor-follow"
          className={cn(
            'rounded-sm border border-hairline bg-surface-1/90 px-2 py-1 font-mono text-[11px] leading-4 tracking-[0.04em] whitespace-nowrap text-fg tabular-nums',
            className,
          )}
          style={{
            position: global ? 'fixed' : 'absolute',
            left: 0,
            top: 0,
            x: sx,
            y: sy,
            translateX: tx,
            translateY: ty,
            pointerEvents: 'none',
            zIndex: 29,
            ...style,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { CursorProvider, Cursor, CursorFollow, useCursor, type CursorProviderProps, type CursorProps, type CursorFollowProps };
