/**
 * APEX-R1 concept model: every dimension in one place.
 *
 * Sources, in priority order:
 *   [RC]   RobotConstants.java in github.com/aaaravM/ApexFTC2026---36674 (the team's real numbers)
 *   [GB]   goBILDA product drawings (Strafer v7 3209-0001-0007, 1120/1121 U-channel, 3625 GripForce
 *          mecanum, 5203 motors, 3110 odometry pod, Pinpoint V2, 3100-0012-0020 12 V NiMH battery)
 *   [REV]  REV Robotics docs (Control / Expansion Hub 143 × 103 × 29.5 mm)
 *   [CM]   BIOBUZZ Competition Manual TU04 (field elements, R102 sizing cube, R401–R403 robot signs)
 *   [est]  estimate: sensible goBILDA/REV-style value, to be replaced by CAD when it exists
 *
 * Units: authored in MILLIMETRES (mm) or INCHES (in) as the source states, exported in METRES
 * for three.js (1 unit = 1 m).
 *
 * Frames
 *   Robot frame (team code): +x forward, +y left, +z up, origin = odometry tracking centre on the floor.
 *   three.js frame:          +Z forward, +X left, +Y up (robot faces the default camera at +Z).
 *   Mapping: three.x = robot.y, three.y = robot.z, three.z = robot.x  (a proper rotation, det = +1).
 *   Robot heading / turret yaw (CCW positive about robot +z) = three rotation.y.
 */

import * as THREE from "three";

/** Metres per inch. */
export const IN = 0.0254;
/** Metres per millimetre. */
export const MM = 0.001;

export type Vec3Tuple = [number, number, number];

/** Robot-frame point (inches) -> three.js position (metres). */
export function robotInToThree(x: number, y: number, z: number, out = new THREE.Vector3()) {
  return out.set(y * IN, z * IN, x * IN);
}
/** Robot-frame point (mm) -> three.js position tuple (metres). Used to author the assembly. */
export function rmm(x: number, y: number, z: number): Vec3Tuple {
  return [y * MM, z * MM, x * MM];
}
/** three.js position (metres) -> robot-frame point (inches). */
export function threeToRobotIn(v: THREE.Vector3) {
  return { x: v.z / IN, y: v.x / IN, z: v.y / IN };
}
/** Generic `t.x = r.y * IN, t.y = r.z * IN, t.z = r.x * IN` helper for {x,y,z} objects in inches. */
export function toThree(p: { x: number; y: number; z: number }, out = new THREE.Vector3()) {
  return robotInToThree(p.x, p.y, p.z, out);
}
export function fromThree(v: THREE.Vector3) {
  return threeToRobotIn(v);
}

const deg = (d: number) => (d * Math.PI) / 180;

// ------------------------------------------------------------------------------------------------
// Envelope
// ------------------------------------------------------------------------------------------------
/** FTC starting-configuration sizing cube: 18 × 18 × 18 in [CM R102]. */
export const ENVELOPE_IN = 18;
export const ENVELOPE = ENVELOPE_IN * IN;
/** Half the cube in mm (±228.6 about the tracking centre). */
export const ENVELOPE_HALF_MM = (ENVELOPE_IN * 25.4) / 2;

// ------------------------------------------------------------------------------------------------
// Ball path
// ------------------------------------------------------------------------------------------------
/**
 * Every passage a ball goes through is sized from this: NECTAR (3.6 in = 91.4 mm) plus ~6.5 mm.
 * The team's code intakes, classifies, ejects and shoots NECTAR as well as POLLEN (BallSorter,
 * BallType: NECTAR needs ≈ +19 % RPM), so the hopper cannot be POLLEN-only.
 */
export const BALL_PATH_CLEAR_MM = 98;

