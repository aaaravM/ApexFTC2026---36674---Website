// ─────────────────────────────────────────────────────────────────────────────
// ROBOT — APEX-R1, our BIOBUZZ™ robot. Every number here comes from the team's real code
// (github.com/aaaravM/ApexFTC2026---36674, mostly RobotConstants.java) or the competition
// manual, and says where it came from in `source`. Change a value here and every page updates.
//
// REAL CAD MODEL: export the finished robot to `public/models/apex-r1.glb` (see docs/ROBOT-MODEL.md)
// and restart `npm run dev` / redeploy. `modelSrc` below flips from null to the file path
// automatically (next.config.ts checks for the file at startup), and the home hero, Meet the Robot
// and CAD pages switch from the procedural concept model to your CAD. No code changes needed.
// ─────────────────────────────────────────────────────────────────────────────

/** Path to the real CAD export, or null while it doesn't exist yet (procedural model is used). */
export const modelSrc: string | null = process.env.NEXT_PUBLIC_ROBOT_MODEL || null;

/** True while the site shows the procedural concept model (drives the honesty caption). */
export const isConceptModel = modelSrc === null;

export const robot = {
  codename: "APEX-R1",
  season: "BIOBUZZ™ 2026–27",
  oneLiner: "A turret shooter for BIOBUZZ™ that aims while it drives.",
  status: "In development — first build season",
  repo: "https://github.com/aaaravM/ApexFTC2026---36674",
} as const;

// ─── Subsystems (ids match the 3D rig in src/components/robot and the GLB node names) ───────────

export type SubsystemId =
  | "drivetrain"
  | "odometry"
  | "intake"
  | "hopper"
  | "turret"
  | "shooter"
  | "vision"
  | "electronics";

export interface SpecRow {
  label: string;
  value: string;
  /** Where the number comes from, e.g. "RobotConstants.java · Shoot.LAUNCH_PITCH_DEG". */
  source?: string;
}

export interface Subsystem {
  id: SubsystemId;
  /** Index as printed on the Robot page: "01" … "08". */
  index: string;
  /** Short mono label: "DRIVE". */
  code: string;
  name: string;
  /** One sentence: what it does and why. */
  summary: string;
  specs: SpecRow[];
}

const RC = "RobotConstants.java";

