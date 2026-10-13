// ─────────────────────────────────────────────────────────────────────────────
// MEET THE ROBOT — page data that is specific to /robot (the shared robot facts live in
// src/content/robot.ts). Everything here is either a REAL value from the team's repo
// (github.com/aaaravM/ApexFTC2026---36674, cited inline) or a presentation choice (camera
// angles, which side of the robot faces the viewer) that is clearly marked as such.
//
// Pure data + maths: no React, no three.js — safe to import from server components and from the
// main client bundle (the 3D chunk is lazy-loaded separately).
// ─────────────────────────────────────────────────────────────────────────────

import { solve, type Solution, type SolveInput } from "@/lib/ballistics";
import { subsystems, type SubsystemId } from "@/content/robot";

// ─── The stops of the sticky walkthrough ────────────────────────────────────────────────────

export type StopKind = "overview" | "subsystem" | "aim";

export interface StopDef {
  /** "overview" | subsystem id | "aim" */
  key: "overview" | "aim" | SubsystemId;
  kind: StopKind;
  /** Two-digit index printed in the parts list: "00" … "09". */
  index: string;
  /** Mono code: "OVERVIEW", "DRIVE" … "AIM". */
  code: string;
  title: string;
  sub: SubsystemId | null;
  /** DOM id of the section (the ⌘K palette links to `/robot#robot-<subsystemId>`). */
  domId: string;
  /** Short spec tag shown on the 3D selection bracket. */
  tag: string;
}

const SUB_TAGS: Record<SubsystemId, string> = {
  drivetrain: "4 × 104 mm mecanum",
  odometry: "Pinpoint · 2 pods",
  intake: "Roller + 2 CR servos",
  hopper: "Color Sensor V3",
  turret: "±170° · 5 : 1",
  shooter: "4 in · 40° hood",
  vision: "Webcam 1 · 640 × 480",
  electronics: "Control + Expansion Hub",
};

export const STOPS: StopDef[] = [
  { key: "overview", kind: "overview", index: "00", code: "OVERVIEW", title: "APEX-R1", sub: null, domId: "robot-overview", tag: "18 in start cube" },
  ...subsystems.map(
    (s): StopDef => ({
      key: s.id,
      kind: "subsystem",
      index: s.index,
      code: s.code,
      title: s.name,
      sub: s.id,
      domId: `robot-${s.id}`,
      tag: SUB_TAGS[s.id],
    }),
  ),
  { key: "aim", kind: "aim", index: "09", code: "AIM", title: "Aim playground", sub: null, domId: "robot-aim", tag: "Solver · four gates" },
];

export const AIM_STOP = STOPS.length - 1;

// ─── Presentation (camera + how each subsystem is turned toward the viewer) ─────────────────
// Presentation choices, not robot facts. Angles in degrees; three.js world, seen from above:
// azimuth 0 = world +Z, +90 = world +X. Robot frame: 0 = the robot's front, +90 = its left side.

/** Where the camera sits around the robot during the walkthrough (world azimuth). */
export const CAMERA_AZIMUTH_DEG = 35;
/**
 * World bearing of the HIVE the turret stays locked on. Perpendicular to the view (screen right),
 * so the shooter is always seen in side profile while the turret holds its lock.
 */
export const LOCK_BEARING_DEG = CAMERA_AZIMUTH_DEG + 90;

export interface ViewSpec {
  /** Robot-frame direction (deg) that should face the camera while this stop is centred. */
  show: number;
  /** Camera elevation (deg). */
  elev: number;
  /** 0 = frame the whole robot, 1 = frame the subsystem's own bounds. */
  mix: number;
  /** Framing radius multiplier (bigger = wider shot). */
  pad: number;
}

// Medium shots: the subsystem leads, the rest of the robot stays in frame for context. (The
// shooter always shows its side — the turret holds the lock perpendicular to the view — so its
// stop looks down on it to show the hood and flywheel.)
export const VIEWS: Record<StopDef["key"], ViewSpec> = {
  overview: { show: 35, elev: 19, mix: 0, pad: 1 },
  drivetrain: { show: -45, elev: 15, mix: 0.4, pad: 1.1 },
  odometry: { show: -105, elev: 8, mix: 0.4, pad: 1.65 },
  intake: { show: 15, elev: 14, mix: 0.6, pad: 1.3 },
  hopper: { show: -25, elev: 38, mix: 0.6, pad: 1.4 },
  turret: { show: 125, elev: 28, mix: 0.45, pad: 1.65 },
  shooter: { show: -35, elev: 30, mix: 0.6, pad: 1.4 },
  vision: { show: 10, elev: 12, mix: 0.6, pad: 1.5 },
  electronics: { show: 180, elev: 30, mix: 0.6, pad: 1.35 },
  aim: { show: 0, elev: 10, mix: 0, pad: 1 },
};

