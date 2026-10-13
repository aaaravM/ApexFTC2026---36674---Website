// ─────────────────────────────────────────────────────────────────────────────
// TeamCode snapshot — github.com/aaaravM/ApexFTC2026---36674, branch `main`, fetched 2026-10-12
// (last push 2026-10-11). Every Java file under TeamCode/src/main/java/org/firstinspires/ftc/teamcode
// with its line count (`wc -l`) and a one-line summary taken from the file's own Javadoc.
// The curated descriptions in src/content/code.ts (codebaseTree) win where both exist, so students
// keep editing that file; this snapshot only fills in the structure and the files it leaves out.
// Re-fetch when the repo changes (GitHub API: /repos/aaaravM/ApexFTC2026---36674/git/trees/main).
// ─────────────────────────────────────────────────────────────────────────────

export const REPO = {
  url: "https://github.com/aaaravM/ApexFTC2026---36674",
  cloneUrl: "https://github.com/aaaravM/ApexFTC2026---36674.git",
  branch: "main",
  javaRoot: "TeamCode/src/main/java/org/firstinspires/ftc/teamcode",
  snapshotDate: "2026-10-12",
} as const;

/** Link to a file on GitHub (path relative to the teamcode package). */
export const blobUrl = (path: string) => `${REPO.url}/blob/${REPO.branch}/${REPO.javaRoot}/${path}`;
/** Link to a repo-root file (docs, README). */
export const repoFileUrl = (path: string) => `${REPO.url}/blob/${REPO.branch}/${path}`;

export interface RepoFile {
  /** Path relative to the teamcode package, e.g. "util/Ballistics.java". */
  path: string;
  lines: number;
  /** One line, from the file's own Javadoc. */
  summary: string;
}

export const teamCodeFiles: RepoFile[] = [
  { path: "RobotConstants.java", lines: 582, summary: "Every tunable number, one file." },
  { path: "AimController.java", lines: 162, summary: "Ties odometry, vision and ballistics together; the fire gate." },
  { path: "IntakeFlywheelTest.java", lines: 106, summary: "The team's original intake + flywheel test, preserved as written." },
  { path: "IntakeFlywheelTuner.java", lines: 206, summary: "The same test on closed-loop RPM, with telemetry for how far the ball will go." },
  { path: "MecanumTeleOp.java", lines: 107, summary: "The team's original teleop, kept as the known-good fallback." },
  { path: "MecanumTeleOpOdometry.java", lines: 302, summary: "The original teleop plus odometry, live telemetry and a rotation diagnostic." },
  { path: "opmodes/PedroTeleOp.java", lines: 204, summary: "TeleOp on Pedro Pathing's follower." },
  { path: "opmodes/TeleOpDriveOnly.java", lines: 101, summary: "Drivetrain plus odometry, nothing else — runs while the turret and shooter are being built." },
  { path: "opmodes/TeleOpMain.java", lines: 166, summary: "The full robot. @Disabled until the turret, shooter, feeder, intake and colour sensor exist." },
  { path: "opmodes/tuning/T0_TagLibraryDump.java", lines: 119, summary: "Prints the BIOBUZZ AprilTag library inside SDK 12.0. Needs no hardware." },
  { path: "opmodes/tuning/T1_OdometryTest.java", lines: 95, summary: "Pinpoint health, encoder directions, distance accuracy. Push the robot by hand." },
  { path: "opmodes/tuning/T2_PinpointOffsetTuner.java", lines: 146, summary: "Refines the two pod offsets with one accurate half turn." },
  { path: "opmodes/tuning/T3_VelocityFrameTest.java", lines: 115, summary: "Field frame or robot frame? Twenty seconds, done once." },
  { path: "opmodes/tuning/T4_HiveTrackerTest.java", lines: 126, summary: "Proves the vision-plus-odometry chain before any motor is involved." },
  { path: "opmodes/tuning/T5_ShooterRpmTuner.java", lines: 136, summary: "Measures transferEfficiency per ball type with a flat shot off a table." },
  { path: "opmodes/tuning/T6_ColorSensorCalibration.java", lines: 120, summary: "Finds the hue windows that separate POLLEN from red and blue NECTAR." },
  { path: "pedro/FollowerTuning.java", lines: 125, summary: "Pedro Pathing's Foresight path-following numbers; runs on a laptop." },
  { path: "pedro/PedroConstants.java", lines: 168, summary: "Pedro Pathing follower constants." },
  { path: "subsystems/BallSorter.java", lines: 126, summary: "Colour sensor → POLLEN / NECTAR." },
  { path: "subsystems/MecanumDrive.java", lines: 121, summary: "Robot- and field-centric drive." },
  { path: "subsystems/Odometry.java", lines: 275, summary: "goBILDA Pinpoint wrapper, pose history for latency correction." },
  { path: "subsystems/PedroOdometry.java", lines: 236, summary: "Read-only pose and velocity from Pedro's follower." },
  { path: "subsystems/Shooter.java", lines: 272, summary: "Flywheel, closed-loop RPM." },
  { path: "subsystems/Turret.java", lines: 135, summary: "Yaw axis with rotation feedforward." },
  { path: "util/BallType.java", lines: 132, summary: "Ball specs + per-type shooter calibration." },
  { path: "util/Ballistics.java", lines: 258, summary: "The shoot-while-moving solver." },
  { path: "vision/BallTracker.java", lines: 230, summary: "Finds balls on the floor." },
  { path: "vision/BiobuzzTags.java", lines: 126, summary: "The season's AprilTag IDs and cluster layout." },
  { path: "vision/HiveTracker.java", lines: 247, summary: "AprilTag cluster → field-frame target." },
  { path: "vision/LimelightHiveTracker.java", lines: 251, summary: "Same job on the optional Limelight 3A." },
];