// ------------------------------------------------------------------------------------------------
// Drivetrain — goBILDA Strafer Chassis Kit v7 (104 mm GripForce) [GB 3209-0001-0007]
// The team's numbers match it exactly: 104 mm mecanum, 312 RPM 5203s, 66.889 in/s free speed.
// ------------------------------------------------------------------------------------------------
export const DRIVE = {
  /** [RC] WHEEL_DIAMETER_IN = 4.094488 (goBILDA 104 mm GripForce mecanum). */
  wheelDiameterMm: 104,
  /** [GB 3625-0202-0104] 38 mm wide. */
  wheelWidthMm: 38,
  /** [GB 3625-0202-0104] "The 11 rollers…" */
  rollerCount: 11,
  /** [GB Strafer v7] wheelbase 336 mm. */
  wheelXmm: 168,
  /** [GB Strafer v7] track 413.7 mm (451.7 overall − 38): outer tyre face 225.9 mm (< 228.6). */
  wheelYmm: 206.85,
  /** [RC] TICKS_PER_REV 537.7 → goBILDA 5203-2402-0019 (19.2:1, 312 RPM). */
  motorRatio: 19.2,
  motorRpm: 312,
  /** [RC] FREE_SPEED_IN_PER_SEC. */
  freeSpeedInPerSec: 66.889,
} as const;

/** goBILDA 1120 U-channel [GB drawing 1120]. */
export const CHANNEL = {
  outerMm: 48,
  innerMm: 43,
  wallMm: 2.5,
  /** 1121 low-side channel height [GB drawing 1121]. */
  lowSideMm: 12,
  /** 8 mm hole grid, Ø4 mm holes, Ø14 mm bore holes on a 24 mm pitch, 16 mm square pattern. */
  gridMm: 8,
  pitchMm: 24,
  smallHoleMm: 4,
  boreHoleMm: 14,
} as const;

/** Chassis frame (robot frame, mm), Strafer v7 layout [GB] + the team's packaging [est]. */
export const FRAME = {
  /** [GB] 1120-0017-0432 side rails, centred. */
  railLengthMm: 432,
  /** [GB] rail centres 312 mm apart; outer faces 360; 264 mm clear between them. */
  railCentreYmm: 156,
  railOuterYmm: 180,
  railInnerYmm: 132,
  /** [GB] 28 mm ground clearance: rails span z 28–76 and the 14 mm bore row is on the axle line. */
  railBottomZmm: 28,
  /** [GB] 1120-0011-0264 cross member between the rails at the centre (open side forward). */
  crossLengthMm: 264,
  centreCrossXmm: 0,
  /** [est] Back cross member (1120-0015-0360) stacked on the rails; the battery nests in it and the
   *  Y odometry pod hangs underneath. The front is left open for the intake. */
  backCrossXmm: -180,
  backCrossLengthMm: 360,
  /** [est] Electronics deck (3 mm pattern plate) on the rails, between the cross members. */
  deckFrontXmm: -18,
  deckBackXmm: -152,
  deckHalfWidthMm: 180,
  deckThicknessMm: 3,
  /** [est] 1:1 steel miter gears turning each motor's output 90° onto its wheel axle. */
  miterPitchRadiusMm: 12.5,
  miterFaceMm: 8,
} as const;

/**
 * goBILDA 5203 Yellow Jacket motor [GB drawings 5203-2402-0019 / -0001: 36 mm body (37.5 flange),
 * gearbox + 75 mm motor/encoder, 8 mm REX shaft 23.5 mm].
 */
export const MOTOR = {
  diameterMm: 36,
  /** Can + encoder housing = 75 mm [GB]. */
  canLengthMm: 59,
  encoderLengthMm: 16,
  /** [GB 5203-2402-0019] 19.2:1 two-stage planetary. */
  gearbox2StageMm: 41.6,
  /** [est] 5.2:1 single stage (intake). */
  gearbox1StageMm: 37.1,
  /** [GB 5203-2402-0001] 1:1 bearing housing (shooter motor, 6000 RPM). */
  gearboxDirectMm: 32.7,
  /** 8 mm REX output shaft, 23.5 mm long [GB]. */
  shaftMm: 8,
  shaftLengthMm: 23.5,
} as const;

