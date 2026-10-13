// Display helpers around the team's solver. The SOLUTION always comes from src/lib/ballistics.ts
// (the verified port of util/Ballistics.java — never rewritten here). These helpers only:
//   • replay the fixed-point loop pass by pass so the page can show HOW it converged
//     (same loop as Ballistics.java L135–159: start at t = 0, 6 passes max, stop when |Δt| < 1e-4 s)
//   • print a Solution the way Ballistics.Solution.toString() does in Java (for the console)
// Pure functions, no hooks: safe on the server and in client components.

import { BALLS, G_IN_S2, SHOOTER, type BallKind, type SolveInput, type Solution } from "@/lib/ballistics";

/** Muzzle at the origin, 14 in up (RobotConstants.Shoot.MUZZLE_Z_IN). */
export const MUZZLE = { x: 0, y: 0, z: 14 } as const;

/**
 * Aim point height. NOT in the manual: the HIVE pivots are 43.95 in up (TU04 §9.6) and the 3D
 * HIVE in src/components/robot uses 46 in for the upward CELL opening's centre, so we match it.
 * On the robot, HiveTracker measures the aim point live from the AprilTag Cluster.
 */
export const AIM_Z_IN = 46;

/** Ranges the page lets you try (inches from the muzzle). */
export const RANGE_MIN = 24;
export const RANGE_MAX = 168;

/** Robot speed limits for the demo (in/s). Free speed is 66.9 in/s (RobotConstants.Drive). */
export const SPEED_MAX = 48;

/** Fixed-point tolerance and pass limit, as in Ballistics.java. */
export const TOL_S = 1e-4;
export const MAX_PASSES = 6;

export interface Pass {
  /** 1-based pass number. */
  i: number;
  /** Flight time this pass started from. */
  tIn: number;
  /** Virtual target used this pass. */
  vtx: number;
  vty: number;
  /** Horizontal distance muzzle → virtual target. */
  d: number;
  /** d·tanθ − h. ≤ 0 means no shot exists at this hood angle. */
  bracket: number;
  /** New flight time (null when the bracket failed). */
  tOut: number | null;
  /** |tOut − tIn| (null when the bracket failed). */
  dt: number | null;
}

export interface Trace {
  passes: Pass[];
  /** True when a pass hit bracket ≤ 0 (the "back up" failure). */
  bracketFailed: boolean;
  /** Rise from the muzzle to the target (h). */
  h: number;
  tanTheta: number;
  cosTheta: number;
}

/** Replays the solver loop pass by pass (display only — the answer comes from solve()). */
export function traceSolve(input: SolveInput): Trace {
  const theta = ((input.launchPitchDeg ?? SHOOTER.launchPitchDeg) * Math.PI) / 180;
  const tanTheta = Math.tan(theta);
  const cosTheta = Math.cos(theta);
  const h = input.target.z - input.muzzle.z;
  const v = input.robotVel ?? { x: 0, y: 0 };
  const passes: Pass[] = [];
  let t = 0;
  for (let i = 0; i < MAX_PASSES; i++) {
    const vtx = input.target.x - v.x * t;
    const vty = input.target.y - v.y * t;
    const d = Math.hypot(vtx - input.muzzle.x, vty - input.muzzle.y);
    const bracket = d * tanTheta - h;
    if (bracket <= 0) {
      passes.push({ i: i + 1, tIn: t, vtx, vty, d, bracket, tOut: null, dt: null });
      return { passes, bracketFailed: true, h, tanTheta, cosTheta };
    }
    const tOut = Math.sqrt((2 * bracket) / G_IN_S2);
    const dt = Math.abs(tOut - t);
    passes.push({ i: i + 1, tIn: t, vtx, vty, d, bracket, tOut, dt });
    t = tOut;
    if (dt < TOL_S) break;
  }
  return { passes, bracketFailed: false, h, tanTheta, cosTheta };
}

// ─── Java-style printing (String.format with %.Nf: no grouping, half-up) ───────────────────────

const jf = (n: number, d: number) => n.toFixed(d);
const deg = (rad: number) => (rad * 180) / Math.PI;

/**
 * The failReason Ballistics.java would print for this solve (its wording, not the TS port's).
 * `trace` supplies d at the failing pass for the hood-angle message.
 */
export function javaFailReason(sol: Solution, trace: Trace): string {
  if (sol.valid) return "";
  if (trace.bracketFailed) {
    const last = trace.passes[trace.passes.length - 1];
    return `target too high/close for a ${jf(SHOOTER.launchPitchDeg, 0)} deg hood (need d*tan > rise; d=${jf(last.d, 1)}, rise=${jf(trace.h, 1)})`;
  }
  if (sol.flywheelRpm > SHOOTER.maxFlywheelRpm) {
    return `out of range: needs ${jf(sol.flywheelRpm, 0)} rpm, max is ${jf(SHOOTER.maxFlywheelRpm, 0)}`;
  }
  if (sol.turretAngleRad < SHOOTER.turretMinRad || sol.turretAngleRad > SHOOTER.turretMaxRad) {
    return `turret cannot reach ${jf(deg(sol.turretAngleRad), 0)} deg -- rotate the chassis`;
  }
  return sol.failReason;
}

/** Ballistics.Solution.toString(), character for character. */
export function javaSolutionString(sol: Solution, trace: Trace): string {
  if (!sol.valid) return `INVALID: ${javaFailReason(sol, trace)}`;
  return (
    `az=${jf(deg(sol.fieldAzimuthRad), 1)}deg turret=${jf(deg(sol.turretAngleRad), 1)}deg ` +
    `rpm=${jf(sol.flywheelRpm, 0)} tof=${jf(sol.flightTimeSec, 2)}s d=${jf(sol.actualDistanceIn, 1)}in ` +
    `lead=${jf(deg(sol.leadAngleRad), 1)}deg`
  );
}

/** "POLLEN" | "NECTAR" → the BallType the solver needs (red and blue NECTAR share their physics). */
export type BallChoice = "POLLEN" | "NECTAR";
export const ballKind = (b: BallChoice): BallKind => (b === "POLLEN" ? "POLLEN" : "NECTAR_RED");
export const efficiencyOf = (b: BallChoice) => BALLS[ballKind(b)].transferEfficiency;
export const diameterOf = (b: BallChoice) => BALLS[ballKind(b)].diameterIn;

/** RPM band the game lives in on a 4 in wheel (RobotConstants.Shoot.MAX_FLYWHEEL_RPM comment). */
export const GAME_RPM_BAND = { from: 1600, to: 2900 } as const;
