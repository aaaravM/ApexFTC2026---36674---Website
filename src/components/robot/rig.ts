/**
 * Animation rig for APEX-R1: subsystem ids, explode layout, smoothing maths, mecanum kinematics,
 * camera framing and the public prop / handle types. No React in here, so pages can import it cheaply.
 */
import * as THREE from "three";
import type { CycleBallKind } from "./cycle";
import { DERIVED, DRIVE, ENVELOPE, IN, SHOOTER_GEOM, TURRET } from "./dimensions";

export const SUBSYSTEMS = [
  "drivetrain",
  "odometry",
  "electronics",
  "intake",
  "hopper",
  "turret",
  "shooter",
  "vision",
] as const;
export type SubsystemId = (typeof SUBSYSTEMS)[number];

export type RobotLook = "studio" | "clay" | "blueprint";
export type RobotTone = "dark" | "light";

export interface SubsystemInfo {
  id: SubsystemId;
  label: string;
  /** One-line description for annotations. */
  blurb: string;
  /** Explode offset in metres (three.js axes, robot facing +Z), applied at explode = 1. */
  explode: [number, number, number];
  /** 0–1 start delay inside the explode timeline (stagger). */
  delay: number;
}

/**
 * Explode layout. Offsets are relative to the parent group: the shooter rides on the turret, so its
 * offset adds to the turret's. The whole robot also lifts by EXPLODE_LIFT so the odometry pods can
 * drop below the chassis without going through the floor. Layers are spread so no two overlap on
 * screen from the three-quarter or side cameras: electronics go back, the intake/vision/hopper
 * stack goes forward, turret + shooter go up.
 */
export const SUBSYSTEM_INFO: Record<SubsystemId, SubsystemInfo> = {
  drivetrain: {
    id: "drivetrain",
    label: "Drivetrain",
    blurb: "goBILDA Strafer chassis: 1120 U-channel, four 104 mm mecanum wheels driven through miter gears by 312 RPM Yellow Jackets.",
    explode: [0, 0, 0],
    delay: 0.3,
  },
  odometry: {
    id: "odometry",
    label: "Odometry",
    blurb: "Pinpoint computer + two dead-wheel pods (X −84 mm, Y −168 mm).",
    explode: [0, -0.07, 0],
    delay: 0.26,
  },
  electronics: {
    id: "electronics",
    label: "Electronics",
    blurb: "REV Control Hub + Expansion Hub, 12 V NiMH battery, main switch.",
    explode: [0, 0.05, -0.21],
    delay: 0.2,
  },
  intake: {
    id: "intake",
    label: "Intake",
    blurb: "Full-width silicone-flap roller on a belt-driven 5203, reaching balls on the tiles.",
    explode: [0, 0.02, 0.27],
    delay: 0.16,
  },
  hopper: {
    id: "hopper",
    label: "Hopper",
    blurb: "Funnel scoop and a 60° two-belt lift (the CR servos) up to the turret bore.",
    explode: [0, 0.04, 0.12],
    delay: 0.12,
  },
  turret: {
    id: "turret",
    label: "Turret",
    blurb: "±170° lazy-susan turret, 100 T ring gear driven 5:1 by a pinion motor, with a hard stop.",
    explode: [0, 0.11, 0],
    delay: 0.08,
  },
  shooter: {
    id: "shooter",
    label: "Shooter",
    blurb: "4 in flywheel under a sprung 40° hood; muzzle 14 in up, on the turret axis; colour sensor at the staging point.",
    explode: [0, 0.1, 0],
    delay: 0.04,
  },
  vision: {
    id: "vision",
    label: "Vision",
    blurb: "“Webcam 1” fixed to the chassis, 10.5 in up, tracking the HIVE AprilTag cluster.",
    explode: [0, 0.07, 0.24],
    delay: 0,
  },
};

/** Wheels slide outward along their axles within the drivetrain explode. */
export const WHEEL_EXPLODE = 0.07;
/** Whole-robot lift at explode = 1 (metres). */
export const EXPLODE_LIFT = 0.1;
/** Peak transient tilt (radians) of a subsystem while it slides out. */
export const EXPLODE_TILT = (3.5 * Math.PI) / 180;
const MAX_DELAY = Math.max(...SUBSYSTEMS.map((s) => SUBSYSTEM_INFO[s].delay));