// ------------------------------------------------------------------------------------------------
// Odometry
// ------------------------------------------------------------------------------------------------
export const ODO = {
  /** [RC] X_POD_OFFSET_MM: the forward-rolling pod is 84 mm to the RIGHT (left is positive). */
  xPodOffsetMm: -84.0,
  /** [RC] Y_POD_OFFSET_MM: the sideways-rolling pod is 168 mm BEHIND the tracking point. */
  yPodOffsetMm: -168.0,
  /** [est] Where along x the X pod sits (does not affect odometry). */
  xPodAlongXmm: -50,
  /** [est] Where along y the Y pod sits (does not affect odometry). */
  yPodAlongYmm: 40,
  /** [GB 3110-0001-0002] 32 mm omni wheel, 43 mm mounting block with 32 mm pattern. */
  wheelDiameterMm: 32,
  blockMm: 43,
  blockThicknessMm: 11,
  minHeightMm: 57,
} as const;

/** goBILDA Pinpoint V2 [GB 3110-0002-0002]: 40 × 42.5 mm, 15.6 mm tall, 32 mm pattern. */
export const PINPOINT = { widthMm: 40, lengthMm: 42.5, heightMm: 15.6, bodyHeightMm: 11.5 } as const;

// ------------------------------------------------------------------------------------------------
// Electronics
// ------------------------------------------------------------------------------------------------
/** REV Control Hub / Expansion Hub case [REV: 143 × 103 × 29.5 mm; modelled 32 tall incl. lid]. */
export const HUB = { lengthMm: 143, widthMm: 103, heightMm: 32, stackGapMm: 25 } as const;
/** goBILDA 12 V NiMH nested battery 3000 mAh [GB 3100-0012-0020]: 124 × 43 × 47.8 mm, 10 sub-C cells. */
export const BATTERY = { lengthMm: 124, widthMm: 43, heightMm: 47.8, cellDiameterMm: 22, cells: 10 } as const;

// ------------------------------------------------------------------------------------------------
// Shooter + turret
// ------------------------------------------------------------------------------------------------
export const SHOOTER_GEOM = {
  /** [RC] MUZZLE_X_IN / Y / Z: the ball leaves 2 in ahead of the tracking point, 14 in up. */
  muzzleXin: 2.0,
  muzzleYin: 0.0,
  muzzleZin: 14.0,
  /** [RC] LAUNCH_PITCH_DEG. */
  launchPitchDeg: 40,
  /** [RC] FLYWHEEL_DIAMETER_IN. */
  flywheelDiameterIn: 4.0,
  /** [est] Two 38 mm compliant wheels side by side. */
  flywheelWidthMm: 76,
  /** [est] POLLEN squeeze against the hood's foam surface (≈ 17 % of 71 mm). */
  compressionMm: 12,
  /** [est] Hood shell + foam liner. */
  hoodThicknessMm: 3,
  hoodFoamMm: 4,
  /**
   * [est] The hood is sprung: it pivots on a pin just behind the exit lip (so the 40° exit tangent
   * never moves) and a spring at the entry end lets it swing out ≈ 15 mm for NECTAR. POLLEN sees a
   * 59 mm gap (12 mm squeeze); NECTAR's 32 mm interference becomes ≈ 14 mm of ball squeeze.
   */
  hoodSwingMm: 15,
  /** [est] Hood wraps the back of the flywheel from the feed point up to the exit. */
  hoodStartDeg: 200,
  /** Exit angle on the hood arc where the tangent is 40° above horizontal (180° − 50°). */
  hoodExitDeg: 130,
  /** [est] Side plates (aluminium), inner faces 61 mm from centre: room for the 107.5 mm 1:1 5203. */
  sidePlateInnerMm: 61,
  sidePlateThicknessMm: 6,
  /** [est] Side-plate half length (turret-frame x). The corners set the turret's swept radius. */
  sidePlateHalfLengthMm: 112,
  /** [RC] MAX_FLYWHEEL_RPM, RPM_RAMP_PER_SEC, RPM_TOLERANCE, READY_STABLE_SEC. */
  maxRpm: 5000,
  rampRpmPerSec: 4000,
  rpmTolerance: 100,
  readyStableSec: 0.15,
  /** [est] Feeder (CR servo flap wheel) behind the staged ball. */
  feederXmm: -62,
  feederZmm: 228,
  feederTipRadiusMm: 22,
  /**
   * [est] Where the next ball waits, in the TURRET frame (x forward of the yaw axis, z up from the
   * floor): 6 mm into the feeder flaps and 4 mm clear of the flywheel.
   */
  stagingXmm: -10.5,
  stagingZmm: 228,
  /** [est] Flywheel motor (1:1 5203) behind the hood, belt-driven 1:1. */
  motorXmm: -92,
} as const;

