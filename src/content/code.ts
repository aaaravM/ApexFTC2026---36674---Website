// ─────────────────────────────────────────────────────────────────────────────
// CODE — how APEX-R1's software is organised. Everything here is taken from the team's public
// repo (github.com/aaaravM/ApexFTC2026---36674): docs/03-ARCHITECTURE.md, TEAM-README.md,
// docs/00-START-HERE.md and the Java sources. Excerpts are copied verbatim (trimmed only where
// marked with "// …"). Update them when the code changes.
// ─────────────────────────────────────────────────────────────────────────────

export const codePage = {
  title: "How APEX-R1 thinks.",
  lede: "Java on the FTC SDK v12.0. One loop, six steps, four gates.",
  repo: "https://github.com/aaaravM/ApexFTC2026---36674",
  repoLabel: "Robot code on GitHub",
  sdk: "FTC SDK v12.0 (20260907-090034)",
} as const;

// ─── The per-loop pipeline (docs/03-ARCHITECTURE.md) ─────────────────────────────────────────

export interface PipelineStep {
  id: string;
  /** Exact call as it appears in the code. */
  call: string;
  name: string;
  /** One-line job. */
  job: string;
  /** What it hands to the next step. */
  output: string;
  file: string;
}

export const pipeline: PipelineStep[] = [
  {
    id: "odometry",
    call: "Odometry.update()",
    name: "Odometry",
    job: "Reads the Pinpoint: where the robot is, how fast it moves, how fast it turns.",
    output: "pose · field velocity · rotation rate",
    file: "subsystems/Odometry.java",
  },
  {
    id: "sorter",
    call: "BallSorter.update()",
    name: "BallSorter",
    job: "Colour sensor says which ball is loaded, which picks the RPM curve.",
    output: "ball type → RPM curve",
    file: "subsystems/BallSorter.java",
  },
  {
    id: "hive",
    call: "HiveTracker.update()",
    name: "HiveTracker",
    job: "Turns the AprilTag Cluster into a target in field coordinates, bridged by odometry when vision drops out.",
    output: "target position (field frame)",
    file: "vision/HiveTracker.java",
  },
  {
    id: "ballistics",
    call: "Ballistics.solve()",
    name: "Ballistics",
    job: "Solves the moving shot: aims at a virtual target displaced by −velocity × flight time.",
    output: "turret angle · flywheel RPM · flight time",
    file: "util/Ballistics.java",
  },
  {
    id: "actuate",
    call: "Turret.setTargetFieldAngleRad() + Shooter.setTargetRpm()",
    name: "Turret + Shooter",
    job: "Turret holds the field angle with heading feedforward; the flywheel closes the loop on RPM.",
    output: "on target · at speed",
    file: "subsystems/Turret.java · subsystems/Shooter.java",
  },
  {
    id: "aim",
    call: "AimController.isReadyToFire()",
    name: "AimController",
    job: "Four gates must all pass before the feeder runs — never a timer.",
    output: "READY → feeder",
    file: "AimController.java",
  },
];

/** The four gates of isReadyToFire() (plus the ball-identified precondition). */
export const fireGates = [
  { id: "solution", label: "SOLUTION", detail: "A valid ballistic solution exists — in range, turret can reach." },
  { id: "on-target", label: "ON TARGET", detail: "The turret has settled on that angle (within 1.5°)." },
  { id: "at-speed", label: "AT SPEED", detail: "The flywheel has held the target RPM (±100) for 0.15 s." },
  { id: "hive-fresh", label: "HIVE FRESH", detail: "The target estimate is fresh enough to believe (< 1.5 s old)." },
] as const;

/** "Swap what each sensor is responsible for" (docs/03-ARCHITECTURE.md). */
export const sensorSwap = {
  columns: ["Question", "Usual FTC pattern", "What BIOBUZZ™ needs"],
  rows: [
    ["Where is the robot?", "AprilTags (absolute)", "Odometry (Pinpoint)"],
    ["Where is the target?", "Hard-coded field constant", "Vision — measured live"],
    ["How fast are we going?", "Odometry", "Odometry"],
  ],
  why: "BIOBUZZ™ AprilTags move — the HIVE tips — so they can't localise the robot. Odometry localises the robot; vision measures the target.",
} as const;

/** The solver's two formulas, as printed on the Code page. */
export const formulas = [
  { id: "tof", label: "Flight time (fixed hood)", tex: "t = √(2(d·tanθ − h)/g)" },
  { id: "rpm", label: "Flywheel speed", tex: "rpm = 60·v / (η·π·D)" },
] as const;

