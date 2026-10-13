"use client";

// Plot motion — the CAD page's own motion vocabulary, so the drawing sheet feels PLOTTED rather
// than swiped in. A <Plot> is a trigger: when it scrolls into view (or on first paint with
// `immediate`) it flips data-plot="armed" → "play", and every descendant with an `fx-*` class
// runs its effect (CSS in ./cad.css), sequenced by its `--i` index × `step`:
//
//   fx-stamp   rubber stamp: lands from 1.25× with a slight twist (PENDING marks, sheet codes)
//   fx-type    typewriter: stepped left→right clip (table rows, notes, revision rows)
//   fx-slide   carriage feed: row slides in from the left (model index, risk rows)
//   fx-tilt    card flips down off a rail (perspective rotateX — toolchain)
//   fx-rise    soft rise (list items)
//   fx-rule    a row's bottom rule draws under it (::after)
//   fx-tick    ruler ticks tick in one by one
//   fx-arc     SVG strokes plot along their length (pathLength="1")
//   fx-check   a check mark is drawn (SVG pathLength="1")
//   fx-hl      pollen highlighter sweeps behind a word
//   fx-node / fx-stub   flowchart node + connector (design stories)
//   fx-ext / fx-half-l / fx-half-r / fx-arrow   dimension callouts
//
// Like the shared kit: the server renders the FINAL state, on-screen-at-load content stays static,
// and reduced motion never arms (cad.css also neutralises every fx under reduced motion).

import { animate, motion, useScroll, useSpring, useTransform } from "motion/react";
import { useLayoutEffect, useRef, type CSSProperties, type ElementType, type ReactNode, type RefObject } from "react";
import { nf } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PlotOptions {
  immediate?: boolean;
  /** Fraction of the viewport bottom ignored before triggering. */
  inset?: number;
  onArm?: () => void;
  onPlay?: () => void;
}

export function usePlot(ref: RefObject<HTMLElement | null>, { immediate, inset = 0.14, onArm, onPlay }: PlotOptions = {}) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.plotted) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const play = () => {
      el.dataset.plot = "play";
      el.dataset.plotted = "";
      onPlay?.();
    };
    if (immediate) {
      onArm?.();
      play();
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // on screen at load → stay static
    el.dataset.plot = "armed";
    onArm?.();
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          play();
          io.disconnect();
        }
      },
      { rootMargin: `0px 0px -${Math.round(inset * 100)}% 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, inset]);
}

export function Plot({
  as: Tag = "div",
  children,
  className,
  style,
  immediate,
  delay = 0,
  step = 0.08,
  inset,
  id,
  "aria-labelledby": labelledBy,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  immediate?: boolean;
  /** Seconds before the first item starts. */
  delay?: number;
  /** Seconds between consecutive `--i` items. */
  step?: number;
  inset?: number;
  id?: string;
  "aria-labelledby"?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  usePlot(ref, { immediate, inset });
  return (
    <Tag
      ref={ref}
      id={id}
      aria-labelledby={labelledBy}
      className={className}
      data-plot={immediate ? "play" : undefined}
      style={{ "--fx-delay": `${delay}s`, "--fx-step": `${step}s`, ...style } as CSSProperties}
    >
      {children}
    </Tag>
  );
}


/** A number that counts up AFTER its dimension line has drawn (delay in seconds). */
export function PlotCount({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  delay = 0,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) => `${prefix}${nf({ minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)}${suffix}`;
  const final = fmt(value);
  usePlot(ref, {
    inset: 0.1,
    onArm: () => {
      if (out.current) out.current.textContent = fmt(0);
    },
    onPlay: () => {
      const el = out.current;
      if (!el) return;
      animate(0, value, {
        delay,
        duration: Math.min(1.3, 0.7 + Math.log10(Math.abs(value) + 1) * 0.2),
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => (el.textContent = fmt(v)),
        onComplete: () => (el.textContent = final),
      });
    },
  });
  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      <span className="sr-only">{final}</span>
      <span ref={out} aria-hidden="true">
        {final}
      </span>
    </span>
  );
}

/** The design-story spine: a pen line that draws down the flowchart as you scroll through it,
 *  with a small pen-tip arrowhead riding its end. Decorative. Place inside a `relative` list. */
export function FlowSpine({ target, className }: { target: RefObject<HTMLElement | null>; className?: string }) {
  // Same markup on server and client (no reduced-motion branch → no hydration mismatch);
  // under reduced motion ./plot.css shows the spine fully drawn and hides the pen tip.
  const { scrollYProgress } = useScroll({ target, offset: ["start 72%", "end 55%"] });
  const p = useSpring(scrollYProgress, { stiffness: 180, damping: 32, mass: 0.6 });
  const top = useTransform(p, (v) => `${v * 100}%`);
  return (
    <span aria-hidden="true" className={cn("dwg-spine", className)}>
      <motion.span className="dwg-spine-ink" style={{ scaleY: p }} />
      <motion.span className="dwg-spine-tip" style={{ top }}>
        <svg viewBox="0 0 8 6" className="h-1.5 w-2 fill-current">
          <path d="M4 6 L0 0 L8 0 Z" />
        </svg>
      </motion.span>
    </span>
  );
}

/** VIEW 1 plots in: a paper cover retreats behind a scan line that sweeps left → right, with a
 *  mono readout riding the pen. Overlay inside the viewport (pointer-events none). */
export function PlotScan({ label = "Plotting view 1" }: { label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  usePlot(ref, { inset: 0.18 });
  return (
    <div ref={ref} aria-hidden="true" className="dwg-scan">
      <span className="dwg-scan-cover" />
      <span className="dwg-scan-pen">
        <span className="dwg-scan-label">{label}</span>
      </span>
    </div>
  );
}