export const TURRET = {
  /**
   * [design choice] The turret axis passes through the muzzle (2 in ahead of the tracking point).
   * RobotConstants treats the muzzle as a fixed point for every turret angle; putting the hood exit
   * on the yaw axis is what makes that exactly true.
   */
  axisXmm: 2.0 * 25.4,
  /** [RC] ±170° travel (a stop block on the base plate makes it a mechanical limit too). */
  minDeg: -170,
  maxDeg: 170,
  /** [RC] TICKS_PER_RAD assumes G = 5 (external reduction). */
  gearRatio: 5,
  /** [est] Module 1.5: 100 T ring gear (Ø150 pitch) driven by a 20 T pinion. */
  module: 1.5,
  gearTeeth: 100,
  pinionTeeth: 20,
  /** [est] Heights (mm from floor). */
  basePlateZmm: 180,
  basePlateThicknessMm: 4,
  fixedRingHeightMm: 10,
  gearHeightMm: 10,
  /** [est] Spacers between the ring gear and the platform so the pinion's top face clears it. */
  platformGapMm: 2,
  platformThicknessMm: 4,
  platformRadiusMm: 86,
  /** [est] Fixed ring and gear bore (Ø112 ≥ NECTAR + clearance). */
  fixedRingOuterMm: 140,
  boreMm: 112,
  /** [est] Pinion motor hangs under the base plate on the robot's left (centre distance 90 mm). */
  pinionAngleDeg: 90,
  /** [RC] free slew ≈ 1872 / G deg/s, MAX_POWER 0.85 → ≈ 318 deg/s. */
  maxSlewDegPerSec: 318,
  /** [est] Four vertical 1120 posts carry the base plate: rear pair on the deck, front pair on the rails. */
  postXmm: [-42, 124] as const,
  postYmm: 156,
  /** [est] Stop block on the base plate behind the axis + a tab on the platform rim. */
  stopRadiusMm: [90, 102] as const,
  stopTabRadiusMm: 100,
  /** [est] Service loop: the turret's cables wrap around the fixed ring at this radius. */
  serviceLoopRadiusMm: 81,
} as const;

// ------------------------------------------------------------------------------------------------
// Intake + hopper / lift
// ------------------------------------------------------------------------------------------------
export const INTAKE = {
  /**
   * [est] Full-width roller with long silicone flaps, driven by a 5203 (5.2:1) through a 1:1 GT2 belt.
   * A POLLEN resting against the scoop lip is ≈ 8 mm into the flaps; the hub-to-scoop gap is
   * 95.5 mm (NECTAR + flap give); the flap tips stay inside the front of the sizing cube (227 mm).
   */
  rollerXmm: 165,
  rollerZmm: 122,
  rollerFlapRadiusMm: 62,
  rollerCoreRadiusMm: 12,
  /** Core + flap-wheel hubs. */
  rollerHubRadiusMm: 16.5,
  /** [est] Printed side plates just inside the rails, braced to the rail top flanges. */
  plateInnerYmm: 120,
  plateThicknessMm: 6,
  /** [est] Polycarbonate scoop concentric with the roller, from its lowest point (no forward up-curl). */
  scoopRadiusMm: 112,
  scoopThicknessMm: 2,
  /** Full width at the lip, funnelled down to the lift throat. */
  scoopHalfWidthMm: 118,
  throatHalfWidthMm: 54,
  scoopStartDeg: 270,
  scoopEndDeg: 208,
  /** [est] Intake motor above the front of the roller, inside the plates, face on the right plate. */
  motorXmm: 206,
  motorZmm: 199,
  pulleyRadiusMm: 10,
} as const;

/**
 * Lift (RobotConstants "leftintake" / "rightintake" CR servos): two round-belt runs pinch the ball
 * from the sides and carry it up a 60° chute from the scoop exit to the turret bore, where the next
 * ball pushes it into the turret's staging point.
 */
