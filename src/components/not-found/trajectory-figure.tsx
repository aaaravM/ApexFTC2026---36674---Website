"use client";

// FIG. 404 — the drawing on the 404 page. Watermelon UI's error-3 shouted a giant glitching "404";
// here the 404 is a measured dimension: a HIVE CELL placed 404 ft away, with two arcs from the
// team's own solver (shot.ts), drawn TO SCALE on wide screens:
//   solid  — the hardest shot APEX-R1 can make: 5,000 rpm through the fixed 40° hood. A POLLEN ball
//            flies it in real time (1.78 s) and comes back down through CELL height 55 ft out.
//   dashed — the arc the solver asked for to reach that CELL: 13,214 rpm. Out of range.
// The motion explains cause → effect (launch · fall short · the arc it would take · the verdict).
// It plays once when the figure scrolls into view; "Replay shot" runs it again.
// Reduced motion, or no JavaScript: the finished drawing, already in the server HTML.

import { cubicBezier } from "motion/react";
import { CountUp } from "@/components/motion";
import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { ballPosition } from "@/lib/ballistics";
import { fmtFeetInches, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRequestedPath } from "./requested-path";
import {
  arcPath,
  CELL_Z_IN,
  MAX_APEX,
  MAX_ARC,
  MAX_LAND_IN,
  MAX_REACH_IN,
  MAX_SHOT,
  pctX,
  pctY,
  REQUIRED,
  REQUIRED_APEX,
  REQUIRED_ARC,
  RULER_TICKS,
  SHEET_H,
  SHEET_W,
  SHORT_BY_IN,
  SHOT_INPUT,
  sx,
  sz,
  T_REACH_S,
  TARGET_FT,
  TARGET_IN,
  type ArcPoint,
} from "./shot";

const MAX_D = arcPath(MAX_ARC);
const REQ_D = arcPath(REQUIRED_ARC);

// Timeline, in seconds after the figure comes into view.
const LAUNCH_AT = 0.45;
const REQ_START = LAUNCH_AT + MAX_SHOT.flightTimeSec + 0.3;
/** The 4.57 s flight the solver wanted, drawn in 1.6 s. */
const REQ_DRAW = 1.6;
const VERDICT_AT = REQ_START + REQ_DRAW + 0.12;
const easeInOut = cubicBezier(0.65, 0, 0.35, 1);

/** Height exaggeration per breakpoint — the drawing is true scale only where it is wide enough. */
const EXAGGERATION = { base: 2.6, md: 1.6 } as const;
const plotStyle = {
  "--nf-ar": `${SHEET_W} / ${Math.round(SHEET_H * EXAGGERATION.base)}`,
  "--nf-ar-md": `${SHEET_W} / ${Math.round(SHEET_H * EXAGGERATION.md)}`,
  "--nf-ar-xl": `${SHEET_W} / ${SHEET_H}`,
} as CSSProperties;

/** Number of samples with t ≤ time (so the arc drawn so far ends exactly at the ball). */
const samplesBefore = (pts: ArcPoint[], time: number) => {
  let i = 0;
  while (i < pts.length && pts[i].t <= time) i++;
  return i;
};

const NEEDS = fmtInt(REQUIRED.flywheelRpm);
const APEX_LABEL = fmtFeetInches(REQUIRED_APEX.z);
const REACH_LABEL = fmtFeetInches(MAX_REACH_IN);
const SHORT_LABEL = fmtFeetInches(SHORT_BY_IN);
/** Where the apex construction line stops, so it never runs through the SHORT BY note. */
const DROP_END_Z = 190;

const note = "font-mono text-[10px] leading-[14px] tracking-[0.08em] uppercase whitespace-nowrap";
/** Revealed by the animation: hidden in the server HTML only when motion is allowed. */
const reveal = "motion-safe:opacity-0 transition-opacity duration-300 ease-out";