export const teamCodeTotals = {
  files: teamCodeFiles.length,
  lines: teamCodeFiles.reduce((n, f) => n + f.lines, 0),
};

/** Folder descriptions (structure from the repo; wording from src/content/code.ts where it exists). */
export const folderNotes: Record<string, string> = {
  subsystems: "Hardware wrappers.",
  vision: "Cameras and AprilTags.",
  util: "Pure maths, no hardware.",
  opmodes: "What the drivers run.",
  "opmodes/tuning": "T0–T6, the tuning sequence, in order.",
  pedro: "Pedro Pathing configuration.",
};

/**
 * The tuning OpModes exactly as annotated in the source (`grep -h "@TeleOp" opmodes/tuning/*.java`
 * on main, 2026-10-12) — the names the Driver Station shows.
 */
export const tuningAnnotations: { file: string; name: string; group: string }[] = [
  { file: "opmodes/tuning/T0_TagLibraryDump.java", name: "T0 Tag Library Dump (no hardware)", group: "Tuning" },
  { file: "opmodes/tuning/T1_OdometryTest.java", name: "T1 Odometry Test", group: "Tuning" },
  { file: "opmodes/tuning/T2_PinpointOffsetTuner.java", name: "T2 Pinpoint Offset Tuner", group: "Tuning" },
  { file: "opmodes/tuning/T3_VelocityFrameTest.java", name: "T3 Velocity Frame Test", group: "Tuning" },
  { file: "opmodes/tuning/T4_HiveTrackerTest.java", name: "T4 Hive Tracker Test", group: "Tuning" },
  { file: "opmodes/tuning/T5_ShooterRpmTuner.java", name: "T5 Shooter RPM Tuner", group: "Tuning" },
  { file: "opmodes/tuning/T6_ColorSensorCalibration.java", name: "T6 Color Sensor Calibration", group: "Tuning" },
];

/** `grep -h -A1 "@TeleOp" opmodes/TeleOp*.java` on main, 2026-10-12 (verbatim). */
export const driveOpModeGrep: string[] = [
  '@TeleOp(name = "TeleOp Drive Only (odometry)", group = "Drive")',
  "public class TeleOpDriveOnly extends LinearOpMode {",
  "--",
  '@TeleOp(name = "TeleOp Main (full robot)", group = "Drive")',
  "@Disabled",
];

/** Lines quoted on the page, with where they come from. Verbatim. */
export const quotes = {
  sdkTagsMove: {
    text: "Unfortunately, since BIOBUZZ AprilTags move, they are not suitable for absolute Field Localization.",
    source: "FTC SDK 12.0 release notes, quoted in docs/03-ARCHITECTURE.md",
  },
  triggerIsRequest: {
    text: "Fire only when every gate is satisfied. The trigger is a request, not a command.",
    source: "opmodes/TeleOpMain.java",
  },
  dontSkip: {
    text: "Do not skip ahead. Every step depends on the one before it being right, and debugging a turret on top of a reversed encoder is a bad afternoon.",
    source: "docs/00-START-HERE.md §7",
  },
  seasonWon: {
    text: "Steps 1 and 2 are where the season is won.",
    source: "docs/03-ARCHITECTURE.md",
  },
} as const;

/** The real per-loop body of TeleOpMain (sensors, once each, in dependency order). */
export const loopSource = {
  file: "opmodes/TeleOpMain.java",
  comment: "// --- sensors, once each, in dependency order ---",
} as const;