/**
 * Render layer for small detail meshes (screws, connectors, labels, cables, LEDs). The main camera
 * renders it (ApexRobot enables it on the default camera); the contact-shadow camera only sees
 * layer 0, so details don't cost a second draw call in the shadow pass.
 */
export const DETAIL_LAYER = 4;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Per-subsystem explode progress (0–1) for a global explode value, with stagger + easing. */
export function explodeProgress(explode: number, id: SubsystemId) {
  const span = 1 - MAX_DELAY;
  const t = clamp((explode - SUBSYSTEM_INFO[id].delay) / span, 0, 1);
  return easeInOutCubic(t);
}

/**
 * Choreographed explode pose for a subsystem at progress k (0–1): it lifts first, then slides out
 * along a gentle arc, tilting a few degrees on the way and settling level. Writes the offset
 * (metres) into `pos` and the tilt into `rot` (Euler XYZ, radians).
 */
export function explodePose(id: SubsystemId, k: number, pos: THREE.Vector3, rot: THREE.Euler) {
  const off = SUBSYSTEM_INFO[id].explode;
  const ky = smoothstep(clamp(k / 0.6, 0, 1));
  const kh = smoothstep(clamp((k - 0.22) / 0.78, 0, 1));
  const horiz = Math.hypot(off[0], off[2]);
  const bump = horiz * 0.22 * Math.sin(Math.PI * kh);
  pos.set(off[0] * kh, off[1] * ky + bump, off[2] * kh);
  if (horiz > 1e-6) {
    // tilt about the axis perpendicular to the slide: the leading edge dips, then levels out
    const a = EXPLODE_TILT * Math.sin(Math.PI * kh);
    rot.set((off[2] / horiz) * a, 0, (-off[0] / horiz) * a);
  } else rot.set(0, 0, 0);
}

/**
 * Critically damped spring toward a target (Unity-style SmoothDamp, Game Programming Gems 4 §1.10).
 * `state.v` carries velocity between frames. Returns the new value.
 */