// ─── Tuning sequence (TEAM-README.md) ────────────────────────────────────────────────────────

export interface TuningStep {
  code: string;
  opMode: string;
  hardware: string;
  purpose: string;
}

export const tuningSequence: TuningStep[] = [
  { code: "T0", opMode: "T0 Tag Library Dump", hardware: "None — Control Hub only", purpose: "Confirms the SDK knows the BIOBUZZ™ tag library." },
  { code: "T1", opMode: "T1 Odometry Test", hardware: "Pinpoint", purpose: "Pinpoint found, pose updating." },
  { code: "T2", opMode: "T2 Pinpoint Offset Tuner", hardware: "Pinpoint", purpose: "Measures the pod offsets." },
  { code: "T3", opMode: "T3 Velocity Frame Test", hardware: "Pinpoint", purpose: "Proves whether velocity is field- or robot-relative." },
  { code: "DRV", opMode: "TeleOp Drive Only", hardware: "+ 4 drive motors", purpose: "Motor directions and strafing." },
  { code: "T4", opMode: "T4 Hive Tracker Test", hardware: "+ webcam", purpose: "Cluster detection and dropout bridging." },
  { code: "T5", opMode: "T5 Shooter RPM Tuner", hardware: "+ flywheel", purpose: "Transfer efficiency from a flat shot." },
  { code: "T6", opMode: "T6 Color Sensor Calibration", hardware: "+ colour sensor", purpose: "POLLEN / NECTAR hue windows." },
  { code: "MAIN", opMode: "TeleOp Main", hardware: "Full robot", purpose: "Everything together." },
];

export const rulesOfTheRoad: string[] = [
  "Only ever edit TeamCode/. FtcRobotController/ is FIRST's; changing it breaks SDK updates.",
  "All tunable numbers live in RobotConstants.java. No magic numbers in subsystems.",
  "One convention everywhere: +X forward, +Y left, +heading counter-clockwise, inches and radians.",
  "Call each sensor's update() exactly once per loop, near the top, in dependency order: odometry → colour → vision → aim.",
  "Pull SDK updates, don't re-clone: git fetch upstream --tags && git merge v12.x.",
];

export const stack: { label: string; value: string }[] = [
  { label: "Language", value: "Java 8 target (OnBot-compatible)" },
  { label: "SDK", value: "FTC SDK 12.0" },
  { label: "Build", value: "Gradle 9.1 · AGP 8.13.2" },
  { label: "Paths", value: "Pedro Pathing" },
  { label: "Odometry", value: "goBILDA Pinpoint" },
  { label: "Vision", value: "AprilTag Clusters · Limelight 3A (optional)" },
  { label: "Editor", value: "VS Code / Cursor + adb" },
];

/** Terminal tab 1: the real build command and result (docs/00-START-HERE.md). */
export const buildLog = {
  command: "./gradlew :TeamCode:assembleDebug",
  output: ["BUILD SUCCESSFUL", "TeamCode/build/outputs/apk/debug/TeamCode-debug.apk   (52.5 MB)"],
} as const;

// ─── Codebase tree ("Explore the codebase") — line counts from the repo on 2026-10-12 ───────

export interface CodeNode {
  name: string;
  /** One-line description. */
  description?: string;
  lines?: number;
  children?: CodeNode[];
}

