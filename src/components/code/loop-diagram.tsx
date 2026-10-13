"use client";

// The per-loop pipeline (docs/03-ARCHITECTURE.md · TeleOpMain.java): six calls in dependency order,
// drawn as a closed track. A pulse runs the "execution" rail past each step (its LED lights and,
// on the first pass, its one-line job opens), then returns along the far rail: NEXT LOOP. The count
// ticks per pass. Shown slowed down — on the robot this happens every loop.
// Horizontal ≥ lg, vertical below. Reduced motion: no pulse; every step open; static track.
// Pauses offscreen, when hidden by Activity (effects unmount) and on demand (Pause button).

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useReducedMotion, type Variants } from "motion/react";
import { Pause, Play } from "lucide-react";
import type { PipelineStep } from "@/content/code";
import { useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface Pt {
  x: number;
  y: number;
}
interface Seg {
  a: Pt;
  b: Pt;
  ms: number;
  exec: boolean;
}
interface Geom {
  w: number;
  h: number;
  vertical: boolean;
  /** Track rectangle. */
  L: number;
  R: number;
  T: number;
  B: number;
  /** Node centres along the execution axis. */
  centres: number[];
  half: number[];
}

// Entrance: the steps rise in left→right (opacity on the <li> so the track measurement is never
// skewed by a transform; the rise is on the inner content), then the track draws around them.
const listV: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const itemV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const innerV: Variants = {
  hidden: { y: 16 },
  show: { y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const STAGE_MS = 520;
const FIRST_STAGE_MS = 980;
const r1 = (n: number) => Math.round(n * 10) / 10;

function segmentsFor(g: Geom, stageMs: number, n: number): Seg[] {
  const { L, R, T, B, vertical } = g;
  const tl = { x: L, y: T };
  const tr = { x: R, y: T };
  const br = { x: R, y: B };
  const bl = { x: L, y: B };
  const exec = n * stageMs;
  return vertical
    ? [
        { a: tl, b: bl, ms: exec, exec: true },
        { a: bl, b: br, ms: 260, exec: false },
        { a: br, b: tr, ms: 760, exec: false },
        { a: tr, b: tl, ms: 260, exec: false },
      ]
    : [
        { a: tl, b: tr, ms: exec, exec: true },
        { a: tr, b: br, ms: 220, exec: false },
        { a: br, b: bl, ms: 820, exec: false },
        { a: bl, b: tl, ms: 220, exec: false },
      ];
}

export function LoopDiagram({ steps, className }: { steps: PipelineStep[]; className?: string }) {
  // Server and hydration render the motion path; the reduced-motion branch applies after mount so
  // the markup always matches.
  const mounted = useMounted();
  const reduce = (useReducedMotion() ?? false) && mounted;
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const inView = useInView(wrapRef, { amount: 0.3 });
  const seen = useInView(wrapRef, { amount: 0.25, once: true });
  const [geom, setGeom] = useState<Geom | null>(null);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(-1);
  const [revealed, setRevealed] = useState(0);
  const [loops, setLoops] = useState(0);
  const dotX = useMotionValue(-100);
  const dotY = useMotionValue(-100);
  const n = steps.length;

  // Measure the track around the node list (ResizeObserver fires once on observe, then on change).
  useEffect(() => {
    const wrap = wrapRef.current;
    const list = listRef.current;
    if (!wrap || !list) return;
    const measure = () => {
      const wr = wrap.getBoundingClientRect();
      const lr = list.getBoundingClientRect();
      const items = Array.from(list.children) as HTMLElement[];
      if (items.length < 2) return;
      const r0 = items[0].getBoundingClientRect();
      const rB = items[1].getBoundingClientRect();
      const vertical = Math.abs(rB.top - r0.top) > 4;
      const pad = 12;
      const L = lr.left - wr.left - pad;
      const R = lr.right - wr.left + pad;
      const T = lr.top - wr.top - pad;
      const B = lr.bottom - wr.top + pad;
      const centres: number[] = [];
      const half: number[] = [];
      for (const el of items) {
        const r = el.getBoundingClientRect();
        centres.push(vertical ? r.top - wr.top + r.height / 2 : r.left - wr.left + r.width / 2);
        half.push((vertical ? r.height : r.width) / 2);
      }
      setGeom({ w: wr.width, h: wr.height, vertical, L: r1(L), R: r1(R), T: r1(T), B: r1(B), centres, half });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  const firstPass = revealed < n;
  const running = !!geom && inView && !paused && !reduce;

  // The pulse. Writes the dot position into motion values (no re-render per frame); state only
  // changes when the active step or the loop count changes.
  useEffect(() => {
    if (!running || !geom) return;
    let raf = 0;
    let start = -1;
    let lastActive = -2;
    let lastCycle = 0;
    let stageMs = firstPass ? FIRST_STAGE_MS : STAGE_MS;
    let segs = segmentsFor(geom, stageMs, n);
    let total = segs.reduce((s, x) => s + x.ms, 0);
    const tick = (now: number) => {
      if (start < 0) start = now;
      const elapsed = now - start;
      const cycle = Math.floor(elapsed / total);
      if (cycle !== lastCycle) {
        lastCycle = cycle;
        setLoops((c) => c + 1);
        if (stageMs !== STAGE_MS) {
          // first (revealing) pass done → normal speed from here on
          stageMs = STAGE_MS;
          segs = segmentsFor(geom, stageMs, n);
          total = segs.reduce((s, x) => s + x.ms, 0);
          start = now;
          lastCycle = 0;
        }
      }
      let t = (now - start) % total;
      let seg = segs[0];
      for (const s of segs) {
        if (t <= s.ms) {
          seg = s;
          break;
        }
        t -= s.ms;
      }
      const f = seg.ms ? Math.min(1, t / seg.ms) : 1;
      const x = seg.a.x + (seg.b.x - seg.a.x) * f;
      const y = seg.a.y + (seg.b.y - seg.a.y) * f;
      dotX.set(x);
      dotY.set(y);
      let next = -1;
      if (seg.exec) {
        const along = geom.vertical ? y : x;
        next = geom.centres.findIndex((c, i) => Math.abs(along - c) <= geom.half[i]);
      }
      if (next !== lastActive) {
        lastActive = next;
        setActive(next);
        if (next >= 0) setRevealed((r) => Math.max(r, next + 1));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // firstPass is read once per run; the pass switches speed internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, geom, n, dotX, dotY]);

  const allOpen = !mounted || reduce || paused;
  const isOpen = (i: number) => allOpen || i < revealed;
  const showDot = running || (paused && !!geom && !reduce);

  const togglePause = () => {
    setPaused((p) => !p);
    setRevealed(n); // never leave a step closed
  };

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase">
          <span className="text-fg tabular-nums">LOOP {String(loops).padStart(4, "0")}</span>
          <span aria-hidden="true"> · </span>
          <span>Once per loop, in this order · shown slowed down</span>
        </p>
        {!reduce && (
          <button
            type="button"
            onClick={togglePause}
            aria-pressed={paused}
            className="inline-flex h-8 items-center gap-2 rounded-sm border border-hairline px-3 font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase transition-colors hover:border-border-ui hover:text-fg"
          >
            {paused ? <Play className="size-3" aria-hidden="true" strokeWidth={1.75} /> : <Pause className="size-3" aria-hidden="true" strokeWidth={1.75} />}
            {paused ? "Play" : "Pause"}
          </button>
        )}
      </div>

      <div ref={wrapRef} className="relative py-7 pr-5 pl-7 lg:px-5">
        {/* track */}
        {geom && (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full overflow-visible text-border-ui"
            viewBox={`0 0 ${r1(geom.w)} ${r1(geom.h)}`}
            preserveAspectRatio="none"
          >
            <rect
              className="code-draw"
              data-armed={!reduce && !seen}
              pathLength={1}
              x={geom.L}
              y={geom.T}
              width={r1(geom.R - geom.L)}
              height={r1(geom.B - geom.T)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.55}
            />
            {/* execution rail drawn stronger */}
            {geom.vertical ? (
              <line x1={geom.L} x2={geom.L} y1={geom.T} y2={geom.B} stroke="var(--text)" strokeOpacity={0.5} strokeWidth={1} />
            ) : (
              <line x1={geom.L} x2={geom.R} y1={geom.T} y2={geom.T} stroke="var(--text)" strokeOpacity={0.5} strokeWidth={1} />
            )}
            {/* taps from the rail into each step */}
            {geom.centres.map((c, i) =>
              geom.vertical ? (
                <line key={i} x1={geom.L} x2={geom.L + 12} y1={r1(c)} y2={r1(c)} stroke="var(--text)" strokeOpacity={0.5} strokeWidth={1} />
              ) : (
                <line key={i} x1={r1(c)} x2={r1(c)} y1={geom.T} y2={geom.T + 12} stroke="var(--text)" strokeOpacity={0.5} strokeWidth={1} />
              ),
            )}
            {/* direction chevrons on the return rail */}
            {geom.vertical ? (
              <path d={`M${geom.R - 4} ${r1((geom.T + geom.B) / 2 + 4)} L${geom.R} ${r1((geom.T + geom.B) / 2 - 2)} L${geom.R + 4} ${r1((geom.T + geom.B) / 2 + 4)}`} fill="none" stroke="currentColor" strokeWidth={1} />
            ) : (
              <path d={`M${r1((geom.L + geom.R) / 2 + 4)} ${geom.B - 4} L${r1((geom.L + geom.R) / 2 - 2)} ${geom.B} L${r1((geom.L + geom.R) / 2 + 4)} ${geom.B + 4}`} fill="none" stroke="currentColor" strokeWidth={1} />
            )}
          </svg>
        )}
        {geom && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute bg-bg px-2 font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase",
              geom.vertical ? "origin-left rotate-90" : "-translate-x-1/2 -translate-y-1/2",
            )}
            style={
              geom.vertical
                ? { left: geom.R + 7, top: r1((geom.T + geom.B) / 2 + 22) }
                : { left: r1((geom.L + geom.R) / 2 + 64), top: geom.B }
            }
          >
            Next loop
          </span>
        )}
        {showDot && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-10 -mt-[4px] -ml-[4px] size-2 rounded-full bg-pollen-line shadow-[0_0_0_4px_color-mix(in_oklab,var(--pollen-line)_22%,transparent)]"
            style={{ x: dotX, y: dotY }}
          />
        )}

        <motion.ol
          ref={listRef}
          className="relative grid gap-[var(--gutter)] lg:grid-cols-6"
          variants={listV}
          initial={reduce ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {steps.map((s, i) => {
            const on = active === i;
            const open = isOpen(i);
            return (
              <motion.li
                key={s.id}
                variants={itemV}
                className={cn(
                  "relative flex min-w-0 flex-col border bg-bg transition-[border-color] duration-[420ms] ease-out",
                  on ? "border-border-ui" : "border-hairline",
                )}
              >
                <motion.div variants={innerV} className="flex flex-1 flex-col">
                <div className="flex h-9 items-center justify-between border-b border-hairline px-4">
                  <span className="font-mono text-[11px] tracking-[0.08em] text-fg-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 rounded-full transition-[background-color,box-shadow] ease-out",
                      on
                        ? "bg-pollen-line shadow-[0_0_0_3px_color-mix(in_oklab,var(--pollen-line)_25%,transparent)] duration-[80ms]"
                        : "bg-border-ui duration-[600ms]",
                    )}
                  />
                </div>
                <div className="flex flex-1 flex-col px-4 pt-4 pb-5">
                  <h3 className="font-display text-[19px] leading-tight font-[560] [font-stretch:108%]">{s.name}</h3>
                  <p className="mt-1.5 font-mono text-[11.5px] leading-5 [overflow-wrap:anywhere] text-fg-muted">
                    {/* prefer line breaks after a dot or a "+" */}
                    {s.call.split(/(?<=[.+] ?)/).map((part, k) => (
                      <span key={k}>
                        {k > 0 && <wbr />}
                        {part}
                      </span>
                    ))}
                  </p>
                  <p
                    className={cn(
                      "mt-4 text-[14px] leading-[1.5] text-lede transition-[clip-path,opacity,translate] duration-[420ms] ease-out motion-reduce:transition-none",
                      open ? "[clip-path:inset(0_0_0_0)] opacity-100" : "translate-y-1 [clip-path:inset(0_0_100%_0)] opacity-0",
                    )}
                  >
                    {s.job}
                  </p>
                  <p className="mt-auto pt-5 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
                    <span aria-hidden="true">→ </span>
                    <span className="sr-only">Hands on: </span>
                    {s.output}
                  </p>
                </div>
                </motion.div>
                {i < n - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-full left-1/2 flex h-[var(--gutter)] w-px -translate-x-1/2 items-center justify-center lg:top-[18px] lg:left-full lg:h-px lg:w-[var(--gutter)] lg:translate-x-0 lg:-translate-y-1/2"
                  >
                    <span className="font-mono text-[11px] leading-none text-fg-muted">
                      <span className="lg:hidden">↓</span>
                      <span className="hidden lg:inline">→</span>
                    </span>
                  </span>
                )}
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </div>
  );
}