const DEG = Math.PI / 180;

/**
 * Chassis yaw (radians, unwrapped, increasing) at which each stop is presented. The robot always
 * spins the same way as you scroll down — like a turntable with detents — and turns back when
 * you scroll up. Stop i is shown when `yaw ≡ CAMERA_AZIMUTH − show_i`.
 */
export function presentationYaws(): number[] {
  const out: number[] = [];
  let prev = 0;
  STOPS.forEach((s, i) => {
    if (s.kind === "aim") return; // the AIM heading is set by the turret dial (see aimHeading)
    const base = CAMERA_AZIMUTH_DEG - VIEWS[s.key].show;
    if (i === 0) {
      out.push(base * DEG);
      prev = base;
      return;
    }
    // the first move (out of the hero) is a big one, so the spin reads immediately
    const minStep = i === 1 ? 200 : 40;
    let v = base;
    while (v < prev + minStep) v += 360;
    while (v - 360 >= prev + minStep) v -= 360;
    out.push(v * DEG);
    prev = v;
  });
  return out;
}

// ─── The HIVE we aim at (our stylised line-art model, src/components/robot/Hive.tsx) ─────────
// Competition Manual TU04 §9.6: HIVE pivot 43.95 in up, CELLs 18.8 in apart, CELL 12 in deep.
// The HIVE is drawn tipped 25° (an estimate in Hive.tsx). The aim point is the centre of the
// upward CELL opening — where FIRST put the AprilTag Cluster origin.
const HIVE_PIVOT_IN = 43.95;
const HIVE_CELL_SPACING_IN = 18.8;
const HIVE_CELL_DEPTH_IN = 12;
const HIVE_TILT_DEG = 25;

/** Height of the CELL aim point in our HIVE model, inches (≈ 53.4 in). */
export const CELL_AIM_Z_IN =
  HIVE_PIVOT_IN +
  (HIVE_CELL_DEPTH_IN / 2) * Math.cos(HIVE_TILT_DEG * DEG) +
  (HIVE_CELL_SPACING_IN / 2) * Math.sin(HIVE_TILT_DEG * DEG);

// ─── Robot numbers the page uses (RobotConstants.java) ──────────────────────────────────────
export const RC = {
  /** Shoot.MUZZLE_X_IN / MUZZLE_Z_IN — muzzle 2 in forward of the tracking point, 14 in up. */
  muzzleXIn: 2,
  muzzleZIn: 14,
  /** Shoot.RPM_TOLERANCE, READY_STABLE_SEC, MAX_FLYWHEEL_RPM, RPM_RAMP_PER_SEC. */
  rpmTolerance: 100,
  readyStableSec: 0.15,
  maxRpm: 5000,
  rpmRampPerSec: 4000,
  /** Turret.TOLERANCE_RAD (1.5°), Turret.MIN/MAX_ANGLE_RAD (±170°), Turret.KV. */
  turretToleranceDeg: 1.5,
  turretLimitDeg: 170,
  turretKv: 0.11,
  /** Hive.MAX_ESTIMATE_AGE_SEC — how long odometry may carry the HIVE estimate. */
  maxEstimateAgeSec: 1.5,
  /** Camera.FX and Camera.WIDTH → horizontal field of view of "Webcam 1". */
  cameraFxPx: 622,
  cameraWidthPx: 640,
  /** Drive.FREE_SPEED_IN_PER_SEC inputs. */
  driveMotorRpm: 312,
  wheelDiameterIn: 4.094488,
  /** BallType.java transfer efficiencies. */
  etaPollen: 0.5,
  etaNectar: 0.42,
  flywheelDiameterIn: 4,
} as const;

/** Horizontal field of view of the chassis webcam, degrees: 2·atan(320 / 622) ≈ 54.4°. */
export const CAMERA_HFOV_DEG = (2 * Math.atan(RC.cameraWidthPx / 2 / RC.cameraFxPx)) / DEG;

/** Drive free speed derived from the motor + wheel (matches Drive.FREE_SPEED_IN_PER_SEC = 66.889). */
export const DRIVE_FREE_SPEED_IN_S = (RC.driveMotorRpm * Math.PI * RC.wheelDiameterIn) / 60;

// ─── AIM playground maths (shared by the DOM panel and the 3D scene) ────────────────────────

export const AIM_DEFAULTS = { rangeIn: 96, turretDeg: 0 } as const;
export const AIM_RANGE = { min: 24, max: 144 } as const;

/**
 * In the playground the HIVE stays put (world bearing LOCK_BEARING) and the dial sets the TURRET
 * angle in the robot frame — so the chassis swings underneath while the turret holds the HIVE,
 * exactly what happens when the driver spins the robot. heading = bearing − turret.
 */
