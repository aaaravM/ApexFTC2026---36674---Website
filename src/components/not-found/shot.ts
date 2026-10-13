// The 404 shot — "NO SOLUTION — TARGET OUT OF RANGE". Every number on the 404 page comes from the
// team's own solver (src/lib/ballistics.ts, a port of Ballistics.java — never rewritten here):
//
//   • REQUIRED: solve() for a HIVE CELL (44 in up) placed 404 ft away. The solver returns
//     valid=false, "out of range — needs 13214 rpm, max is 5000", after 2 iterations; its
//     muzzleSpeedIn / flightTimeSec still describe the arc it WANTED, which we draw dashed.
//   • MAX: the same fixed 40° hood at the flywheel's 5,000 rpm limit (muzzleSpeedToRpm inverted),
//     drawn solid — the hardest shot APEX-R1 can make. It reaches CELL height at ~55 ft.
// The model has no air drag (BallType.dragPerInch = 0), and the caption says so.
// Pure module: safe in Server and Client Components. Coordinates are rounded so the server and
// the browser stringify them identically (no hydration mismatch).

import { apexOf, BALLS, ballPosition, G_IN_S2, SHOOTER, solve, type Solution, type SolveInput } from "@/lib/ballistics";

/** The joke, kept honest: the page is placed 404 ft from the robot. */
export const TARGET_FT = 404;
export const TARGET_IN = TARGET_FT * 12;
/** HIVE CELL opening height used across the site's solver demos (manual: ≈ 43.95 in). */
export const CELL_Z_IN = 44;

const MUZZLE = { x: 0, y: 0, z: SHOOTER.muzzleHeightIn };
const PITCH = (SHOOTER.launchPitchDeg * Math.PI) / 180;

export const SHOT_INPUT: SolveInput = { muzzle: MUZZLE, target: { x: TARGET_IN, y: 0, z: CELL_Z_IN }, ball: "POLLEN" };

/** The real solver result (invalid). */
export const REQUIRED: Solution = solve(SHOT_INPUT);
export const REQUIRED_APEX = apexOf(SHOT_INPUT, REQUIRED);

/** Muzzle speed at the flywheel limit: rpm = 60·v / (η·π·D)  ⇒  v = rpm·η·π·D / 60. */
export const MAX_MUZZLE_IN_S =
  (SHOOTER.maxFlywheelRpm * BALLS.POLLEN.transferEfficiency * Math.PI * SHOOTER.flywheelDiameterIn) / 60;

const vZ = MAX_MUZZLE_IN_S * Math.sin(PITCH);
/** Max-power ball: the time it comes back down through CELL height, and the time it lands. */
const T_REACH = (vZ + Math.sqrt(vZ * vZ - 2 * G_IN_S2 * (CELL_Z_IN - MUZZLE.z))) / G_IN_S2;
const T_LAND = (vZ + Math.sqrt(vZ * vZ + 2 * G_IN_S2 * MUZZLE.z)) / G_IN_S2;

export const MAX_SHOT: Solution = {
  ...REQUIRED,
  valid: true,
  muzzleSpeedIn: MAX_MUZZLE_IN_S,
  flywheelRpm: SHOOTER.maxFlywheelRpm,
  flightTimeSec: T_LAND,
  failReason: "",
};
export const MAX_APEX = apexOf(SHOT_INPUT, MAX_SHOT);
/** How far the strongest shot carries at CELL height (inches) — the real "range". */
export const MAX_REACH_IN = ballPosition(SHOT_INPUT, MAX_SHOT, T_REACH).x;
export const MAX_LAND_IN = ballPosition(SHOT_INPUT, MAX_SHOT, T_LAND).x;
export const T_REACH_S = T_REACH;
export const SHORT_BY_IN = TARGET_IN - MAX_REACH_IN;

/* ── drawing sheet (inches; z up) ─────────────────────────────────────────────────────────── */

export const SHEET = {
  x0: -150,
  x1: TARGET_IN + 170,
  zTop: Math.ceil((REQUIRED_APEX.z + 90) / 10) * 10,
} as const;
export const SHEET_W = SHEET.x1 - SHEET.x0;
export const SHEET_H = SHEET.zTop;

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Sheet x (inches) → SVG x. */
export const sx = (x: number) => r2(x - SHEET.x0);
/** Sheet z (inches above the floor) → SVG y. */
export const sz = (z: number) => r2(SHEET.zTop - z);
/** Percent position inside the plot box, for HTML labels laid over the SVG. */
export const pctX = (x: number) => `${r2(((x - SHEET.x0) / SHEET_W) * 100)}%`;
export const pctY = (z: number) => `${r2(((SHEET.zTop - z) / SHEET_H) * 100)}%`;

export interface ArcPoint {
  t: number;
  x: number;
  z: number;
}

function sample(sol: Solution, tEnd: number, n: number): ArcPoint[] {
  const pts: ArcPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (tEnd * i) / n;
    const p = ballPosition(SHOT_INPUT, sol, t);
    pts.push({ t: r2(t * 1000) / 1000, x: r2(p.x), z: r2(Math.max(0, p.z)) });
  }
  return pts;
}

/** Samples along each arc (time in seconds, x/z in inches). */
export const MAX_ARC = sample(MAX_SHOT, T_LAND, 72);
export const REQUIRED_ARC = sample(REQUIRED, REQUIRED.flightTimeSec, 120);

/** SVG path through the first `count` samples, plus an optional exact end point. */
export function arcPath(points: ArcPoint[], count = points.length, end?: { x: number; z: number }) {
  const n = Math.max(0, Math.min(points.length, count));
  let d = "";
  for (let i = 0; i < n; i++) d += `${i ? "L" : "M"}${sx(points[i].x)} ${sz(points[i].z)}`;
  if (end && n > 0) d += `L${sx(end.x)} ${sz(end.z)}`;
  return d;
}

/** Floor ruler: a tick every 10 ft, a long tick every 50 ft, labels every 100 ft. */
export const RULER_TICKS = Array.from({ length: Math.floor(TARGET_FT / 10) + 1 }, (_, i) => ({
  ft: i * 10,
  x: i * 120,
  major: i % 5 === 0,
  label: i > 0 && i % 10 === 0,
}));