export const HOPPER = {
  /** [est] Ball-centre line: starts at the scoop exit and climbs back toward the turret axis. */
  liftStartXmm: 98,
  liftStartZmm: 83,
  liftAngleDeg: 60,
  /** [est] Belt runs: Ø5 urethane round belt; 6 mm squeeze on POLLEN (compliant for NECTAR). */
  beltContactYmm: 29.6,
  beltRadiusMm: 2.5,
  pulleyGrooveRadiusMm: 9,
  /** Pulley stations along the ball-centre line (mm from the start). */
  pulleyLowMm: 8,
  pulleyHighMm: 92,
  /** Chute floor offset behind the ball-centre line (≈ POLLEN radius). */
  floorOffsetMm: 36,
  floorHalfWidthMm: 30,
  /** Lift side guides (printed), outside the belts. */
  guideYmm: 56,
  /** Clear tube length over which balls are carried (mm along the line). */
  liftLengthMm: 112,
} as const;

/** REV Color Sensor V3 ("ball_color") at the staging point, on the left shooter plate [BallSorter: 5–15 mm]. */
export const COLOR_SENSOR = {
  /** Turret frame. */
  xMm: SHOOTER_GEOM.stagingXmm,
  zMm: SHOOTER_GEOM.stagingZmm,
  /** [est] 10 mm printed boss on the plate's inner face. */
  bossMm: 10,
} as const;

// ------------------------------------------------------------------------------------------------
// Vision
// ------------------------------------------------------------------------------------------------
export const CAMERA_CONSTANTS = {
  /** [RC] Camera.X_IN / Y_IN / Z_IN / YAW_DEG, MOUNTED_ON_TURRET = false. */
  xIn: 5.0,
  yIn: 0.0,
  zIn: 10.5,
  yawDeg: 0,
  widthPx: 640,
  heightPx: 480,
} as const;

/**
 * Where the concept model actually puts "Webcam 1".
 * Height (10.5 in), yaw (0°) and chassis mounting follow RobotConstants. The forward offset does not:
 * at 10.5 in up, the turret's swept circle reaches ≈ 7 in ahead of the tracking point, so a
 * chassis camera at 5 in would sit inside the spinning shooter. The model moves it to 8.3 in.
 * If the real robot packages the shooter differently, change `xIn` back to CAMERA_CONSTANTS.xIn.
 */
export const CAMERA_MODEL = { xIn: 8.3, yIn: 0.0, zIn: 10.5, yawDeg: 0 } as const;

// ------------------------------------------------------------------------------------------------
// Game pieces [RC Colors comment + team docs/01-BIOBUZZ-GAME.md]
// ------------------------------------------------------------------------------------------------
export const BALL = {
  pollenDiameterIn: 2.8,
  nectarDiameterIn: 3.6,
} as const;

/** BIOBUZZ HIVE [CM §9.6]: pivot axis 43.95 in up, CELL opening 20 × 14 × 12 in, cells 18.8 in apart. */
export const HIVE = {
  frameWidthIn: 49.46,
  frameDepthIn: 38.95,
  pivotHeightIn: 43.95,
  cellSpacingIn: 18.8,
  cellWidthIn: 20,
  cellTallIn: 14,
  cellDepthIn: 12,
  /** [est] Height of the upward CELL opening centre when tipped (aim point). */
  aimHeightIn: 46,
} as const;

/**
 * FTC robot sign [CM R401–R403]: ≥ 6.5 × 2.5 in, solid alliance colour, white numerals ≈ 2.25 in
 * tall inside a 0.25 in border, nothing else on it. 200 × 70 mm fits five 57 mm digits and sits in
 * the 232 mm gap between the tyres.
 */
export const SIGN = { widthMm: 200, heightMm: 70, digitHeightMm: 57, borderMm: 6.35, thicknessMm: 2.4 } as const;