export const subsystems: Subsystem[] = [
  {
    id: "drivetrain",
    index: "01",
    code: "DRIVE",
    name: "Drivetrain",
    summary:
      "Four mecanum wheels let the chassis strafe and turn at once, so the robot can reposition while the turret keeps aiming.",
    specs: [
      { label: "Wheels", value: "4 × 104 mm mecanum", source: `${RC} · Drive.WHEEL_DIAMETER_IN = 4.094488` },
      { label: "Motors", value: "4 × goBILDA 5202-series (312 RPM)", source: `${RC} · Drive.TICKS_PER_REV = 537.7` },
      { label: "Free speed", value: "66.9 in/s", source: `${RC} · Drive.FREE_SPEED_IN_PER_SEC` },
      { label: "Slow mode", value: "35 % power", source: `${RC} · Drive.SLOW_MODE_SCALE` },
      { label: "Wiring", value: "Left side on Expansion Hub, right side on Control Hub", source: "hub-backup/README-rewire.md" },
    ],
  },
  {
    id: "odometry",
    index: "02",
    code: "ODOMETRY",
    name: "Odometry",
    summary:
      "The goBILDA Pinpoint tracks where the robot is and how fast it is moving. In BIOBUZZ™ the AprilTags move, so odometry — not vision — localises the robot.",
    specs: [
      { label: "Computer", value: "goBILDA Pinpoint (“odomcomp”)", source: `${RC} · Names.PINPOINT` },
      { label: "Pod offsets", value: "X −84 mm · Y −168 mm", source: `${RC} · Odo.X/Y_POD_OFFSET_MM` },
      { label: "Fused IMU", value: "1500 Hz heading rate", source: "docs/03-ARCHITECTURE.md" },
      { label: "Pose history", value: "0.5 s (latency correction)", source: `${RC} · Odo.POSE_HISTORY_SECONDS` },
      { label: "Paths", value: "Pedro Pathing", source: "PedroConstants.java" },
    ],
  },
  {
    id: "intake",
    index: "03",
    code: "INTAKE",
    name: "Intake",
    summary: "A driven roller and two continuous-rotation servos pull POLLEN and NECTAR off the tiles into the hopper.",
    specs: [
      { label: "Main roller", value: "goBILDA 5202 motor (“intakemain”)", source: `${RC} · Names.INTAKE` },
      { label: "Side rollers", value: "2 × continuous-rotation servos", source: `${RC} · Names.INTAKE_SERVO_L/R` },
      { label: "Capacity rule", value: "Max 4 scoring elements controlled", source: "Competition Manual TU04 · G407" },
    ],
  },
  {
    id: "hopper",
    index: "04",
    code: "HOPPER",
    name: "Hopper + sorter",
    summary:
      "A REV Color Sensor V3 in the hopper throat classifies each ball, picks the shooter RPM for it, and ejects the opponent's NECTAR — a rule-compliance feature (G408), not just an efficiency one.",
    specs: [
      { label: "Sensor", value: "REV Color Sensor V3 (“ball_color”)", source: `${RC} · Names.BALL_COLOR` },
      { label: "POLLEN hue", value: "35°–85° (yellow)", source: `${RC} · Colors.POLLEN_HUE_MIN/MAX` },
      { label: "Red / blue hue", value: "340°–20° · 190°–265°", source: `${RC} · Colors` },
      { label: "Ball present", value: "< 25 mm", source: `${RC} · Colors.BALL_PRESENT_MM` },
      { label: "Rule", value: "No control of opponent NECTAR", source: "Competition Manual TU04 · G408" },
    ],
  },
  {
    id: "turret",
    index: "05",
    code: "TURRET",
    name: "Turret",
    summary:
      "A 5:1 geared turret holds a world-space aim. Heading-velocity feedforward counter-rotates it as the chassis spins, so the correction happens before the error does.",
    specs: [
      { label: "Travel", value: "±170°", source: `${RC} · Turret.MIN/MAX_ANGLE_RAD` },
      { label: "Gearing", value: "5 : 1", source: `${RC} · Turret.TICKS_PER_RAD = 85.5777 × 5` },
      { label: "Control", value: "PID + kS + heading-velocity kV", source: `${RC} · Turret.KP/KD/KS/KV` },
      { label: "On-target tolerance", value: "1.5°", source: `${RC} · Turret.TOLERANCE_RAD` },
      { label: "Max power", value: "85 %", source: `${RC} · Turret.MAX_POWER` },
    ],
  },
  {
    id: "shooter",
    index: "06",
    code: "SHOOTER",
    name: "Shooter",
    summary:
      "One 4-inch flywheel behind a fixed 40° hood. With the angle fixed, flight time falls straight out of the geometry and the solver only has to choose RPM.",
    specs: [
      { label: "Flywheel", value: "4.0 in diameter", source: `${RC} · Shoot.FLYWHEEL_DIAMETER_IN` },
      { label: "Hood", value: "Fixed 40° launch pitch", source: `${RC} · Shoot.LAUNCH_PITCH_DEG` },
      { label: "Muzzle", value: "14 in above the floor, 2 in forward", source: `${RC} · Shoot.MUZZLE_Z_IN / MUZZLE_X_IN` },
      { label: "Max speed", value: "5000 RPM", source: `${RC} · Shoot.MAX_FLYWHEEL_RPM` },
      { label: "At speed", value: "±100 RPM held for 0.15 s", source: `${RC} · Shoot.RPM_TOLERANCE / READY_STABLE_SEC` },
      { label: "Spin-up ramp", value: "4000 RPM/s", source: `${RC} · Shoot.RPM_RAMP_PER_SEC` },
    ],
  },
  {
    id: "vision",
    index: "07",
    code: "VISION",
    name: "Vision",
    summary:
      "A webcam tracks the HIVE CELL's AprilTag Cluster to find the target; an optional Limelight 3A polls at 100 Hz. Vision measures the target — odometry measures the robot.",
    specs: [
      { label: "HIVE camera", value: "“Webcam 1”, 640 × 480", source: `${RC} · Camera.WIDTH/HEIGHT` },
      { label: "Mount", value: "5 in forward · 10.5 in up", source: `${RC} · Camera.X_IN / Z_IN` },
      { label: "Ball camera", value: "“Webcam 2”", source: `${RC} · Names.WEBCAM_BALLS` },
      { label: "Optional", value: "Limelight 3A at 100 Hz", source: `${RC} · Camera.LIMELIGHT_POLL_HZ` },
      { label: "Target", value: "AprilTag Cluster, IDs 30–45", source: "Competition Manual TU04 · 9.9" },
      { label: "Freshness", value: "Estimate trusted for 1.5 s", source: `${RC} · Hive.MAX_ESTIMATE_AGE_SEC` },
    ],
  },
  {
    id: "electronics",
    index: "08",
    code: "ELECTRONICS",
    name: "Electronics",
    summary: "A REV Control Hub and Expansion Hub run the code. Devices are found by name, so a rewire is a Driver Station job, not a programming job.",
    specs: [
      { label: "Controllers", value: "REV Control Hub + Expansion Hub", source: "hub-backup/README.md" },
      { label: "Software", value: "FTC SDK v12.0 · Java", source: "TEAM-README.md" },
      { label: "Pinpoint bus", value: "Control Hub I2C (never bus 0 — IMU)", source: "hub-backup/README-rewire.md" },
    ],
  },
];