export const codebaseTree: CodeNode = {
  name: "TeamCode",
  description: "src/main/java/org/firstinspires/ftc/teamcode/",
  children: [
    { name: "RobotConstants.java", description: "Every tunable number, one file.", lines: 582 },
    { name: "AimController.java", description: "Ties odometry + vision + ballistics together; the four-gate fire check.", lines: 162 },
    {
      name: "subsystems",
      description: "Hardware wrappers.",
      children: [
        { name: "Odometry.java", description: "goBILDA Pinpoint wrapper, pose history for latency correction.", lines: 275 },
        { name: "MecanumDrive.java", description: "Robot- and field-centric drive.", lines: 121 },
        { name: "Turret.java", description: "Yaw axis with rotation feedforward.", lines: 135 },
        { name: "Shooter.java", description: "Flywheel, closed-loop RPM.", lines: 272 },
        { name: "BallSorter.java", description: "Colour sensor → POLLEN / NECTAR.", lines: 126 },
      ],
    },
    {
      name: "vision",
      description: "Cameras and AprilTags.",
      children: [
        { name: "HiveTracker.java", description: "AprilTag cluster → field-frame target.", lines: 247 },
        { name: "LimelightHiveTracker.java", description: "Same job on the optional Limelight 3A.", lines: 251 },
        { name: "BallTracker.java", description: "Finds balls on the floor.", lines: 230 },
        { name: "BiobuzzTags.java", description: "The season's AprilTag IDs and cluster layout.", lines: 126 },
      ],
    },
    {
      name: "util",
      description: "Pure maths, no hardware.",
      children: [
        { name: "Ballistics.java", description: "The shoot-while-moving solver.", lines: 258 },
        { name: "BallType.java", description: "Ball specs + per-type shooter calibration.", lines: 132 },
      ],
    },
    {
      name: "opmodes",
      description: "What the drivers run.",
      children: [
        { name: "TeleOpMain.java", description: "The full robot.", lines: 166 },
        { name: "PedroTeleOp.java", description: "TeleOp on Pedro Pathing's follower.", lines: 204 },
        { name: "tuning/", description: "T0–T6, the tuning sequence, in order." },
      ],
    },
    { name: "pedro/PedroConstants.java", description: "Pedro Pathing follower constants.", lines: 168 },
  ],
};

// ─── Verbatim code excerpts (render with shiki inside "use cache" + cacheLife("max")) ────────

export interface CodeExcerpt {
  id: string;
  title: string;
  file: string;
  /** 1-based first line in the original file (for "L134" labels), if known. */
  startLine?: number;
  lang: "java";
  code: string;
}

export const codeExcerpts: CodeExcerpt[] = [
  {
    id: "ready",
    title: "isReadyToFire()",
    file: "AimController.java",
    startLine: 134,
    lang: "java",
    code: `public boolean isReadyToFire() {
    return aimingEnabled
            && assumedBall.canFire()
            && solution.valid
            && turret.isOnTarget()
            && shooter.isAtSpeed()
            && hiveTracker.hasTarget();
}`,
  },
  {
    id: "solver",
    title: "The solver loop",
    file: "util/Ballistics.java",
    startLine: 135,
    lang: "java",
    code: `for (int i = 0; i < 6; i++) {
    // Where the target effectively is, given that the ball inherits our velocity.
    double vtx = targetX - robotVx * t;
    double vty = targetY - robotVy * t;

    double dx = vtx - muzzleX;
    double dy = vty - muzzleY;
    d = Math.hypot(dx, dy);
    azimuth = Math.atan2(dy, dx);

    // t^2 = 2*(d*tan(theta) - h)/G. If the bracket is non-positive the target sits at or
    // above the launch line, so no shot exists at this hood angle.
    double bracket = d * tanTheta - h;
    if (bracket <= 0) {
        // … failReason: target too high/close for the hood
        return s;
    }

    double tNew = Math.sqrt(2.0 * bracket / G_IN_S2);
    boolean converged = Math.abs(tNew - t) < 1e-4;
    t = tNew;
    if (converged) break;
}`,
  },
  {
    id: "rpm",
    title: "muzzleSpeedToRpm()",
    file: "util/Ballistics.java",
    startLine: 220,
    lang: "java",
    code: `public static double muzzleSpeedToRpm(double muzzleSpeedIn, BallType ball) {
    double eff = ball.transferEfficiency > 1e-6 ? ball.transferEfficiency : 0.5;
    double circumference = Math.PI * RobotConstants.Shoot.FLYWHEEL_DIAMETER_IN;
    return 60.0 * muzzleSpeedIn / (eff * circumference);
}`,
  },
  {
    id: "balltype",
    title: "BallType",
    file: "util/BallType.java",
    startLine: 37,
    lang: "java",
    code: `public enum BallType {

    /** Yellow, 2.8 in, 25 g. Either alliance may score it. */
    POLLEN(2.8, 0.025, 0.50, 0.0),

    /** Red 3.6 in, 41 g. Only the RED alliance may score it. */
    NECTAR_RED(3.6, 0.041, 0.42, 0.0),

    /** Blue 3.6 in, 41 g. Only the BLUE alliance may score it. */
    NECTAR_BLUE(3.6, 0.041, 0.42, 0.0),

    // … NONE(0, 0, 0.0, 0.0): an unclassified ball refuses to fire
    NONE(0, 0, 0.0, 0.0);
}`,
  },
];

export const getExcerpt = (id: string) => codeExcerpts.find((e) => e.id === id);
