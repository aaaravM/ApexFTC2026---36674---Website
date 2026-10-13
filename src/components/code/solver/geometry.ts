// Shared drawing frame for the solver's two views. Both use the SAME horizontal scale and origin
// (the muzzle), stacked like a drawing sheet: the ELEVATION above, the PLAN below, so a point in one
// view sits directly over the same point in the other. Units: inches. True scale (1 in = 1 in on
// both axes). All coordinates are rounded so server and browser stringify them identically.

import { ballPosition, type SolveInput, type Solution } from "@/lib/ballistics";

export const X0 = -20;
export const X1 = 200;
export const W = X1 - X0;

/** Elevation (side) view: height above the floor. Room below the floor for the range dimension. */
export const Z_TOP = 76;
export const Z_BOT = -16;
export const EH = Z_TOP - Z_BOT;

/** Plan (top) view: field +Y (left of the robot) is UP on the page. */
export const Y_TOP = 42;
export const Y_BOT = -42;
export const PH = Y_TOP - Y_BOT;

export const r3 = (n: number) => Math.round(n * 1000) / 1000;
export const clampX = (x: number) => Math.min(X1, Math.max(X0, x));
export const clampY = (y: number) => Math.min(Y_TOP, Math.max(Y_BOT, y));

/** View-box x for a field x (inches). */
export const vx = (x: number) => r3(x - X0);
/** Elevation view-box y for a height z. */
export const vz = (z: number) => r3(Z_TOP - z);
/** Plan view-box y for a field y. */
export const vy = (y: number) => r3(Y_TOP - y);

/** CSS position (percent of the figure) for HTML labels. */
export const pctX = (x: number) => `${r3((vx(x) / W) * 100)}%`;
export const pctZ = (z: number) => `${r3((vz(z) / EH) * 100)}%`;
export const pctY = (y: number) => `${r3((vy(y) / PH) * 100)}%`;

/** Robot body (18 in cube, tracking point 2 in behind the muzzle — RobotConstants.Shoot.MUZZLE_X_IN). */
export const ROBOT = { x0: -11, x1: 7, half: 9, height: 18, trackX: -2 } as const;

/** Stylised CELL: a 12 in wide mouth at the aim height (top view: 12 × 20 in opening). */
export const CELL = { halfX: 6, halfY: 10, depth: 6 } as const;

export interface Sample {
  t: number;
  x: number;
  y: number;
  z: number;
}

/**
 * Sample the flight from launch to arrival (never past the time of flight — errata #3).
 * Works for solutions that failed only on RPM (the speed is known, the wheel just can't make it).
 */
export function sampleFlight(input: SolveInput, sol: Solution, n = 64): Sample[] {
  if (!(sol.flightTimeSec > 0) || !(sol.muzzleSpeedIn > 0)) return [];
  const out: Sample[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (sol.flightTimeSec * i) / n;
    const p = ballPosition(input, sol, t);
    out.push({ t, x: p.x, y: p.y, z: p.z });
  }
  return out;
}

/** Positions every `dt` seconds (the "strobe" ticks), excluding launch. */
export function strobe(input: SolveInput, sol: Solution, dt = 0.05): Sample[] {
  if (!(sol.flightTimeSec > 0) || !(sol.muzzleSpeedIn > 0)) return [];
  const out: Sample[] = [];
  for (let t = dt; t < sol.flightTimeSec - dt * 0.25; t += dt) {
    const p = ballPosition(input, sol, t);
    out.push({ t, x: p.x, y: p.y, z: p.z });
  }
  return out;
}

export const elevPath = (s: Sample[]) => s.map((p, i) => `${i ? "L" : "M"}${vx(clampX(p.x))} ${vz(p.z)}`).join(" ");
export const planPath = (s: Sample[]) => s.map((p, i) => `${i ? "L" : "M"}${vx(clampX(p.x))} ${vy(clampY(p.y))}`).join(" ");

/** Arrowhead path at `tip`, pointing along (dx, dy) in view-box units. */
export function arrowHead(tip: { x: number; y: number }, dx: number, dy: number, size = 3) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bx = tip.x - ux * size;
  const by = tip.y - uy * size;
  const px = -uy * size * 0.55;
  const py = ux * size * 0.55;
  return `M${r3(bx + px)} ${r3(by + py)} L${r3(tip.x)} ${r3(tip.y)} L${r3(bx - px)} ${r3(by - py)}`;
}