export const getSubsystem = (id: SubsystemId) => subsystems.find((s) => s.id === id)!;

// ─── The six headline figures (Robot data sheet + home C2) ───────────────────────────────────

export interface Figure {
  value: string;
  unit?: string;
  label: string;
  source?: string;
}

export const keyFigures: Figure[] = [
  { value: "18", unit: "in", label: "Start cube", source: "Competition Manual TU04 · R102" },
  { value: "104", unit: "mm", label: "Mecanum wheels", source: `${RC} · Drive.WHEEL_DIAMETER_IN` },
  { value: "±170", unit: "°", label: "Turret travel", source: `${RC} · Turret.MIN/MAX_ANGLE_RAD` },
  { value: "4", unit: "in", label: "Flywheel", source: `${RC} · Shoot.FLYWHEEL_DIAMETER_IN` },
  { value: "40", unit: "°", label: "Fixed hood", source: `${RC} · Shoot.LAUNCH_PITCH_DEG` },
  { value: "5000", unit: "RPM", label: "Flywheel max", source: `${RC} · Shoot.MAX_FLYWHEEL_RPM` },
];

/** The dense spec table under the figures (Robot page). */
export const specSheet: SpecRow[] = [
  { label: "Codename", value: "APEX-R1" },
  { label: "Season", value: "BIOBUZZ™ presented by RTX, 2026–27" },
  { label: "Starting size", value: "18 × 18 × 18 in", source: "Competition Manual TU04 · R102" },
  { label: "Expansion limit", value: "18 × 24 × 29 in", source: "Competition Manual TU04 · R105" },
  { label: "Drivetrain", value: "Mecanum, 4 × 104 mm", source: `${RC} · Drive` },
  { label: "Localisation", value: "goBILDA Pinpoint odometry", source: `${RC} · Odo` },
  { label: "Turret", value: "±170° at 5 : 1", source: `${RC} · Turret` },
  { label: "Shooter", value: "4 in flywheel, fixed 40° hood, 5000 RPM max", source: `${RC} · Shoot` },
  { label: "Vision", value: "Webcam on the HIVE AprilTag Cluster; optional Limelight 3A", source: `${RC} · Camera` },
  { label: "Control system", value: "REV Control Hub + Expansion Hub" },
  { label: "Software", value: "Java · FTC SDK v12.0 · Pedro Pathing" },
  { label: "Weight", value: "PENDING — weigh after first build" },
  { label: "Status", value: "In development" },
];

// ─── Home page story (USER-REQUIREMENTS #4) ──────────────────────────────────────────────────

export interface StoryChapter {
  id: string;
  /** "C1"… */
  code: string;
  /** Mono eyebrow, e.g. "[ C1 / WHO WE ARE ]". */
  eyebrow: string;
  title: string;
  body: string;
  /** Optional mini stats / figures shown with the chapter. */
  stats?: { value: string; label: string }[];
  /** Which half of the screen the ROBOT occupies on desktop (text takes the other half). */
  robotSide: "left" | "right";
  /** Subsystems the 3D robot highlights while this chapter is active. */
  focus: SubsystemId[];
  link?: { href: string; label: string };
}