export function TrajectoryFigure({ className }: { className?: string }) {
  const [run, setRun] = useState(0);
  const plotRef = useRef<HTMLDivElement>(null);
  const maxRef = useRef<SVGPathElement>(null);
  const reqRef = useRef<SVGPathElement>(null);
  const ballRef = useRef<HTMLSpanElement>(null);
  const maxNoteRef = useRef<HTMLParagraphElement>(null);
  const reachRef = useRef<HTMLSpanElement>(null);
  const apexRef = useRef<SVGGElement>(null);
  const apexNoteRef = useRef<HTMLParagraphElement>(null);
  const shortRef = useRef<SVGLineElement>(null);
  const shortNoteRef = useRef<HTMLParagraphElement>(null);
  const verdictRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const plot = plotRef.current;
    const max = maxRef.current;
    const req = reqRef.current;
    const ball = ballRef.current;
    if (!plot || !max || !req || !ball) return;
    const layers = [maxNoteRef, reachRef, apexRef, apexNoteRef, shortRef, shortNoteRef, verdictRef].map((r) => r.current);
    const show = (node: HTMLElement | SVGElement | null, on = true) => {
      if (node) node.style.opacity = on ? "1" : "0";
    };
    const placeBall = (x: number, z: number) => {
      ball.style.left = pctX(x);
      ball.style.top = pctY(Math.max(0, z));
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // The finished drawing (already what the server rendered).
      max.setAttribute("d", MAX_D);
      req.setAttribute("d", REQ_D);
      placeBall(MAX_LAND_IN, 0);
      [max, req, ball, ...layers].forEach((n) => show(n));
      return;
    }

    // Back to "before the shot". Until now the motion-safe classes kept these hidden — no flash.
    max.setAttribute("d", "");
    req.setAttribute("d", "");
    show(max);
    show(req);
    show(ball, false);
    layers.forEach((n) => show(n, false));
    placeBall(0, SHOT_INPUT.muzzle.z);

    let raf = 0;
    let t0 = 0;
    const frame = (now: number) => {
      if (!t0) t0 = now;
      const t = (now - t0) / 1000;

      // 1 · the max-power shot, in real time
      if (t >= LAUNCH_AT) {
        const tb = Math.min(t - LAUNCH_AT, MAX_SHOT.flightTimeSec);
        const p = ballPosition(SHOT_INPUT, MAX_SHOT, tb);
        const z = Math.max(0, p.z);
        show(ball);
        placeBall(p.x, z);
        max.setAttribute("d", arcPath(MAX_ARC, samplesBefore(MAX_ARC, tb), { x: p.x, z }));
        if (t >= LAUNCH_AT + 0.3) show(maxNoteRef.current);
        if (tb >= T_REACH_S) show(reachRef.current);
      }

      // 2 · the arc the solver asked for — dashed, sped up
      if (t >= REQ_START) {
        const k = Math.min(1, (t - REQ_START) / REQ_DRAW);
        const tr = easeInOut(k) * REQUIRED.flightTimeSec;
        const p = ballPosition(SHOT_INPUT, REQUIRED, tr);
        req.setAttribute("d", arcPath(REQUIRED_ARC, samplesBefore(REQUIRED_ARC, tr), { x: p.x, z: Math.max(0, p.z) }));
        if (tr >= REQUIRED_APEX.time) {
          show(apexRef.current);
          show(apexNoteRef.current);
        }
      }

      // 3 · the verdict
      if (t >= VERDICT_AT) {
        show(shortRef.current);
        show(shortNoteRef.current);
        show(verdictRef.current);
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        raf = requestAnimationFrame(frame);
      },
      { threshold: 0.45 },
    );
    io.observe(plot);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [run]);

  return (
    <figure aria-labelledby="nf-fig-caption" className={cn("relative", className)}>
      {/* Without JavaScript, show the finished drawing. */}
      <noscript>
        <style>{"[data-nf-reveal]{opacity:1!important}"}</style>
      </noscript>

      {/* ── the drawing ─────────────────────────────────────────────────────────────────────── */}
      <div
        ref={plotRef}
        role="img"
        aria-label={`Trajectory drawing. At its 5,000 rpm limit the flywheel throws a POLLEN ball through CELL height ${REACH_LABEL} away, ${SHORT_LABEL} short of a CELL ${TARGET_FT} feet away. Reaching it would need ${NEEDS} rpm, so the solver returns no solution.`}
        style={plotStyle}
        className="relative aspect-(--nf-ar) w-full md:aspect-(--nf-ar-md) xl:aspect-(--nf-ar-xl)"
      >
        <svg
          viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
          fill="none"
          aria-hidden="true"
        >
          {/* the arc the solver asked for */}
          <path
            ref={reqRef}
            data-nf-reveal=""
            d={REQ_D}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="5 6"
            vectorEffect="non-scaling-stroke"
            className="text-fg-muted motion-safe:opacity-0"
          />
          {/* its apex: tick + construction line (the brand motif) */}
          <g ref={apexRef} data-nf-reveal="" className={cn("text-fg-muted", reveal)} stroke="currentColor">
            <line
              x1={sx(REQUIRED_APEX.x)}
              x2={sx(REQUIRED_APEX.x)}
              y1={sz(REQUIRED_APEX.z + 24)}
              y2={sz(REQUIRED_APEX.z - 24)}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              className="text-fg"
            />
            <line
              x1={sx(REQUIRED_APEX.x)}
              x2={sx(REQUIRED_APEX.x)}
              y1={sz(REQUIRED_APEX.z - 24)}
              y2={sz(DROP_END_Z)}
              strokeWidth={1}
              strokeDasharray="1 4"
              vectorEffect="non-scaling-stroke"
              className="opacity-60"
            />
          </g>
          {/* SHORT BY: CELL height, from where the best shot passes to the target */}
          <line
            ref={shortRef}
            data-nf-reveal=""
            x1={sx(MAX_REACH_IN)}
            x2={sx(TARGET_IN)}
            y1={sz(CELL_Z_IN)}
            y2={sz(CELL_Z_IN)}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
            className={cn("text-border-ui", reveal)}
          />
          {/* the hardest shot APEX-R1 can make */}
          <path
            ref={maxRef}
            data-nf-reveal=""
            d={MAX_D}
            stroke="currentColor"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            className="text-fg motion-safe:opacity-0"
          />
          {/* floor, muzzle (14 in up) and the target post (the CELL, 44 in up) */}
          <line x1={0} x2={SHEET_W} y1={sz(0)} y2={sz(0)} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" className="text-border-ui" />
          <line x1={sx(0)} x2={sx(0)} y1={sz(0)} y2={sz(SHOT_INPUT.muzzle.z)} stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="text-fg" />
          <line x1={sx(TARGET_IN)} x2={sx(TARGET_IN)} y1={sz(0)} y2={sz(CELL_Z_IN)} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" className="text-fg-muted" />
        </svg>

        {/* target: a CELL bracket at a fixed pixel size, and the ✕ once the verdict is in */}
        <span aria-hidden="true" className="absolute size-0" style={{ left: pctX(TARGET_IN), top: pctY(CELL_Z_IN) }}>
          <span className="absolute -top-[9px] -left-[8px] block h-[10px] w-[16px] border-x border-b border-fg" />
          <span ref={verdictRef} data-nf-reveal="" className={cn("absolute -top-[26px] -left-[6px] block size-[12px]", reveal)}>
            <span className="absolute top-1/2 left-0 h-px w-full rotate-45 bg-fg" />
            <span className="absolute top-1/2 left-0 h-px w-full -rotate-45 bg-fg" />
          </span>
        </span>

        {/* the POLLEN ball — HTML, so it stays round while the drawing stretches */}
        <span
          ref={ballRef}
          data-nf-reveal=""
          aria-hidden="true"
          className="absolute z-[1] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pollen-edge bg-pollen motion-safe:opacity-0"
          style={{ left: pctX(MAX_LAND_IN), top: pctY(0) }}
        />
        {/* where the best shot comes back down through CELL height */}
        <span
          ref={reachRef}
          data-nf-reveal=""
          aria-hidden="true"
          className={cn("absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-pollen-line bg-bg", reveal)}
          style={{ left: pctX(MAX_REACH_IN), top: pctY(CELL_Z_IN) }}
        />

        {/* notes */}
        <p
          ref={maxNoteRef}
          data-nf-reveal=""
          aria-hidden="true"
          className={cn(note, "absolute -translate-y-[calc(100%+10px)] text-fg", reveal)}
          style={{ left: pctX(0), top: pctY(MAX_APEX.z) }}
        >
          Max · 5,000 rpm
          <span className="block text-fg-muted">Reach {REACH_LABEL}</span>
        </p>
        <p
          ref={apexNoteRef}
          data-nf-reveal=""
          aria-hidden="true"
          className={cn(note, "absolute -translate-x-1/2 translate-y-[12px] text-center text-fg", reveal)}
          style={{ left: pctX(REQUIRED_APEX.x), top: pctY(REQUIRED_APEX.z) }}
        >
          Apex · {APEX_LABEL}
          <span className="block text-fg-muted">Needs {NEEDS} rpm</span>
        </p>
        <p
          ref={shortNoteRef}
          data-nf-reveal=""
          aria-hidden="true"
          className={cn(note, "absolute -translate-x-1/2 -translate-y-[calc(100%+5px)] text-fg-muted", reveal)}
          style={{ left: pctX((MAX_REACH_IN + TARGET_IN) / 2), top: pctY(CELL_Z_IN) }}
        >
          Short by {SHORT_LABEL}
        </p>
      </div>

      {/* ── floor ruler: a tick every 10 ft, long every 50 ft ────────────────────────────────── */}
      <div aria-hidden="true" className="relative h-9">
        {RULER_TICKS.map((tick) => (
          <span
            key={tick.ft}
            className={cn("absolute top-0 w-px", tick.major ? "h-2 bg-border-ui" : "h-1 bg-hairline-strong")}
            style={{ left: pctX(tick.x) }}
          />
        ))}
        <span className={cn(note, "absolute top-4 text-fg")} style={{ left: pctX(0) }}>
          APEX-R1
        </span>
        {/* (no label next to the target post — "400 ft" would collide with the target's name) */}
        {RULER_TICKS.filter((t) => t.label && TARGET_FT - t.ft > 40).map((tick) => (
          <span key={tick.ft} className={cn(note, "absolute top-4 hidden -translate-x-1/2 text-fg-muted md:block")} style={{ left: pctX(tick.x) }}>
            {tick.ft} ft
          </span>
        ))}
        {/* set just left of the target post, so its extension line never runs through the name */}
        <span className={cn(note, "absolute top-4 text-right text-fg")} style={{ right: `calc(100% - ${pctX(TARGET_IN)} + 10px)` }}>
          <Suspense fallback="Target">
            <TargetName />
          </Suspense>
        </span>
      </div>

      {/* ── the overall dimension, set large: the page is 404 ft away ────────────────────────── */}
      <div aria-hidden="true" className="relative">
        {/* extension lines from the muzzle and the target */}
        <span className="absolute -top-9 bottom-1/2 w-px bg-hairline-strong" style={{ left: pctX(0) }} />
        <span className="absolute -top-9 bottom-1/2 w-px bg-hairline-strong" style={{ left: pctX(TARGET_IN) }} />
        {/* dimension line with arrowheads */}
        <span className="absolute top-1/2 h-px bg-border-ui" style={{ left: pctX(0), right: `calc(100% - ${pctX(TARGET_IN)})` }} />
        <svg viewBox="0 0 8 8" className="absolute top-1/2 size-2 -translate-y-1/2 text-border-ui" style={{ left: pctX(0) }} fill="currentColor">
          <path d="M0 4 8 0.8v6.4Z" />
        </svg>
        <svg
          viewBox="0 0 8 8"
          className="absolute top-1/2 size-2 -translate-x-full -translate-y-1/2 text-border-ui"
          style={{ left: pctX(TARGET_IN) }}
          fill="currentColor"
        >
          <path d="M8 4 0 0.8v6.4Z" />
        </svg>
        <p className="relative mx-auto w-max bg-bg px-[0.18em] text-center font-sans text-[clamp(64px,10.5vw,156px)] leading-[1.02] font-[250] tracking-[-0.01em] text-fg [font-stretch:125%]">
          <CountUp value={TARGET_FT} duration={1.8} />
          <span className="ml-[0.1em] font-mono text-[0.14em] font-normal tracking-[0.08em] text-fg-muted uppercase [font-stretch:100%]">
            ft
          </span>
        </p>
      </div>

      <figcaption
        id="nf-fig-caption"
        className="mt-6 flex flex-col gap-4 border-t border-hairline pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-10"
      >
        <p className="max-w-[92ch] text-[13px] leading-[1.6] text-fg-muted">
          <span className="mr-2 font-mono text-[11px] tracking-[0.08em] text-fg uppercase">Fig. 404</span>
          Solid: the hardest shot APEX-R1 can make — 5,000 rpm through the fixed 40° hood — comes down through CELL height{" "}
          {REACH_LABEL} out. Dashed: the arc a CELL {TARGET_FT} ft away would need, at {NEEDS} rpm. Our solver&apos;s model,
          no air drag;{" "}
          <span className="md:hidden">heights exaggerated ×{EXAGGERATION.base}.</span>
          <span className="hidden md:inline xl:hidden">heights exaggerated ×{EXAGGERATION.md}.</span>
          <span className="hidden xl:inline">drawn to scale.</span>
        </p>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-sm border border-hairline px-3 font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase transition-colors duration-[120ms] hover:border-border-ui hover:text-fg motion-reduce:hidden"
        >
          <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden="true">
            <path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89M13.5 2.5v3h-3" stroke="currentColor" strokeWidth="1.25" />
          </svg>
          Replay shot
        </button>
      </figcaption>
    </figure>
  );
}

/** "TARGET /the/missing/page" — read after hydration (one 404 HTML serves every bad address). */
function TargetName() {
  const path = useRequestedPath();
  return (
    <>
      Target <span className="inline-block max-w-[min(42vw,240px)] truncate align-bottom normal-case">{path ?? ""}</span>
    </>
  );
}
