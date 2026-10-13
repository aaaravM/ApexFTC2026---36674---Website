/**
 * The scoring cycle as a path: where a ball is at cycle progress c ∈ [0, 1], from rolling in over
 * the tiles to leaving the muzzle. Built from the model's real geometry (roller, scoop, lift, bore,
 * staging point, hood arc), so the animated ball travels exactly through the mechanism.
 *
 * Two frames: the first part of the path is fixed to the chassis (robot frame), the rest rides on
 * the turret (turret frame). They meet on the yaw axis, where the frames agree at every yaw.
 * Units: robot-frame millimetres (x forward, y left, z up); the turret frame has its origin on the
 * yaw axis at floor level.
 */
import { DERIVED, HOPPER, INTAKE, SHOOTER_GEOM, TURRET } from "./dimensions";

export type CycleBallKind = "POLLEN" | "NECTAR_RED" | "NECTAR_BLUE";

/** Cycle phases (fractions of the cycle) — also used to gate the mechanisms. */
export const CYCLE_PHASES = {
  /** rolling in over the tiles */
  approach: [0, 0.1],
  /** under the roller, up the scoop */
  intake: [0.1, 0.3],
  /** carried up the lift by the belts */
  lift: [0.3, 0.56],
  /** pushed up through the bore into the turret */
  bore: [0.56, 0.66],
  /** waiting at the staging point (colour sensor reads it) */
  staged: [0.66, 0.8],
  /** feeder kicks it into the flywheel nip */
  feed: [0.8, 0.88],
  /** round the hood */
  hood: [0.88, 0.97],
  /** leaving the muzzle */
  exit: [0.97, 1],
} as const satisfies Record<string, readonly [number, number]>;
export type CyclePhase = keyof typeof CYCLE_PHASES;

/** Spacing (in cycle progress) between balls of a train. */
export const CYCLE_SPACING = 0.36;
/** Seconds for one ball to go from the tiles to the muzzle in the time-driven cycle. */
export const CYCLE_SECONDS = 2.6;

export function cyclePhase(c: number): CyclePhase | null {
  if (c < 0 || c > 1) return null;
  for (const k of Object.keys(CYCLE_PHASES) as CyclePhase[]) {
    const [a, b] = CYCLE_PHASES[k];
    if (c >= a && c <= b) return k;
  }
  return null;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const deg = (d: number) => (d * Math.PI) / 180;

/** Ball radius (mm) by kind. */
export function ballRadiusMm(kind: CycleBallKind) {
  return kind === "POLLEN" ? DERIVED.pollenRadiusMm : DERIVED.nectarRadiusMm;
}

export interface CyclePoint {
  /** Robot frame (chassis) or turret frame. */
  frame: "robot" | "turret";
  x: number;
  y: number;
  z: number;
}

/** Piecewise path in the side view (x, z) through `pts`, uniform in arc length. */
function polyline(pts: [number, number][], t: number): [number, number] {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let s = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (s <= seg[i] || i === seg.length - 1) {
      const k = seg[i] > 0 ? Math.min(1, s / seg[i]) : 0;
      return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)];
    }
    s -= seg[i];
  }
  return pts[pts.length - 1];
}

/**
 * Position of a ball at cycle progress `c` (0 = rolling in, 1 = leaving the muzzle).
 * `exitMm` extends the path along the launch direction after the muzzle (for the hand-off).
 */
