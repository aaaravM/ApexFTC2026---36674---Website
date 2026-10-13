// ArcMotif — the brand thread (DESIGN_SPEC §0) drawn as a TRAJECTORY PLATE: one real shot from the
// team's solver (src/lib/ballistics.ts — fixed 40° hood, 14 in muzzle, 4 in flywheel, POLLEN η 0.50 /
// NECTAR η 0.42) set out like a figure in an engineering manual, at TRUE SCALE (one uniform scale,
// never stretched):
//   · a 12 in dot grid, the floor with a ground hatch
//   · the muzzle (a ball-sized circle) with its 14 in height dimension and the 40° launch angle
//   · the arc — a solid hairline that draws itself in — with a tick every 0.1 s of flight, and a
//     POLLEN ball that flies it in REAL time, hits the CELL's back wall and drops in
//   · the apex marker + callout, dimension lines for range and apex height (numbers count up)
//   · the solver's answer (RPM · flight time · hood · iterations) and one plain sentence on what
//     this shot shows, in a spec block beside (wide) or under (narrow) the drawing
// Labels are fixed-size HTML anchored to world points with pixel offsets, so they never scale into
// the lines; the cases that would crowd them are laid out in code: the apex AT the CELL (the shot the
// data sheet draws), the ball still rising at the CELL (ERRATA #3 — no apex marker), and shots with no
// solution, which draw the hardest shot the robot can make, with the solver's own failReason.
//
//   <ArcMotif />                                                     96 in to a 40 in-high target
//   <ArcMotif distanceIn={94} targetHeightIn={53.4} showTarget showReadout draw="scroll" />
//   <ArcMotif distanceIn={30} targetHeightIn={53.4} showTarget />     NO SOLUTION — back up
//   <ArcMotif ball="NECTAR_RED" title="[ SHOT · NECTAR ]" />
//
// Server component: every number and the finished drawing are in the server HTML (rounded, so the
// markup is identical wherever it renders). The animation is ./arc-motif-client.tsx; reduced motion
// keeps the finished drawing (ball in the CELL, or at the apex of a shot that peaks mid-flight).

import type { CSSProperties, ReactNode } from "react";
import { Scramble } from "@/components/motion";
import { apexOf, BALLS, ballPosition, G_IN_S2, SHOOTER, solve, type BallKind, type Solution, type SolveInput } from "@/lib/ballistics";
import { fmtFixed, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArcPlatePlayer, type PlateFlight } from "./arc-motif-client";
import { CUP, hatchPath, TICK_S } from "./arc-motif-geom";
import "./arc-motif.css";

export interface ArcMotifProps {
  /** Horizontal distance from the muzzle to the target, inches. */
  distanceIn?: number;
  /** Target height above the floor, inches. */
  targetHeightIn?: number;
  ball?: BallKind;
  /** Draw the floor line + ground hatch (default true). */
  floor?: boolean;
  /** Draw the CELL at the target, with its label. */
  showTarget?: boolean;
  /** Show the solver's answer (RPM · flight time · hood · iterations) and the note, in a spec block. */
  showReadout?: boolean;
  /** Override the callout's first line (or, with no solution, the reason line). Keep it real. */
  label?: string;
  /** "scroll": the plate draws itself in when it scrolls into view, then fires the ball once. */
  draw?: "none" | "scroll";
  /** Exaggerate heights (1 = true scale, the default). */
  verticalScale?: number;
  className?: string;
  /** Header, left (default "[ SHOT · POLLEN ]"). */
  title?: string;
  /** Header, right, after "SOLVER ·" (default "Ballistics.java"). */
  source?: string;
  /** The sentence under the solver's answer (with showReadout). Default: what this shot shows, from the solver's numbers. false hides it. */
  note?: ReactNode | false;
}

const DEG = Math.PI / 180;
/** RobotConstants.Shoot.MUZZLE_Z_IN — the plate's origin is the muzzle, on the floor line. */
const MUZZLE = { x: 0, y: 0, z: SHOOTER.muzzleHeightIn };
/** Dot-grid pitch: 12 in, coarser only when a very long shot would make it a texture. */
const GRID_STEPS = [12, 48, 120];
const SAMPLES = 72;
/** A tick label ("0.1 s") at 10px mono with its 2px padding, CSS px. */
const TICK_LABEL = { w: 41, h: 14 };

const r3 = (n: number) => Math.round(n * 1000) / 1000;
/** 94 → "94", 53.36 → "53.4" */
const isWhole = (n: number) => Math.abs(n - Math.round(n)) < 0.05;
const fmtIn = (n: number) => (isWhole(n) ? fmtInt(n) : fmtFixed(n, 1));

/** A number the client counts up from zero (the server prints the final value). */
function Num({ value, decimals = 0 }: { value: number; decimals?: number }) {
  return (
    <span data-ap-count={r3(value)} data-dec={decimals}>
      {decimals ? fmtFixed(value, decimals) : fmtInt(value)}
    </span>
  );
}