// ------------------------------------------------------------------------------------------------
// Derived geometry (mm) — computed once so every file agrees.
// ------------------------------------------------------------------------------------------------
const flywheelRadiusMm = (SHOOTER_GEOM.flywheelDiameterIn * 25.4) / 2;
const pollenRadiusMm = (BALL.pollenDiameterIn * 25.4) / 2;
/** Hood shell inner radius (foam is inside it). */
const hoodInnerRadiusMm = flywheelRadiusMm + 2 * pollenRadiusMm - SHOOTER_GEOM.compressionMm + SHOOTER_GEOM.hoodFoamMm;
/** Ball-centre path radius around the flywheel axis (middle of the free gap). */
const ballPathRadiusMm = (flywheelRadiusMm + hoodInnerRadiusMm - SHOOTER_GEOM.hoodFoamMm) / 2;
const exit = deg(SHOOTER_GEOM.hoodExitDeg);
const muzzleZmm = SHOOTER_GEOM.muzzleZin * 25.4;
const gearZmm = TURRET.basePlateZmm + TURRET.basePlateThicknessMm + TURRET.fixedRingHeightMm;
const platformZmm = gearZmm + TURRET.gearHeightMm + TURRET.platformGapMm;
const liftAngle = deg(HOPPER.liftAngleDeg);

export const DERIVED = {
  flywheelRadiusMm,
  pollenRadiusMm,
  nectarRadiusMm: (BALL.nectarDiameterIn * 25.4) / 2,
  hoodInnerRadiusMm,
  ballPathRadiusMm,
  /** Flywheel axis in the TURRET frame (x forward from the yaw axis, z up from the floor). */
  flywheelAxisXmm: -ballPathRadiusMm * Math.cos(exit),
  flywheelAxisZmm: muzzleZmm - ballPathRadiusMm * Math.sin(exit),
  muzzleZmm,
  /** Turret heights. */
  fixedRingZmm: TURRET.basePlateZmm + TURRET.basePlateThicknessMm,
  gearZmm,
  /** Bottom of the rotating platform. */
  platformZmm,
  /** Top of the rotating platform (the shooter's side plates stand on it). */
  platformTopZmm: platformZmm + TURRET.platformThicknessMm,
  gearPitchRadiusMm: (TURRET.module * TURRET.gearTeeth) / 2,
  pinionPitchRadiusMm: (TURRET.module * TURRET.pinionTeeth) / 2,
  /** Drive motor overall length (2-stage gearbox + can + encoder). */
  driveMotorLengthMm: MOTOR.gearbox2StageMm + MOTOR.canLengthMm + MOTOR.encoderLengthMm,
  turretMinRad: deg(TURRET.minDeg),
  turretMaxRad: deg(TURRET.maxDeg),
  launchPitchRad: deg(SHOOTER_GEOM.launchPitchDeg),
  /** Lift direction (x, z) — up and back toward the turret axis. */
  liftDir: [-Math.cos(liftAngle), Math.sin(liftAngle)] as const,
  /** Lift "back" normal (x, z): from the ball-centre line toward the chute floor. */
  liftBack: [-Math.sin(liftAngle), -Math.cos(liftAngle)] as const,
  /** Distance along the lift line at which a ball centre crosses the turret axis. */
  liftAxisMm: (HOPPER.liftStartXmm - TURRET.axisXmm) / Math.cos(liftAngle),
} as const;

/** Point on the lift's ball-centre line, `s` mm from its start (robot frame x, z). */
export function liftPoint(s: number): [number, number] {
  return [HOPPER.liftStartXmm + DERIVED.liftDir[0] * s, HOPPER.liftStartZmm + DERIVED.liftDir[1] * s];
}

/** Convenience: metres versions used by the rig and pages. */
export const METRES = {
  muzzle: robotInToThree(SHOOTER_GEOM.muzzleXin, SHOOTER_GEOM.muzzleYin, SHOOTER_GEOM.muzzleZin),
  camera: robotInToThree(CAMERA_MODEL.xIn, CAMERA_MODEL.yIn, CAMERA_MODEL.zIn),
  turretAxis: new THREE.Vector3(0, 0, TURRET.axisXmm * MM),
  wheelRadius: (DRIVE.wheelDiameterMm / 2) * MM,
  pollenRadius: pollenRadiusMm * MM,
  nectarRadius: ((BALL.nectarDiameterIn * 25.4) / 2) * MM,
};
