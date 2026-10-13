/**
 * APEX-R1 procedural robot — public API.
 *
 * Everything here renders inside an R3F <Canvas>, which must be client-only:
 *   const RobotScene = dynamic(() => import("./RobotScene"), { ssr: false });  // in a "use client" file
 */
export { ApexRobot, usePrefersReducedMotion, type ApexRobotComponentProps } from "./ApexRobot";
export { Balls, Trajectory, fieldToThree, type ArcSource, type BallsHandle, type BallsProps, type FireOptions } from "./Balls";
export { Hive, hiveAimOffset, HIVE_TILT_DEG, type HiveProps } from "./Hive";
export { RobotCanvas, Stage, RendererStats, useStageQuality, type RobotCanvasProps, type StageProps, type StageQuality, type RenderStats } from "./Stage";
export {
  SUBSYSTEMS,
  SUBSYSTEM_INFO,
  RIG,
  ROBOT_BOUNDS,
  clampTurret,
  explodePose,
  explodeProgress,
  fitRobot,
  launchDirection,
  maxSpinStep,
  mecanumTwist,
  mecanumWheelSpeeds,
  smoothDamp,
  turretYawToward,
  wrapAngle,
  TURRET_MIN_RAD,
  TURRET_MAX_RAD,
  type ApexRobotHandle,
  type ApexRobotProps,
  type HighlightTarget,
  type LaunchEvent,
  type RobotCommand,
  type RobotLook,
  type RobotTone,
  type SubsystemId,
  type SubsystemInfo,
  type WheelSpeeds,
} from "./rig";
export { CYCLE_PHASES, CYCLE_SECONDS, CYCLE_SPACING, cyclePhase, cyclePoint, cycleUses, type CycleBallKind, type CyclePhase, type CyclePoint } from "./cycle";
export {
  IN,
  MM,
  toThree,
  fromThree,
  robotInToThree,
  threeToRobotIn,
  rmm,
  liftPoint,
  BALL_PATH_CLEAR_MM,
  DRIVE,
  CHANNEL,
  FRAME,
  MOTOR,
  ODO,
  PINPOINT,
  HUB,
  BATTERY,
  SHOOTER_GEOM,
  TURRET,
  INTAKE,
  HOPPER,
  COLOR_SENSOR,
  CAMERA_CONSTANTS,
  CAMERA_MODEL,
  BALL,
  HIVE,
  SIGN,
  DERIVED,
  METRES,
  ENVELOPE,
  ENVELOPE_IN,
  ENVELOPE_HALF_MM,
} from "./dimensions";
export {
  MATERIAL_ROLES,
  ACCENT_ROLES,
  BALL_COLORS,
  DEFAULT_ACCENT,
  LOOK_BACKGROUNDS,
  stageBackground,
  createMaterial,
  MaterialLibrary,
  type MaterialRole,
} from "./materials";

// reusable parts
export { MecanumWheel } from "./parts/MecanumWheel";
export { YellowJacketMotor, motorLength } from "./parts/YellowJacketMotor";
export { UChannel } from "./parts/UChannel";
export { ControlHub } from "./parts/ControlHub";
export { Battery } from "./parts/Battery";
export { Flywheel } from "./parts/Flywheel";
export { Hood } from "./parts/Hood";
export { TurretFixedRing, TurretRotor, TurretPinion } from "./parts/TurretRing";
export { Webcam, Limelight3A } from "./parts/Webcam";
export { ColorSensor } from "./parts/ColorSensor";
export { Pinpoint } from "./parts/Pinpoint";
export { OdoPod } from "./parts/OdoPod";
export { Cable, CableHarness, type CableSpec } from "./parts/Cable";
export { Fasteners, Standoffs } from "./parts/Fasteners";
export { Servo } from "./parts/Servo";
export { FlapRoller } from "./parts/FlapRoller";
export { Pulley, Belt } from "./parts/Belt";
export { NumberPlate } from "./parts/NumberPlate";
export { PowerSwitch } from "./parts/PowerSwitch";
export { PartMesh, RoleMeshes, HitProxy, type ProxyBox } from "./parts/PartMesh";