export const homeChapters: StoryChapter[] = [
  {
    id: "who",
    code: "C1",
    eyebrow: "[ C1 / WHO WE ARE ]",
    title: "Twelve students. One rookie season. One machine.",
    body: "We're Apex Robotics — FIRST® Tech Challenge Team 36674 from Tracy, California, competing in BIOBUZZ™ presented by RTX.",
    stats: [
      { value: "12", label: "Students" },
      { value: "2026", label: "Rookie year" },
      { value: "Anish P.", label: "Founder" },
    ],
    robotSide: "right",
    focus: [],
    link: { href: "/team", label: "Meet the team" },
  },
  {
    id: "machine",
    code: "C2",
    eyebrow: "[ C2 / APEX-R1 ]",
    title: "A turret shooter that aims while it drives.",
    body: "APEX-R1 starts inside an 18-inch cube, drives on mecanum wheels and launches from a turret that keeps its aim while the chassis moves.",
    stats: [
      { value: "18 in", label: "Start cube" },
      { value: "±170°", label: "Turret" },
      { value: "4 in", label: "Flywheel" },
      { value: "40°", label: "Fixed hood" },
    ],
    robotSide: "left",
    // The team asked for the turret to light up here, like the drivetrain does in C3.
    focus: ["turret"],
    link: { href: "/robot", label: "Meet the robot" },
  },
  {
    id: "drive",
    code: "C3",
    eyebrow: "[ C3 / DRIVE + ODOMETRY ]",
    title: "It knows where it is.",
    body: "Mecanum wheels strafe and turn at once. A goBILDA Pinpoint fuses two dead-wheel pods with an IMU at 1500 Hz, so the robot always knows its position and velocity — even when the HIVE moves.",
    robotSide: "right",
    focus: ["drivetrain", "odometry"],
  },
  {
    id: "intake",
    code: "C4",
    eyebrow: "[ C4 / INTAKE + SORTER ]",
    title: "It knows what it's holding.",
    body: "Rollers pull balls into the hopper, where a REV Color Sensor V3 tells POLLEN from NECTAR, sets the flywheel RPM for that ball and ejects the opponent's NECTAR — rule G408, a rule-compliance feature, not just an efficiency one.",
    robotSide: "left",
    focus: ["intake", "hopper"],
  },
  {
    id: "solver",
    code: "C5",
    eyebrow: "[ C5 / TURRET + SOLVER ]",
    title: "It finds the APEX.",
    body: "Odometry says where we are. Vision says where the HIVE is. The solver closes the loop: flight time falls out of the fixed 40° hood, the turret leads the moving shot, and the flywheel spins to the exact RPM.",
    robotSide: "right",
    focus: ["turret", "shooter", "vision"],
    link: { href: "/code", label: "Read the code" },
  },
  {
    id: "season",
    code: "C6",
    eyebrow: "[ C6 / THE SEASON ]",
    title: "Built for consistency.",
    body: "A HIVE TIP is worth ten CELL points — so we built for consistency: no shot fires until four gates agree.",
    stats: [
      { value: "2.8 in × 40", label: "POLLEN" },
      { value: "3.6 in", label: "NECTAR red / blue" },
      { value: "20 pts", label: "HIVE TIP" },
    ],
    robotSide: "left",
    focus: [],
  },
];

// ─── Real-model node naming convention (docs/ROBOT-MODEL.md, npm run model:check) ────────────

/** Group names the site looks for inside public/models/apex-r1.glb. Missing ones degrade gracefully. */
export const MODEL_NODE_NAMES = {
  required: ["drivetrain", "intake", "hopper", "turret", "shooter", "vision", "electronics", "odometry"],
  optional: ["flywheel", "wheel_fl", "wheel_fr", "wheel_bl", "wheel_br"],
} as const;

// ─── Photos (Meet the Robot gallery). Add files to /public/robot/ and list them here. ────────

export interface RobotPhoto {
  src: string;
  alt: string;
  caption?: string;
  /** ISO date taken. */
  date?: string;
}

/** Empty until the first build photos exist — the page shows "ROBOT PHOTOS PENDING". */
export const robotPhotos: RobotPhoto[] = [];
