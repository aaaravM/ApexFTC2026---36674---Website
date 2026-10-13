// TypeScript port of the team's shoot-on-the-move solver
// (TeamCode/.../util/Ballistics.java + BallType.java in github.com/aaaravM/ApexFTC2026---36674).
// Same maths, same constants, so the website demo behaves like the robot code.
// Units: inches, seconds, radians. Frame: +X forward, +Y left, heading CCW.

/** Gravity in inches per second squared (9.80665 m/s²). */
export const G_IN_S2 = 386.0886;

/** Values copied from RobotConstants.java (Shoot + Turret). */
export const SHOOTER = {
  launchPitchDeg: 40,
  flywheelDiameterIn: 4.0,
  maxFlywheelRpm: 5000,
  muzzleHeightIn: 14,
  turretMinRad: (-170 * Math.PI) / 180,
  turretMaxRad: (170 * Math.PI) / 180,
} as const;

export type BallKind = "POLLEN" | "NECTAR_RED" | "NECTAR_BLUE";

/** BallType.java — diameter (in), mass (kg), transfer efficiency, drag per inch. */
export const BALLS: Record<BallKind, { diameterIn: number; massKg: number; transferEfficiency: number; dragPerInch: number }> = {
  POLLEN: { diameterIn: 2.8, massKg: 0.025, transferEfficiency: 0.5, dragPerInch: 0 },
  NECTAR_RED: { diameterIn: 3.6, massKg: 0.041, transferEfficiency: 0.42, dragPerInch: 0 },
  NECTAR_BLUE: { diameterIn: 3.6, massKg: 0.041, transferEfficiency: 0.42, dragPerInch: 0 },
};

export interface Solution {
  valid: boolean;
  /** Azimuth to point the muzzle, field frame, radians CCW from +X. */
  fieldAzimuthRad: number;
  /** Turret angle in the robot frame, radians. */
  turretAngleRad: number;
  /** Ball exit speed, in/s. */
  muzzleSpeedIn: number;
  flywheelRpm: number;
  flightTimeSec: number;
  /** Horizontal distance to the virtual (lead) target, inches. */
  virtualDistanceIn: number;
  /** Horizontal distance to the real target, inches. */
  actualDistanceIn: number;
  /** How far the moving-shot correction moved the aim, radians. */
  leadAngleRad: number;
  /** Fixed-point iterations used. */
  iterations: number;
  failReason: string;
}

export interface SolveInput {
  muzzle: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  /** Robot velocity, field frame, in/s. */
  robotVel?: { x: number; y: number };
  robotHeadingRad?: number;
  ball?: BallKind;
  launchPitchDeg?: number;
}

export const wrapRad = (a: number) => {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
};

/** rpm = 60 · muzzleSpeed / (efficiency · π · flywheelDiameter) */
export function muzzleSpeedToRpm(muzzleSpeedIn: number, ball: BallKind) {
  const eff = BALLS[ball].transferEfficiency > 1e-6 ? BALLS[ball].transferEfficiency : 0.5;
  return (60 * muzzleSpeedIn) / (eff * Math.PI * SHOOTER.flywheelDiameterIn);
}

/**
 * Full moving-shot solve (Ballistics.solve). Aims at a virtual target displaced by
 * −robotVelocity × flightTime; with a fixed hood, t = √(2(d·tanθ − h)/G), iterated to convergence.
 */