export function smoothDamp(
  state: { x: number; v: number },
  target: number,
  smoothTime: number,
  dt: number,
  maxSpeed = Infinity,
) {
  if (dt <= 0) return state.x;
  const st = Math.max(1e-4, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = state.x - target;
  const maxChange = maxSpeed * st;
  change = clamp(change, -maxChange, maxChange);
  const clampedTarget = state.x - change;
  const temp = (state.v + omega * change) * dt;
  state.v = (state.v - omega * temp) * exp;
  let out = clampedTarget + (change + temp) * exp;
  // never overshoot the (original) target
  if (target - state.x > 0 === out > target) {
    out = target;
    state.v = (out - target) / dt;
  }
  state.x = out;
  return out;
}

/** Exponential approach, frame-rate independent. `rate` is 1/seconds. */
export const approach = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

export const TURRET_MIN_RAD = DERIVED.turretMinRad;
export const TURRET_MAX_RAD = DERIVED.turretMaxRad;
export const TURRET_MAX_SLEW = (TURRET.maxSlewDegPerSec * Math.PI) / 180;
export const clampTurret = (yaw: number) => clamp(yaw, TURRET_MIN_RAD, TURRET_MAX_RAD);

/** Visual spin scaling. Real flywheel speeds alias badly at 60 fps, so they are compressed. */
export const FLYWHEEL_VISUAL_SCALE = 0.045;
export const WHEEL_VISUAL_SCALE = 0.6;
/**
 * Largest visual step per frame for a part with n-fold symmetry: 30 % of its symmetry angle, so a
 * spinning part never strobes backwards whatever the frame rate. Faster spins fade in a blur disc.
 */
export const maxSpinStep = (folds: number) => (0.3 * Math.PI * 2) / folds;

/**
 * Mecanum inverse kinematics with the team's sign convention (robot frame: +x forward, +y left,
 * +ω CCW). Returns wheel angular velocities in rad/s, positive = that wheel rolls the robot forward.
 * Order: [frontLeft, frontRight, backLeft, backRight].
 * Uses the model's geometry: lx = half wheelbase, ly = half track (inches).
 */
export function mecanumWheelSpeeds(vxInPerSec: number, vyInPerSec: number, omegaRadPerSec: number) {
  const r = DRIVE.wheelDiameterMm / 2 / 25.4;
  const lx = DRIVE.wheelXmm / 25.4;
  const ly = DRIVE.wheelYmm / 25.4;
  const k = lx + ly;
  const fl = (vxInPerSec - vyInPerSec - k * omegaRadPerSec) / r;
  const fr = (vxInPerSec + vyInPerSec + k * omegaRadPerSec) / r;
  const bl = (vxInPerSec + vyInPerSec - k * omegaRadPerSec) / r;
  const br = (vxInPerSec - vyInPerSec + k * omegaRadPerSec) / r;
  return [fl, fr, bl, br] as [number, number, number, number];
}

/**
 * Mecanum forward kinematics: chassis twist from wheel angular velocities (rad/s, + = forward).
 * Returns { vx, vy } in m/s (robot frame) and ω in rad/s (CCW).
 */
export function mecanumTwist(w: readonly number[]) {
  const r = DRIVE.wheelDiameterMm / 2000;
  const k = (DRIVE.wheelXmm + DRIVE.wheelYmm) / 1000;
  const [fl, fr, bl, br] = [w[0] ?? 0, w[1] ?? 0, w[2] ?? 0, w[3] ?? 0];
  return {
    vx: (r / 4) * (fl + fr + bl + br),
    vy: (r / 4) * (-fl + fr + bl - br),
    omega: (r / (4 * k)) * (-fl + fr - bl + br),
  };
}

export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Turret yaw (radians, robot frame, NOT clamped) that points the shooter at a world-space point,
 * given the robot root's world matrix. Feed it to `turretYaw`; the robot clamps to ±170° and
 * `isTurretAtLimit()` reports when the target is out of reach (the honest "LIMIT" state).
 */
export function turretYawToward(robotMatrixWorld: THREE.Matrix4, target: THREE.Vector3) {
  const local = target.clone().applyMatrix4(robotMatrixWorld.clone().invert());
  const dx = local.x;
  const dz = local.z - TURRET.axisXmm / 1000;
  return wrapAngle(Math.atan2(dx, dz));
}

/** Launch direction (unit vector, three.js axes) for a turret yaw, at the fixed 40° hood pitch. */
export function launchDirection(yaw: number, out = new THREE.Vector3()) {
  const p = DERIVED.launchPitchRad;
  return out.set(Math.sin(yaw) * Math.cos(p), Math.sin(p), Math.cos(yaw) * Math.cos(p));
}

// ------------------------------------------------------------------------------------------------
// Camera framing
// ------------------------------------------------------------------------------------------------
/** Bounding sphere (metres, robot root frame) of the assembled robot and of the full explode. */
export const ROBOT_BOUNDS = {
  assembled: { center: new THREE.Vector3(0, 0.2, 0), radius: 0.36 },
  exploded: { center: new THREE.Vector3(0, 0.33, 0.03), radius: 0.56 },
} as const;

/**
 * Place a perspective camera so the robot fills the view on any aspect ratio (phones included):
 * distance = r / sin(half-FOV), using the narrower of the vertical and horizontal FOV.
 * `direction` is the unit vector from the target toward the camera.
 */
export function fitRobot(
  camera: THREE.PerspectiveCamera,
  size: { width: number; height: number },
  opts: { explode?: number; margin?: number; direction?: THREE.Vector3; center?: THREE.Vector3 } = {},
) {
  const e = clamp(opts.explode ?? 0, 0, 1);
  const a = ROBOT_BOUNDS.assembled;
  const b = ROBOT_BOUNDS.exploded;
  const center = opts.center ?? a.center.clone().lerp(b.center, e);
  const radius = THREE.MathUtils.lerp(a.radius, b.radius, e) * (opts.margin ?? 1.06);
  const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
  const aspect = size.width / Math.max(1, size.height);
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const dist = radius / Math.sin(Math.min(vHalf, hHalf));
  const dir = (opts.direction ?? new THREE.Vector3(0.62, 0.4, 0.74)).clone().normalize();
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  return { center, distance: dist };
}

// ------------------------------------------------------------------------------------------------
// Public types
// ------------------------------------------------------------------------------------------------
export type WheelSpeeds = [number, number, number, number];
/** One subsystem, several (an assembly), or none. */
export type HighlightTarget = SubsystemId | readonly SubsystemId[] | null;

/**
 * Per-frame overrides read by the robot's animation loop. Write to `command.current` from your own
 * useFrame / scroll handler to drive the robot at 60 fps without re-rendering React.
 * Any field left undefined falls back to the matching prop.
 */
export interface RobotCommand {
  turretYaw?: number;
  flywheelRpm?: number;
  wheelSpeeds?: WheelSpeeds;
  intakeOn?: boolean;
  feederOn?: boolean;
  explode?: number;
  highlight?: HighlightTarget;
  /** Per-subsystem ghost level 0–1; wins over `highlight` for the ids it lists. */
  ghost?: Partial<Record<SubsystemId, number>>;
  /** Extra per-subsystem offsets (metres, three.js axes) added on top of the explode pose. */
  offset?: Partial<Record<SubsystemId, readonly [number, number, number]>>;
  /** Extra outward slide of all four wheels (metres), added to the drivetrain explode. */
  wheelOffset?: number;
  /** Scoring-cycle playhead (see ApexRobotProps.cycle); null turns it off. */
  cycle?: number | null;
}

/** Fired when a ball of the scoring cycle leaves the muzzle. */
export interface LaunchEvent {
  /** Ball centre at the muzzle, world space. */
  world: THREE.Vector3;
  /** Unit launch direction, world space (current yaw, 40° pitch). */
  direction: THREE.Vector3;
  yaw: number;
  rpm: number;
  kind: CycleBallKind;
}

export interface ApexRobotProps {
  /** Imperative per-frame overrides (see RobotCommand). */
  command?: { current: RobotCommand | null };
  /** Turret yaw target, radians, CCW positive (robot frame). Clamped to ±170°, critically damped. */
  turretYaw?: number;
  /** Flywheel speed target in RPM (visual spin; ramps at the team's 4000 RPM/s). */
  flywheelRpm?: number;
  /** Wheel angular speeds in rad/s [fl, fr, bl, br]; + rolls forward. See mecanumWheelSpeeds(). */
  wheelSpeeds?: WheelSpeeds;
  /** Spin the intake roller (and its belt). */
  intakeOn?: boolean;
  /** Spin the feeder wheel on the turret. */
  feederOn?: boolean;
  /** Exploded view, 0–1. Eased per subsystem with stagger and smoothed over time. */
  explode?: number;
  /** Subsystem(s) to spotlight; the rest are ghosted. null = none. */
  highlight?: HighlightTarget;
  /** Per-subsystem ghost level 0–1 (e.g. a CAD assembly focus); wins over `highlight`. */
  ghost?: Partial<Record<SubsystemId, number>>;
  look?: RobotLook;
  /**
   * "dark" (default) or "light" — clay: graphite vs bone; blueprint: dark sheet vs drafting paper.
   * Match it to the page theme.
   */
  tone?: RobotTone;
  /** Accent colour (hex) for printed parts (studio), functional parts (clay) and lines (blueprint). */
  accent?: string;
  /** Alliance colour of the number plates. */
  alliance?: "red" | "blue";
  /** Show the optional Limelight 3A on the turret. */
  limelight?: boolean;
  /** POLLEN waiting in the robot (0–3): two in the lift, the third staged on the turret. */
  preload?: number;
  /** Disable continuous spin animations; snap explode. Defaults to the user's media query. */
  reducedMotion?: boolean;
  /** Seconds for explode smoothing (0 = follow the prop exactly). */
  explodeSmoothing?: number;
  /**
   * Scrub the scoring cycle: a ball at progress `cycle` (0 = rolling in over the tiles, 1 = leaving
   * the muzzle) travels through the real mechanism, and the intake, lift, feeder and flywheel run
   * as it passes them. null (default) = off. Values past 1 are allowed for trains (see cycleBalls).
   */
  cycle?: number | null;
  /** Balls in a scrubbed train (1–3), spaced CYCLE_SPACING apart (default 1). */
  cycleBalls?: number;
  /** Run the scoring cycle continuously in time (true = 0.4 balls/s, or a balls-per-second rate). */
  autoCycle?: boolean | number;
  /** Ball type for the cycle (default POLLEN). */
  cycleKind?: CycleBallKind;
  /**
   * Idle life for hero shots: hub LEDs breathe, the webcam LED blinks, the turret scans ±12° slowly
   * and the flywheel idles at 600 RPM. Off by default (pages that render on demand stay settled).
   */
  idle?: boolean;
  /**
   * Baked volumetric ambient occlusion (studio + clay). Baked once per page in ≈ 4 ms slices after
   * the robot first sits assembled, then faded in. Default true.
   */
  ambientOcclusion?: boolean;
  /**
   * A cycle ball reached the muzzle. Return true if you launched your own (e.g. Balls.fire with the
   * solver's arc) and the robot's ball should disappear; otherwise it continues briefly and fades.
   */
  onLaunch?: (e: LaunchEvent) => boolean | void;
  /** Called once every shader variant the robot can switch to (ghosts included) is compiled. */
  onReady?: () => void;
  onSubsystemOver?: (id: SubsystemId | null) => void;
  onSubsystemClick?: (id: SubsystemId) => void;
}

export interface ApexRobotHandle {
  /** Root group of the robot. */
  readonly root: THREE.Group | null;
  /** Muzzle (hood exit, ball centre) in world space. */
  getMuzzleWorld(out?: THREE.Vector3): THREE.Vector3;
  /** Unit launch direction in world space (current smoothed yaw, 40° pitch). */
  getLaunchDirectionWorld(out?: THREE.Vector3): THREE.Vector3;
  /** Turret pivot (top of the turret platform, on the yaw axis) in world space. */
  getTurretPivotWorld(out?: THREE.Vector3): THREE.Vector3;
  /** Webcam lens centre in world space. */
  getCameraMountWorld(out?: THREE.Vector3): THREE.Vector3;
  /** Annotation hotspot for a subsystem, in world space (follows explode + turret). */
  getAnchorWorld(id: SubsystemId, out?: THREE.Vector3): THREE.Vector3;
  /** Current (smoothed) turret yaw, radians. */
  getTurretYaw(): number;
  /** Current (ramped) flywheel RPM. */
  getFlywheelRpm(): number;
  /** True when the smoothed turret is within `tol` radians of its target and nearly still. */
  isTurretSettled(tol?: number): boolean;
  /** True when the requested yaw is beyond ±170° (the turret is parked on its limit). */
  isTurretAtLimit(): boolean;
  /** Look up a named rig object (e.g. "muzzle", "turretYaw", "anchor.shooter"). */
  getObject(name: string): THREE.Object3D | undefined;
  /**
   * True when nothing on the robot is moving (springs at rest, nothing spinning, no cycle balls).
   * While it is false the robot calls invalidate() every frame, so frameloop="demand" pages keep
   * rendering until it settles. (Optional so other robot implementations can omit it.)
   */
  isSettled?(): boolean;
  /** True once the shader prewarm has finished (see onReady). */
  isReady?(): boolean;
}

/** Constants pages often need. */
export const RIG = {
  muzzleIn: { x: SHOOTER_GEOM.muzzleXin, y: SHOOTER_GEOM.muzzleYin, z: SHOOTER_GEOM.muzzleZin },
  launchPitchDeg: SHOOTER_GEOM.launchPitchDeg,
  turretAxisZ: TURRET.axisXmm / 1000,
  inch: IN,
  envelope: ENVELOPE,
};