export function aimHeadingDeg(turretDeg: number) {
  return LOCK_BEARING_DEG - turretDeg;
}

export interface AimGeometry {
  input: SolveInput;
  solution: Solution;
  /** Highest point of the arc, inches above the floor — null when the ball is still rising at the CELL. */
  apexZIn: number | null;
  apexTimeSec: number;
}

/**
 * The team's solver (src/lib/ballistics.ts, a port of Ballistics.java) for a robot at the field
 * origin with heading `headingRad`, and the HIVE CELL `rangeIn` away along LOCK_BEARING.
 * Field frame: +x = world +Z, +y = world +X, z up, inches.
 */
export function aimGeometry(rangeIn: number, headingRad: number): AimGeometry {
  const b = LOCK_BEARING_DEG * DEG;
  const input: SolveInput = {
    muzzle: { x: RC.muzzleXIn * Math.cos(headingRad), y: RC.muzzleXIn * Math.sin(headingRad), z: RC.muzzleZIn },
    target: { x: rangeIn * Math.cos(b), y: rangeIn * Math.sin(b), z: CELL_AIM_Z_IN },
    robotVel: { x: 0, y: 0 },
    robotHeadingRad: headingRad,
    ball: "POLLEN",
  };
  const solution = solve(input);
  let apexZIn: number | null = null;
  let apexTimeSec = 0;
  if (solution.valid) {
    const vZ = solution.muzzleSpeedIn * Math.sin(40 * DEG);
    apexTimeSec = vZ / 386.0886;
    // DESIGN_SPEC errata #3: with the fixed 40° hood the apex can come AFTER the CELL —
    // then there is no apex on the drawn arc ("RISING AT TARGET").
    if (apexTimeSec <= solution.flightTimeSec) apexZIn = RC.muzzleZIn + (vZ * vZ) / (2 * 386.0886);
  }
  return { input, solution, apexZIn, apexTimeSec };
}

export interface Gates {
  solution: boolean;
  onTarget: boolean;
  atSpeed: boolean;
  fresh: boolean;
}

/**
 * AimController.getReadinessText() — the one line the driver sees, in the same order of checks
 * as the robot code (target, solution, turret, flywheel).
 */
export function readinessText(g: Gates, sol: Solution, turretErrDeg: number, rpmErr: number) {
  if (!g.fresh) return "NO TARGET";
  if (!sol.valid) return `NO SOLUTION: ${sol.failReason}`;
  if (!g.onTarget) return `TURRET ${turretErrDeg >= 0 ? "+" : "−"}${Math.abs(turretErrDeg).toFixed(1)} deg`;
  if (!g.atSpeed) return `SPINNING ${rpmErr >= 0 ? "+" : "−"}${Math.abs(Math.round(rpmErr))} rpm`;
  return "READY";
}

// ─── Section navigator (watermelon scroll-island) ───────────────────────────────────────────

export const ISLAND_TOPICS = [
  ...STOPS.map((s) => ({ id: s.domId, title: s.kind === "overview" ? "Overview" : s.title, meta: s.code })),
  { id: "robot-datasheet", title: "Data sheet", meta: "SPECS" },
  { id: "robot-photos", title: "Photos", meta: "PENDING" },
];

// ─── Real wiring (hub-backup/README-rewire.md, the 2026-10-11 rewire) ───────────────────────

export interface WireRow {
  hub: "Control" | "Expansion";
  port: string;
  name: string;
  what: string;
}

export const WIRING: WireRow[] = [
  { hub: "Control", port: "motor 0", name: "rightback", what: "drivetrain" },
  { hub: "Control", port: "motor 1", name: "rightfront", what: "drivetrain" },
  { hub: "Control", port: "motor 3", name: "Flywheel", what: "shooter" },
  { hub: "Control", port: "servo 1", name: "rightintake", what: "intake" },
  { hub: "Control", port: "I2C ?", name: "odomcomp", what: "Pinpoint (never bus 0)" },
  { hub: "Control", port: "I2C 0", name: "imu", what: "built-in IMU" },
  { hub: "Expansion", port: "motor 1", name: "leftfront", what: "drivetrain" },
  { hub: "Expansion", port: "motor 2", name: "intakemain", what: "intake" },
  { hub: "Expansion", port: "motor 3", name: "leftback", what: "drivetrain" },
  { hub: "Expansion", port: "servo 5", name: "leftintake", what: "intake" },
];

// ─── Colour sorter thresholds (RobotConstants.Colors) ───────────────────────────────────────
export const HUE_BANDS = [
  { key: "pollen", label: "POLLEN", from: 35, to: 85 },
  { key: "red", label: "NECTAR R", from: 340, to: 20 },
  { key: "blue", label: "NECTAR B", from: 190, to: 265 },
] as const;