export function cyclePoint(c: number, kind: CycleBallKind = "POLLEN", exitMm = 120): CyclePoint {
  const R = ballRadiusMm(kind);
  const phase = (k: CyclePhase) => {
    const [a, b] = CYCLE_PHASES[k];
    return Math.min(1, Math.max(0, (c - a) / (b - a)));
  };
  const RX = INTAKE.rollerXmm;
  const RZ = INTAKE.rollerZmm;
  const arcR = INTAKE.scoopRadiusMm - R; // ball centre radius around the roller axis
  const lip = INTAKE.scoopStartDeg; // 270°
  const scoopEnd = 210;
  // where the ball is when it first sits in the bottom of the scoop
  const inScoop: [number, number] = [RX + arcR * Math.cos(deg(lip)), RZ + arcR * Math.sin(deg(lip))];
  // lift line for this ball size (bigger balls ride further from the chute floor)
  const [dx, dz] = DERIVED.liftDir;
  const [bx, bz] = DERIVED.liftBack;
  const shift = R - DERIVED.pollenRadiusMm;
  const liftAt = (s: number): [number, number] => [HOPPER.liftStartXmm + dx * s - bx * shift, HOPPER.liftStartZmm + dz * s - bz * shift];
  const sAxis = DERIVED.liftAxisMm;

  if (c < CYCLE_PHASES.intake[0]) {
    // rolling in over the tiles, decelerating as the flaps grab it
    const t = ease(phase("approach"));
    return { frame: "robot", x: lerp(330, inScoop[0] + 30, t), y: 0, z: R };
  }
  if (c < CYCLE_PHASES.lift[0]) {
    const t = phase("intake");
    if (t < 0.18) {
      // over the lip into the bottom of the scoop
      const k = ease(t / 0.18);
      return { frame: "robot", x: lerp(inScoop[0] + 30, inScoop[0], k), y: 0, z: lerp(R, inScoop[1], k) };
    }
    const k = (t - 0.18) / 0.82;
    const a = deg(lerp(lip, scoopEnd, k));
    return { frame: "robot", x: RX + arcR * Math.cos(a), y: 0, z: RZ + arcR * Math.sin(a) };
  }
  if (c < CYCLE_PHASES.bore[0]) {
    // the belts carry it up the 60° chute to the turret axis
    const t = phase("lift");
    const a0 = deg(scoopEnd);
    const start: [number, number] = [RX + arcR * Math.cos(a0), RZ + arcR * Math.sin(a0)];
    // blend from the scoop exit onto the lift line over the first 8 %
    const p = liftAt(t * sAxis);
    const k = Math.min(1, t / 0.08);
    return { frame: "robot", x: lerp(start[0], p[0], k), y: 0, z: lerp(start[1], p[1], k) };
  }
  // ---- turret frame from here (x measured from the yaw axis)
  const axisZ = liftAt(sAxis)[1];
  const stage: [number, number] = [SHOOTER_GEOM.stagingXmm, SHOOTER_GEOM.stagingZmm];
  if (c < CYCLE_PHASES.staged[0]) {
    const t = ease(phase("bore"));
    const [x, z] = polyline(
      [
        [liftAt(sAxis)[0] - TURRET.axisXmm, axisZ],
        [-3, axisZ + 24],
        [-8, stage[1] - 16],
        stage,
      ],
      t,
    );
    return { frame: "turret", x, y: 0, z };
  }
  if (c < CYCLE_PHASES.feed[0]) return { frame: "turret", x: stage[0], y: 0, z: stage[1] };
  const fx = DERIVED.flywheelAxisXmm;
  const fz = DERIVED.flywheelAxisZmm;
  const pr = DERIVED.ballPathRadiusMm + (R - DERIVED.pollenRadiusMm) * 0.5;
  const entry: [number, number] = [fx + pr * Math.cos(deg(SHOOTER_GEOM.hoodStartDeg)), fz + pr * Math.sin(deg(SHOOTER_GEOM.hoodStartDeg))];
  if (c < CYCLE_PHASES.hood[0]) {
    const t = ease(phase("feed"));
    const [x, z] = polyline([stage, [stage[0] - 8, stage[1] + 18], entry], t);
    return { frame: "turret", x, y: 0, z };
  }
  if (c <= CYCLE_PHASES.exit[0]) {
    // round the back of the flywheel, accelerating
    const t = phase("hood");
    const k = t * t;
    const a = deg(lerp(SHOOTER_GEOM.hoodStartDeg, SHOOTER_GEOM.hoodExitDeg, k));
    return { frame: "turret", x: fx + pr * Math.cos(a), y: 0, z: fz + pr * Math.sin(a) };
  }
  // out of the muzzle along the 40° launch line
  const t = phase("exit");
  const p = DERIVED.launchPitchRad;
  const muzzleX = 0;
  const muzzleZ = DERIVED.muzzleZmm;
  return { frame: "turret", x: muzzleX + Math.cos(p) * exitMm * t, y: 0, z: muzzleZ + Math.sin(p) * exitMm * t };
}

/** Which mechanisms a ball at progress c is using right now. */
export function cycleUses(c: number) {
  const ph = cyclePhase(c);
  return {
    intake: ph === "approach" ? c > 0.05 : ph === "intake",
    lift: ph === "lift" || (ph === "intake" && c > 0.27) || (ph === "bore" && c < 0.6),
    feeder: ph === "feed" || (ph === "staged" && c > 0.79),
    sensor: ph === "staged",
    flywheel: ph === "staged" || ph === "feed" || ph === "hood" || ph === "exit",
  };
}