export function solve({
  muzzle,
  target,
  robotVel = { x: 0, y: 0 },
  robotHeadingRad = 0,
  ball = "POLLEN",
  launchPitchDeg = SHOOTER.launchPitchDeg,
}: SolveInput): Solution {
  const theta = (launchPitchDeg * Math.PI) / 180;
  const tanTheta = Math.tan(theta);
  const cosTheta = Math.cos(theta);
  const h = target.z - muzzle.z;

  const actualDistanceIn = Math.hypot(target.x - muzzle.x, target.y - muzzle.y);
  const actualAzimuth = Math.atan2(target.y - muzzle.y, target.x - muzzle.x);

  const s: Solution = {
    valid: false,
    fieldAzimuthRad: actualAzimuth,
    turretAngleRad: wrapRad(actualAzimuth - robotHeadingRad),
    muzzleSpeedIn: 0,
    flywheelRpm: 0,
    flightTimeSec: 0,
    virtualDistanceIn: actualDistanceIn,
    actualDistanceIn,
    leadAngleRad: 0,
    iterations: 0,
    failReason: "",
  };

  if (theta <= 0 || theta >= Math.PI / 2) {
    s.failReason = "launch pitch must be strictly between 0 and 90°";
    return s;
  }

  let t = 0;
  let d = actualDistanceIn;
  let azimuth = actualAzimuth;

  for (let i = 0; i < 6; i++) {
    const dx = target.x - robotVel.x * t - muzzle.x;
    const dy = target.y - robotVel.y * t - muzzle.y;
    d = Math.hypot(dx, dy);
    azimuth = Math.atan2(dy, dx);
    s.iterations = i + 1;

    const bracket = d * tanTheta - h;
    if (bracket <= 0) {
      s.failReason = "target too high or too close for the hood angle — back up";
      return s;
    }
    const tNew = Math.sqrt((2 * bracket) / G_IN_S2);
    const converged = Math.abs(tNew - t) < 1e-4;
    t = tNew;
    if (converged) break;
  }

  if (d < 1e-6 || t < 1e-6) {
    s.failReason = "degenerate geometry";
    return s;
  }

  let muzzleSpeed = d / t / cosTheta;
  muzzleSpeed *= 1 + BALLS[ball].dragPerInch * d;

  s.muzzleSpeedIn = muzzleSpeed;
  s.flightTimeSec = t;
  s.virtualDistanceIn = d;
  s.fieldAzimuthRad = azimuth;
  s.turretAngleRad = wrapRad(azimuth - robotHeadingRad);
  s.leadAngleRad = wrapRad(azimuth - actualAzimuth);
  s.flywheelRpm = muzzleSpeedToRpm(muzzleSpeed, ball);

  if (s.flywheelRpm > SHOOTER.maxFlywheelRpm) {
    s.failReason = `out of range — needs ${Math.round(s.flywheelRpm)} rpm, max is ${SHOOTER.maxFlywheelRpm}`;
    return s;
  }
  if (s.turretAngleRad < SHOOTER.turretMinRad || s.turretAngleRad > SHOOTER.turretMaxRad) {
    s.failReason = "turret can't reach that angle — rotate the chassis";
    return s;
  }

  s.valid = true;
  return s;
}

/**
 * The apex — highest point of the shot's arc. Vertical speed hits zero at t = v_z / G,
 * so the peak sits at z0 + v_z² / 2G. (The team is named after this point.)
 */
export function apexOf(input: SolveInput, sol: Solution) {
  const theta = ((input.launchPitchDeg ?? SHOOTER.launchPitchDeg) * Math.PI) / 180;
  const vZ = sol.muzzleSpeedIn * Math.sin(theta);
  const time = vZ / G_IN_S2;
  return { time, ...ballPosition(input, sol, time) };
}

/**
 * Position of the ball `time` seconds after launch, for drawing the arc.
 * The ball inherits the robot's velocity, so it curves onto the real target.
 */
export function ballPosition(input: SolveInput, sol: Solution, time: number) {
  const theta = ((input.launchPitchDeg ?? SHOOTER.launchPitchDeg) * Math.PI) / 180;
  const vH = sol.muzzleSpeedIn * Math.cos(theta);
  const vZ = sol.muzzleSpeedIn * Math.sin(theta);
  const v = input.robotVel ?? { x: 0, y: 0 };
  return {
    x: input.muzzle.x + (vH * Math.cos(sol.fieldAzimuthRad) + v.x) * time,
    y: input.muzzle.y + (vH * Math.sin(sol.fieldAzimuthRad) + v.y) * time,
    z: input.muzzle.z + vZ * time - 0.5 * G_IN_S2 * time * time,
  };
}