/** Filled arrowhead pointing left, tip at (0, 4) — CSS rotates it for the other directions. */
function Arrow({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 8 8" className={cn("ap-arrow", className)} aria-hidden="true">
      <path d="M0 4 8 1v6Z" fill="currentColor" />
    </svg>
  );
}

type Box = { l: number; t: number; r: number; b: number };
const overlaps = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

export function ArcMotif({
  distanceIn = 96,
  targetHeightIn = 40,
  ball = "POLLEN",
  floor = true,
  showTarget = false,
  showReadout = false,
  label,
  draw = "none",
  verticalScale = 1,
  className,
  title,
  source = "Ballistics.java",
  note,
}: ArcMotifProps) {
  const vs = verticalScale > 0 ? verticalScale : 1;
  const d = distanceIn;
  const zt = targetHeightIn;
  const input: SolveInput = { muzzle: MUZZLE, target: { x: d, y: 0, z: zt }, ball };
  const sol = solve(input);
  const valid = sol.valid;
  const spec = BALLS[ball];
  const r = spec.diameterIn / 2;

  // The flight we draw: the solver's shot — or, with no solution, the hardest shot the robot can make
  // (MAX_FLYWHEEL_RPM through the fixed hood), which passes under the target or lands short of it.
  const theta = SHOOTER.launchPitchDeg * DEG;
  const maxExitIn = (SHOOTER.maxFlywheelRpm * spec.transferEfficiency * Math.PI * SHOOTER.flywheelDiameterIn) / 60;
  const shot: Solution = valid ? sol : { ...sol, muzzleSpeedIn: maxExitIn, fieldAzimuthRad: 0 };
  const vx = shot.muzzleSpeedIn * Math.cos(theta);
  const vz0 = shot.muzzleSpeedIn * Math.sin(theta);
  const at = (t: number) => ballPosition(input, shot, t);
  const tAtX = (x: number) => (x - MUZZLE.x) / vx;
  /** when the ball would come down onto the floor */
  const tFloor = (vz0 + Math.sqrt(vz0 * vz0 + 2 * G_IN_S2 * (MUZZLE.z - r))) / G_IN_S2;
  const passesUnder = !valid && tAtX(d) <= tFloor;
  const tEnd = valid ? sol.flightTimeSec : Math.min(tAtX(d), tFloor);
  const pts = Array.from({ length: SAMPLES + 1 }, (_, i) => at((tEnd * i) / SAMPLES));
  const end = pts[SAMPLES];

  // ── the CELL: an open catcher whose near lip sits under the ball's path and whose back wall rises
  //    above where the ball meets it, so the arc visibly enters it and the ball is caught ──
  const cell = showTarget || !valid;
  const nearX = d - CUP.halfW;
  const farX = d + CUP.halfW;
  const zNear = valid ? at(tAtX(nearX)).z : zt;
  /** the ball meets the back wall here (its centre, one radius short of the wall) */
  const wall = valid ? { t: tAtX(farX - r), ...at(tAtX(farX - r)) } : null;
  const lipNear = Math.min(zt, zNear) - r - CUP.clear;
  const lipFar = Math.max(zt, wall ? wall.z : zt) + r * 0.5;
  const cupFloor = lipNear - CUP.depth;
  /** where the ball comes to rest after a shot into the CELL */
  const rest = valid && cell ? { x: d, z: r3(cupFloor + r + 0.15) } : null;

  // ERRATA #3: with the fixed hood the apex can come AFTER the ball reaches the CELL — then there is
  // no apex to mark; the callout says RISING AT TARGET. No-solution shots get no apex at all.
  const apex = apexOf(input, shot);
  const showApex = valid && apex.time < sol.flightTimeSec;
  const rising = valid && !showApex;
  /** the apex is over the CELL itself (the data sheet's shot: 0.18 in before it) */
  const atTarget = showApex && d - apex.x < CUP.halfW;
  const midApex = showApex && !atTarget;
  const what = cell ? "CELL" : "target";
  const vzArr = vz0 - G_IN_S2 * tEnd;
  const arrDeg = Math.atan2(vzArr, vx) / DEG;
  const arrSpeed = Math.hypot(vx, vzArr);
  const level = Math.abs(arrDeg) < 1.5;
  /** v² ∝ d² / (d·tanθ − h) is least at d = 2h / tanθ — exactly where the apex lands on the target */
  const leastRpmIn = (2 * (zt - MUZZLE.z)) / Math.tan(theta);
  const leastRpm = valid && Math.abs(d - leastRpmIn) < 1;

  // ── the world window (inches): the floor is the bottom edge, the muzzle sits 3 in from the left ──
  const arcTop = Math.max(...pts.map((p) => p.z));
  const zTop = Math.max(arcTop + r, MUZZLE.z + r, cell ? lipFar : zt) + 1.5;
  const xMin = -3;
  const xMax = Math.max(cell ? farX : d, end.x + r) + 1.5;
  const W = r3(xMax - xMin);
  const H = r3(zTop * vs);
  const X = (x: number) => x.toFixed(2);
  const Y = (z: number) => (-z * vs).toFixed(2);
  /** CSS position of a world point inside the stage (identical at every scale). */
  const L = (x: number) => `${r3(((x - xMin) / W) * 100)}%`;
  const T = (z: number) => `${r3(((zTop - z) / zTop) * 100)}%`;
  /** A world length in CSS pixels (--ap-s = px per inch, see arc-motif.css). */
  const S = (inches: number) => `${r3(inches)} * var(--ap-s)`;
  // typical scales, px per inch (arc-motif.css), for the grid pitch and the muzzle label's fit: wide
  // (stage ≤ 320px tall) and narrow (≤ 316 wide, ≤ 210 tall). Label placement tests more (below).
  const sWide = Math.min(1000 / W, 320 / H);
  const sNarrow = Math.min(316 / W, 210 / H);

  // decorative layers, generous enough to fill the drawing area around the shot (clipped by CSS)
  const gridIn = GRID_STEPS.find((g) => g * sWide >= 24) ?? GRID_STEPS[GRID_STEPS.length - 1];
  let grid = "";
  for (let x = Math.ceil((xMin - 11 * gridIn) / gridIn) * gridIn; x <= xMax + 11 * gridIn; x += gridIn)
    for (let z = gridIn; z <= zTop + 7 * gridIn; z += gridIn) grid += `M${x} ${Y(z)}h.01`;
  const hatch = hatchPath(xMin - 240, xMax + 240);

  const arcD = pts.map((p, i) => `${i ? "L" : "M"}${X(p.x)} ${Y(p.z)}`).join("");
  const cupD = `M${X(nearX)} ${Y(lipNear)}V${Y(cupFloor)}H${X(farX)}V${Y(lipFar)}`;

  // where the ball is drawn at rest (server + reduced motion): in the CELL — or at the apex of a shot
  // that peaks mid-flight (the brand's point), or where the flight ends. With no solution the robot
  // holds its fire: the ball stays loaded in the muzzle (the arc is the attempt it will not make).
  const still = !valid
    ? { x: MUZZLE.x, z: MUZZLE.z }
    : midApex
      ? { x: apex.x, z: apex.z }
      : (rest ?? { x: end.x, z: end.z });
  const ballOnApex = showApex && Math.hypot(still.x - apex.x, (still.z - apex.z) * vs) < r + 0.5;

  // ── the height dimension: under the apex — or beside the CELL when the apex is over the CELL itself
  //    (a line under it would cut the cup), or the ball is still rising there (then it measures the
  //    CELL); its extension line then starts at the CELL's back wall, level with the apex ──
  const vDim = showApex ? { x: apex.x, z: apex.z, beside: atTarget } : rising ? { x: d, z: zt, beside: true } : null;
  /** the beside dimension stands 16px right of the CELL's back wall (or of the aim mark) */
  const sideX = cell ? farX : d;
  const sidePad = cell ? 0 : 6;

  // callout alignment: keep the text inside the plate near either end of the shot
  const callAt = showApex ? { x: apex.x, z: apex.z } : { x: d, z: zt };
  const rel = (callAt.x - xMin) / W;
  const align = rel > 0.7 ? "end" : rel < 0.3 ? "start" : "center";

  // the muzzle's 14 in dimension on screen: two-line label with room, one line when tight; when it is
  // too short to hold one, the label is set outside (wide plates) or left off (narrow plates)
  const fit = (pxPerIn: number, roomy: number) => {
    const px = MUZZLE.z * vs * pxPerIn;
    return px >= roomy ? "full" : px >= 24 ? "short" : "outside";
  };
  const muzzleFit = fit(sWide, 46);
  const muzzleFitSm = fit(sNarrow, 999);

  // ── words ──
  const kind = ball === "POLLEN" ? "POLLEN" : "NECTAR";
  const heading = title ?? `[ SHOT · ${kind} ]`;
  const rpm = sol.flywheelRpm;
  const speed = `${fmtInt(arrSpeed)} in/s`;
  const arrival = level ? "level" : `${fmtInt(Math.abs(arrDeg))}° ${vzArr < 0 ? "down" : "up"}`;
  /** [first line, second line's lead-in (dropped on narrow plates), the rest of the second line] */
  const callout: [string, string, string] | null = !valid
    ? null
    : atTarget
      ? [label ?? `Apex at the ${what}`, "arrives ", `${arrival} · ${speed}`]
      : midApex
        ? [label ?? "Apex", "", `t ${fmtFixed(apex.time, 2)} s`]
        : [label ?? "Rising at target", "climbing ", `${fmtInt(arrDeg)}° · ${speed}`];
  /** narrow plates drop the height dimension: the apex's height joins the callout (the CELL's own
   *  height joins the CELL's label) */
  const calloutNarrow = midApex && !label ? ` · ${fmtFixed(apex.z, 1)} in` : "";
  /** the CELL's own label: its height too, unless the dimension beside it says it */
  const cellHeight = ` · ${fmtIn(zt)} in`;
  const cellLabel = { key: cell ? "CELL" : "Target", rest: vDim?.beside ? "" : cellHeight };

  // ── label placement, tested at every scale the plate can be drawn at — narrow (a 224–599px plate,
  //    stage ≤ 210 tall), medium (600–959, ≤ 260), wide (≥ 960, ≤ 320) — against the arc, the callout,
  //    the dimensions and the drawing's edges. Martian Mono at 10px: ≈ 7.4px a character, 7.8 tracked.
  const textW = (key: string, rest = "") => key.length * 7.8 + rest.length * 7.4;
  const scales = [
    { s: Math.min(180 / W, 210 / H), narrow: true, pl: 22, pr: 22, pt: 52 },
    { s: Math.min(555 / W, 210 / H), narrow: true, pl: 22, pr: 22, pt: 52 },
    { s: Math.min(452 / W, 260 / H), narrow: false, pl: 52, pr: 96, pt: 56 },
    { s: Math.min(811 / W, 260 / H), narrow: false, pl: 52, pr: 96, pt: 56 },
    { s: Math.min(508 / W, 320 / H), narrow: false, pl: 56, pr: 96, pt: 52 },
    { s: Math.min(1200 / W, 320 / H), narrow: false, pl: 56, pr: 96, pt: 52 },
  ];
  const box = (l: number, t: number, w: number, h: number): Box => ({ l, t, r: l + w, b: t + h });
  const pad = (b: Box, p: number): Box => ({ l: b.l - p, t: b.t - p, r: b.r + p, b: b.b + p });
  const frame = ({ s, narrow, pl, pr, pt }: (typeof scales)[number]) => {
    const px = (x: number) => (x - xMin) * s;
    const py = (z: number) => (zTop - z) * vs * s;
    const mx = px(0);
    const my = py(MUZZLE.z);
    const fixed: Box[] = [
      box(mx - 4, my - 34, 64, 34), // the 40° angle and its label
      box(mx - 30, my + r * s, 90, py(0) - my), // the muzzle's dimension label
    ];
    if (!valid) fixed.push(box(px(d) - 7, py(zt) - 7, 14, 14)); // the ✕
    /** thin lines, as points: the arc and the callout's leader */
    const linePx = pts.map((p) => ({ x: px(p.x), y: py(p.z) }));
    if (callout) {
      const w = Math.max(textW(callout[0], narrow ? calloutNarrow : ""), textW("", (narrow ? "" : callout[1]) + callout[2]));
      const ax = px(callAt.x);
      const ay = py(callAt.z);
      fixed.push(box(align === "end" ? ax - 18 - w : align === "start" ? ax + 18 : ax - w / 2, ay - 50, w, 32));
      const dir = align === "end" ? -1 : align === "start" ? 1 : 0;
      for (let i = 5; i <= 18; i++) linePx.push({ x: ax + dir * i, y: ay - i });
    }
    if (vDim && !narrow) {
      // the height dimension: its line (and extension line, beside the CELL) and its label at mid-height
      const lx = vDim.beside ? px(sideX) + sidePad + 16 : px(vDim.x);
      const top = py(vDim.z);
      fixed.push(box(lx - 4, top - 4, 8, py(0) - top + 4));
      fixed.push(box(lx + 8, (top + py(0)) / 2 - 7, textW("", `${fmtFixed(vDim.z, 1)} in`), 14));
      if (vDim.beside) fixed.push(box(px(sideX) + sidePad + 3, top - 2, 17, 4));
    }
    const hitsArc = (b: Box) => linePx.some((q) => q.x > b.l - 3 && q.x < b.r + 3 && q.y > b.t - 3 && q.y < b.b + 3);
    const area = box(-pl + 2, valid ? -pt + 2 : -32, W * s + pl + pr - 4, py(0) - 3 + (valid ? pt - 2 : 32));
    const inside = (b: Box) => b.l >= area.l && b.r <= area.r && b.t >= area.t && b.b <= area.b;
    return { px, py, fixed, hitsArc, inside };
  };
  const frames = scales.map((sc) => ({ ...sc, ...frame(sc) }));

  // the CELL's label (or the aim mark's): under or over it, hanging left from its far side or right
  // from its near side — the first that is clear at every scale (else the one clear at the most).
  // Chosen apart for narrow plates (little margin on the right); there, if no place clears the arc,
  // the label drops its height.
  const POS = ["bl", "al", "br", "ar"] as const;
  type Pos = (typeof POS)[number];
  type Frame = (typeof frames)[number];
  /** the label's words: its height (if any) on the same line, or stacked under the name */
  type Words = { rest: string; stack: boolean };
  const cellBox = (f: Frame, pos: Pos, v: Words) => {
    const w = (v.stack ? Math.max(textW(cellLabel.key), textW("", v.rest.slice(3))) : textW(cellLabel.key, v.rest)) + 6;
    const h = v.stack ? 28 : 14;
    const gap = cell ? 6 : 9;
    const xL = cell ? f.px(nearX) - 3 : f.px(d) - 8;
    const xR = cell ? f.px(farX) + 3 : f.px(d) + 8;
    const yT = cell ? f.py(lipFar) : f.py(zt);
    const yB = cell ? f.py(cupFloor) : f.py(zt);
    return box(pos[1] === "l" ? xR - w : xL, pos[0] === "b" ? yB + gap : yT - gap - h, w, h);
  };
  const clearAt = (fs: Frame[], pos: Pos, v: Words) =>
    fs.filter((f) => {
      const b = cellBox(f, pos, v);
      return f.inside(b) && !f.hitsArc(b) && !f.fixed.some((o) => overlaps(pad(b, 3), o));
    }).length;
  const pick = (fs: Frame[], v: Words) => POS.reduce((best, pos) => (clearAt(fs, pos, v) > clearAt(fs, best, v) ? pos : best), POS[0]);
  const wideFrames = frames.filter((f) => !f.narrow);
  const narrowFrames = frames.filter((f) => f.narrow);
  const wideWords: Words = { rest: cellLabel.rest, stack: false };
  const cellPos = pick(wideFrames, wideWords);
  // narrow plates (no height dimension): the CELL's height on its label's line — or stacked under its
  // name where that clears the arc better — or, failing both, left off
  let narrowCell = { pos: POS[0] as Pos, words: wideWords, clear: -1 };
  for (const words of [
    { rest: cellHeight, stack: false },
    { rest: cellHeight, stack: true },
    { rest: "", stack: false },
  ]) {
    const pos = pick(narrowFrames, words);
    const clear = clearAt(narrowFrames, pos, words);
    if (clear > narrowCell.clear) narrowCell = { pos, words, clear };
    if (clear === narrowFrames.length) break;
  }
  // a label with no clear place at some scale of its plate class is left off there (the callout, the
  // dimension or the caption already name the CELL); on narrow plates its height then joins the callout
  const wideOk = clearAt(wideFrames, cellPos, wideWords) === wideFrames.length;
  const narrowOk = narrowCell.clear === narrowFrames.length;
  const cellLabels: (Words & { pos: Pos; only?: "wide" | "narrow" })[] =
    wideOk && narrowOk && narrowCell.pos === cellPos && narrowCell.words.rest === wideWords.rest && !narrowCell.words.stack
      ? [{ pos: cellPos, ...wideWords }]
      : [
          ...(wideOk ? [{ pos: cellPos, ...wideWords, only: "wide" as const }] : []),
          ...(narrowOk ? [{ pos: narrowCell.pos, ...narrowCell.words, only: "narrow" as const }] : []),
        ];
  const calloutHeightSm = !narrowOk && (atTarget || rising) && !label ? cellHeight : calloutNarrow;

  // ── time ticks: one every 0.1 s of flight, square to the arc; labelled ("0.1 s") on plates ≥ 600px
  //    wide where the label clears everything else at every scale it can be drawn at ──
  const ticks: { t: number; x: number; z: number; a: number; nx: number; ny: number; label: boolean }[] = [];
  for (let k = 1; k * TICK_S < tEnd - 0.03; k++) {
    const t = r3(k * TICK_S);
    const p = at(t);
    const a = Math.atan2(-(vz0 - G_IN_S2 * t) * vs, vx); // screen angle of the arc (y down)
    ticks.push({ t, x: p.x, z: p.z, a, nx: -Math.sin(a), ny: Math.cos(a), label: true });
  }
  for (const f of wideFrames) {
    const keepOut = [...f.fixed, cellBox(f, cellPos, wideWords)];
    const placed: Box[] = [];
    for (const k of ticks) {
      if (!k.label) continue;
      const off = r * f.s + 5;
      const ax = f.px(k.x) + k.nx * off;
      const ay = f.py(k.z) + k.ny * off;
      const b = box(ax - TICK_LABEL.w * (0.5 - 0.5 * k.nx), ay, TICK_LABEL.w, TICK_LABEL.h);
      if (!f.inside(b) || f.hitsArc(b) || keepOut.some((o) => overlaps(pad(b, 3), o)) || placed.some((o) => overlaps(pad(b, 6), o))) k.label = false;
      else placed.push(b);
    }
  }
  const noteText = !valid
    ? `Drawn: the hardest shot the robot can make, ${fmtInt(SHOOTER.maxFlywheelRpm)} RPM. It ${
        passesUnder ? `passes ${fmtFixed(zt - end.z, 1)} in under the ${what}` : `lands ${fmtIn(d - end.x)} in short`
      }.`
    : atTarget
      ? `From ${fmtIn(d)} in away the ${what} sits at the top of the arc, so the ball arrives ${arrival}.${
          leastRpm
            ? ` That makes ${fmtInt(rpm)} RPM the least flywheel speed that reaches this ${what} through the fixed ${SHOOTER.launchPitchDeg}° hood — closer or farther, the solver asks for more.`
            : ""
        }`
      : midApex
        ? `The ball peaks at ${fmtFixed(apex.z, 1)} in, ${fmtFixed(apex.time, 2)} s into the flight and ${fmtIn(d - apex.x)} in short of the ${what}, then drops into it ${fmtInt(Math.abs(arrDeg))}° below level.`
        : `The ${what} is close enough that the ball is still climbing, ${fmtInt(arrDeg)}° above level, when it gets there: the apex would come ${fmtIn(apex.x - d)} in past it.`;

  const view = vs === 1 ? "Side view, drawn to scale" : `Side view, heights exaggerated ${fmtFixed(vs, 1)} times`;
  const describe = `${view}: a ${kind} ball leaves the ${fmtInt(MUZZLE.z)} inch muzzle through the fixed ${SHOOTER.launchPitchDeg}° hood toward a ${what} ${fmtIn(d)} inches away and ${fmtIn(zt)} inches up. ${
    valid
      ? `The solver's answer: ${fmtInt(rpm)} RPM, a ${fmtFixed(sol.flightTimeSec, 2)} second flight, ${sol.iterations} iterations. ${
          showApex ? `The apex is ${fmtFixed(apex.z, 1)} inches up, ${fmtFixed(apex.time, 2)} seconds after launch.` : "The ball is still rising when it gets there."
        }`
      : `No solution — ${sol.failReason}.`
  } Tick marks along the arc are 0.1 seconds apart.`;

  const flight: PlateFlight = {
    input,
    shot,
    tEnd: r3(tEnd),
    vs,
    samples: SAMPLES,
    ballR: r,
    cup: rest && wall ? { wallT: r3(wall.t), rest } : null,
    apex: showApex ? { x: r3(apex.x), z: r3(apex.z), t: r3(apex.time) } : null,
  };

  const readout: { k: string; v: ReactNode; u?: string; note?: string }[] = valid
    ? [
        { k: "Flywheel", v: <Num value={Math.round(rpm)} />, u: "RPM" },
        { k: "Flight time", v: <Num value={sol.flightTimeSec} decimals={2} />, u: "s" },
        { k: "Hood", v: `${SHOOTER.launchPitchDeg}°`, u: "FIXED" },
        { k: "Iterations", v: String(sol.iterations) },
      ]
    : [
        {
          k: "Flywheel",
          v: rpm > 0 ? <Num value={Math.round(rpm)} /> : "—",
          u: rpm > 0 ? "RPM" : undefined,
          note: rpm > 0 ? `needed · max ${fmtInt(SHOOTER.maxFlywheelRpm)}` : undefined,
        },
        { k: "Flight time", v: "—" },
        { k: "Hood", v: `${SHOOTER.launchPitchDeg}°`, u: "FIXED" },
        { k: "Iterations", v: "—" },
      ];
  const caption = note === false ? null : (note ?? noteText);
  // the flight log (wide plates): where the ball is at every tick, and when it reaches the target —
  // x grows by the same step every 0.1 s (constant horizontal speed) while each climb is smaller
  const log = valid && ticks.length < 7 ? [...ticks.map((k) => ({ t: k.t, x: k.x, z: k.z })), { t: r3(tEnd), x: end.x, z: end.z }] : null;

  /** the CELL's (or the target's) label: name, then its height on the same line or stacked under it */
  const cellWords = (c: Words) => (
    <span className="ap-cell-label ap-note">
      <span className={cn("ap-key", c.stack && "block")}>{cellLabel.key}</span>
      {c.stack ? <span className="block">{c.rest.slice(3)}</span> : c.rest}
    </span>
  );

  const foot = (
    <>
      <p className="ap-fnote">
        <span className="ap-fnote-a">SIDE VIEW · {vs === 1 ? "TRUE SCALE" : `HEIGHTS ×${fmtFixed(vs, 1)}`}</span>
        <span className="ap-fnote-b">
          <span className="ap-fnote-sep"> · </span>GRID {gridIn} in · TICKS {TICK_S} s
        </span>
      </p>
      <button type="button" data-ap="replay" className="ap-replay">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89M13.5 2.5v3h-3" stroke="currentColor" strokeWidth="1.25" fill="none" />
        </svg>
        Replay shot
      </button>
    </>
  );

  return (
    <ArcPlatePlayer
      mode={draw}
      flight={flight}
      className={className}
      ballAtApex={ballOnApex}
      style={{ "--ap-w": W, "--ap-h": H, "--ap-r": r } as CSSProperties}
    >
      <figcaption className="sr-only">{describe}</figcaption>

      <div className="ap-head">
        <Scramble text={heading} hover className="ap-title" />
        <span className="ap-source">
          <span className="ap-source-k">Solver · </span>
          {source}
        </span>
      </div>

      <div className="ap-body" data-aside={showReadout ? "" : undefined}>
        <div className="ap-draw" data-mo={muzzleFit === "outside" ? "" : undefined}>
          {!valid && (
            <p className="ap-verdict ap-note" data-ap="verdict" aria-hidden="true">
              <span className="ap-key">No solution</span>
              <span className="ap-verdict-why">{label ?? sol.failReason}</span>
            </p>
          )}

          <div className="ap-stage" data-ap="stage" aria-hidden="true">
            <svg viewBox={`${xMin} ${Y(zTop)} ${W} ${H}`} className="ap-svg" fill="none">
              <path data-ap="grid" className="ap-grid" d={grid} vectorEffect="non-scaling-stroke" />
              {floor && (
                <>
                  <path data-ap="hatch" className="ap-hatch" d={hatch} vectorEffect="non-scaling-stroke" />
                  <line data-ap="floor" className="ap-floor" x1={r3(xMin - 240)} x2={r3(xMax + 240)} y1={0} y2={0} vectorEffect="non-scaling-stroke" />
                </>
              )}
              {cell && <path data-ap="cup" className="ap-cup" d={cupD} vectorEffect="non-scaling-stroke" />}
              <path data-ap="arc" className={cn("ap-arc", !valid && "ap-arc-miss")} d={arcD} vectorEffect="non-scaling-stroke" />
              <circle data-ap="muzzle" className="ap-muzzle" cx={X(0)} cy={Y(MUZZLE.z)} r={r} vectorEffect="non-scaling-stroke" />
              <circle
                data-ap="ball"
                className={cn("ap-ball", ball === "NECTAR_RED" && "ap-ball-red", ball === "NECTAR_BLUE" && "ap-ball-blue")}
                cx={X(still.x)}
                cy={Y(still.z)}
                r={r}
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* time ticks along the arc, square to it; the label sits on the inside of the curve */}
            {ticks.map((k) => (
              <span
                key={k.t}
                className="ap-pt ap-tick"
                data-ap="tick"
                data-t={k.t}
                style={{ left: L(k.x), top: T(k.z), "--ap-a": `${r3(k.a / DEG)}deg`, "--ap-nx": r3(k.nx), "--ap-ny": r3(k.ny) } as CSSProperties}
              >
                <span className="ap-tick-mark" />
                {k.label && <span className="ap-tick-label ap-note">{fmtFixed(k.t, 1)} s</span>}
              </span>
            ))}

            {/* muzzle: height dimension (left of it, with an extension line) + the 40° launch angle */}
            <span
              className="ap-dim ap-dimv ap-dim-muzzle"
              data-fit={muzzleFit}
              data-fit-sm={muzzleFitSm}
              style={{ left: `calc(${L(0)} - ${S(r)} - 12px)`, top: T(MUZZLE.z), bottom: 0 }}
            >
              <span className="ap-ext ap-ext-top" />
              <span className="ap-line" />
              <Arrow className="ap-arrow-t" />
              <Arrow className="ap-arrow-b" />
              <span className="ap-dim-label ap-note">
                {muzzleFit === "full" && <span className="ap-key ap-wide block">Muzzle</span>}
                <span className="block">
                  <Num value={MUZZLE.z} /> in
                </span>
              </span>
            </span>
            <span className="ap-pt" data-ap="angle" style={{ left: L(0), top: T(MUZZLE.z), "--ap-r0": `calc(${S(r)} + 3px)` } as CSSProperties}>
              <span className="ap-angle-ref" />
              <svg className="ap-angle-arc" viewBox="0 0 30 30">
                {/* radius 24 px, from 0° to the drawn launch angle (40°; steeper only if heights are exaggerated) */}
                <path
                  d={`M24 30A24 24 0 0 0 ${r3(24 * Math.cos(Math.atan(Math.tan(theta) * vs)))} ${r3(30 - 24 * Math.sin(Math.atan(Math.tan(theta) * vs)))}`}
                  pathLength={1}
                />
              </svg>
              <span className="ap-angle-label ap-note">
                <Num value={SHOOTER.launchPitchDeg} />°
              </span>
            </span>

            {/* range: muzzle → target, under the floor (extension lines start clear of the hatch) */}
            <span className="ap-dim ap-dimh" style={{ left: L(0), width: `${r3((d / W) * 100)}%` }}>
              <span className="ap-ext ap-ext-l" />
              <span className="ap-ext ap-ext-r" />
              <span className="ap-line" />
              <Arrow className="ap-arrow-l" />
              <Arrow className="ap-arrow-r" />
              <span className="ap-dim-label ap-note">
                <Num value={d} decimals={isWhole(d) ? 0 : 1} /> in
              </span>
            </span>

            {/* apex height — or the CELL's height when the ball is still rising there */}
            {vDim && (
              <span
                className="ap-dim ap-dimv ap-dim-apex"
                data-beside={vDim.beside ? "" : undefined}
                style={
                  vDim.beside
                    ? {
                        left: `calc(${L(sideX)} + ${sidePad + 16}px)`,
                        top: T(vDim.z),
                        bottom: 0,
                      }
                    : { left: L(vDim.x), top: T(vDim.z), bottom: 0 }
                }
              >
                {vDim.beside && <span className="ap-ext ap-ext-top" />}
                <span className="ap-line" />
                <Arrow className="ap-arrow-t" />
                <Arrow className="ap-arrow-b" />
                <span className="ap-dim-label ap-note">
                  <Num value={vDim.z} decimals={1} /> in
                </span>
              </span>
            )}

            {/* the CELL's label, where it clears the arc and the callout (cellPos); its height joins it
                unless the dimension beside the CELL says it */}
            {cell &&
              cellLabels.map((c) => (
                <span
                  key={c.only ?? "all"}
                  className={cn("ap-pt", c.only && `ap-only-${c.only}`)}
                  data-ap="cell"
                  data-pos={c.pos}
                  style={{ left: L(c.pos[1] === "l" ? farX : nearX), top: T(c.pos[0] === "b" ? cupFloor : lipFar) }}
                >
                  {cellWords(c)}
                </span>
              ))}
            {!valid && <span className="ap-pt ap-miss" data-ap="miss" style={{ left: L(d), top: T(zt) }} />}
            {/* no CELL drawn: mark the aim point so the arc never just stops in mid-air */}
            {!cell &&
              cellLabels.map((c) => (
                <span
                  key={c.only ?? "all"}
                  className={cn("ap-pt ap-aim", c.only && `ap-only-${c.only}`)}
                  data-ap="aim"
                  data-pos={c.pos}
                  style={{ left: L(d), top: T(zt) }}
                >
                  {cellWords(c)}
                </span>
              ))}

            {/* apex marker + callout — or RISING AT TARGET (ERRATA #3) */}
            {callout && (
              <span className="ap-pt" data-ap="apex" data-align={align} style={{ left: L(callAt.x), top: T(callAt.z) }}>
                {showApex && <span className="ap-mark" data-ap="mark" />}
                {/* leader: straight up when centred, else a 45° leg to the callout's underline */}
                {align === "center" ? (
                  <span className="ap-leader" />
                ) : (
                  <svg className="ap-leader" viewBox="0 0 13 13" aria-hidden="true">
                    <path d={align === "end" ? "M13 13 0 0" : "M0 13 13 0"} />
                  </svg>
                )}
                <span className="ap-callout ap-note">
                  <span className="block">
                    <span className="ap-key">{callout[0]}</span>
                    {/* the height, on plates too narrow for its dimension line */}
                    {calloutHeightSm && <span className="ap-narrow">{calloutHeightSm}</span>}
                  </span>
                  <span className="block">
                    {callout[1] && <span className="ap-wide">{callout[1]}</span>}
                    {callout[2]}
                  </span>
                </span>
              </span>
            )}
          </div>
        </div>

        {showReadout ? (
          <div className="ap-aside">
            <dl className="ap-readout">
              {readout.map((row) => (
                <div key={row.k} className="ap-row" data-ap="row">
                  <dt>{row.k}</dt>
                  <dd>
                    {row.v}
                    {row.u && <span className="ap-unit">{row.u}</span>}
                    {row.note && <span className="ap-row-note">{row.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            {log && (
              <div className="ap-log" data-ap="log">
                <table className="ap-log-table">
                  <caption className="ap-log-head">
                    <span className="ap-key">Flight log</span> · every {TICK_S} s
                  </caption>
                  <tbody>
                    {(
                      [
                        ["t", "s", (c: (typeof log)[number]) => fmtFixed(c.t, isWhole(c.t * 10) ? 1 : 2)],
                        ["x", "in", (c: (typeof log)[number]) => fmtFixed(c.x, 1)],
                        ["z", "in", (c: (typeof log)[number]) => fmtFixed(c.z, 1)],
                      ] as const
                    ).map(([k, unit, value]) => (
                      <tr key={k}>
                        <th scope="row">
                          {k} <span className="ap-log-unit">{unit}</span>
                        </th>
                        {log.map((c) => (
                          <td key={c.t} data-ap-log={c.t}>
                            {value(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {caption && (
              <p className="ap-caption" data-ap="caption">
                {caption}
              </p>
            )}
            <div className="ap-foot">{foot}</div>
          </div>
        ) : (
          <div className="ap-foot ap-foot-row">{foot}</div>
        )}
      </div>
    </ArcPlatePlayer>
  );
}
