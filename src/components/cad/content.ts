// ─────────────────────────────────────────────────────────────────────────────
// CAD — DWG-004, APEX-R1 general assembly (/cad).
//
// Every number on this page comes from the team's code and docs
// (github.com/aaaravM/ApexFTC2026---36674: RobotConstants.java, Turret.java, Shooter.java,
// BallSorter.java, BallType.java, docs/03-ARCHITECTURE.md, hub-backup/README-rewire.md) or from the
// Competition Manual (TU04), and each one says where it came from in `source`.
// The worked numbers (free speed, ticks, the 96 in shot…) are computed below with the same maths the
// robot runs (src/lib/ballistics.ts is a port of Ballistics.java), never typed in by hand.
//
// STUDENTS — the bits you will want to edit:
//   • `iterations` in each design story: add a row every time a mechanism changes on the real robot
//     ({ date: "2026-11-02", change: "…", source: "build log" }). An empty list shows a designed
//     "PENDING — LOG FROM BUILD" row, so never invent one.
//   • `onshape` in `assemblies`: paste the public Onshape link when a document is made public.
//   • `revisions`: add a row when this sheet changes meaningfully (REV B, C…).
// ─────────────────────────────────────────────────────────────────────────────

import { apexOf, BALLS, muzzleSpeedToRpm, SHOOTER, solve, type SolveInput } from "@/lib/ballistics";
import { fmtFixed, fmtInt } from "@/lib/format";
import type { SubsystemId } from "@/content/robot";

/** Manual link (never re-host the manual). */
export const MANUAL_URL = "https://ftc.game/manual";

// ─── The sheet ────────────────────────────────────────────────────────────────

export const drawing = {
  number: "DWG-004",
  title: "APEX-R1 general assembly",
  rev: "A",
  scale: "1 : 4",
  sheet: "1 of 1",
  drawn: "Apex Robotics",
  units: "in [mm]",
  /** ISO date of the current revision. */
  date: "2026-10-12",
} as const;

export interface Revision {
  rev: string;
  description: string;
  date: string;
}

/** Revision block (top right of the sheet). Newest last. */
export const revisions: Revision[] = [
  { rev: "A", description: "First issue — concept model generated from RobotConstants.java", date: "2026-10-12" },
];

// ─── Assemblies (VIEW 1 tabs + the model index) ────────────────────────────────

export type AssemblyId = "full" | "drive" | "intake" | "turret";

export interface Assembly {
  id: AssemblyId;
  /** Drawing / Onshape document number. */
  cad: string;
  /** Tab label (keep short — four tabs share one row). */
  tab: string;
  /** Register title. */
  title: string;
  /** Subsystems shown at full strength; the rest are ghosted. Empty = the whole robot. */
  subsystems: SubsystemId[];
  /** What the document contains, for the model index. */
  contains: string;
  summary: string;
  /** Design story that explains this assembly (anchor id on this page). */
  story?: { id: string; code: string };
  /** Public Onshape link — undefined shows "PUBLIC ONSHAPE LINK PENDING". */
  onshape?: string;
}

export const assemblies: Assembly[] = [
  {
    id: "full",
    cad: "CAD-001",
    tab: "Full assembly",
    title: "Full assembly",
    subsystems: [],
    contains: "All eight subsystems",
    summary:
      "Eight subsystems packaged inside the 18 in start cube: drivetrain, odometry, electronics, intake, hopper, turret, shooter and vision.",
  },
  {
    id: "drive",
    cad: "CAD-002",
    tab: "Drivetrain",
    title: "Drivetrain",
    subsystems: ["drivetrain", "odometry"],
    contains: "Drivetrain · odometry",
    summary:
      "Four 104 mm mecanum wheels on 312 RPM motors, with a goBILDA Pinpoint and two dead-wheel pods underneath.",
    story: { id: "cad-ds-01", code: "DS-01" },
  },
  {
    id: "intake",
    cad: "CAD-003",
    tab: "Intake",
    title: "Intake",
    subsystems: ["intake", "hopper"],
    contains: "Intake · hopper + sorter",
    summary:
      "A driven roller and two continuous-rotation side rollers feed the hopper, where a REV Color Sensor V3 classifies every ball.",
    story: { id: "cad-ds-02", code: "DS-02" },
  },
  {
    id: "turret",
    cad: "CAD-004",
    tab: "Turret + shooter",
    title: "Scoring / turret",
    subsystems: ["turret", "shooter"],
    contains: "Turret · shooter",
    summary:
      "A ±170° turret geared 5 : 1, carrying one 4 in flywheel under a fixed 40° hood. The muzzle sits 14 in above the floor.",
    story: { id: "cad-ds-03", code: "DS-03" },
  },
];

export const getAssembly = (id: AssemblyId) => assemblies.find((a) => a.id === id)!;

// ─── Worked numbers (computed, not typed) ─────────────────────────────────────

const IN_PER_MM = 1 / 25.4;
const wheelIn = 104 * IN_PER_MM; // RobotConstants: WHEEL_DIAMETER_IN = 4.094488
const wheelCircIn = Math.PI * wheelIn;
const driveTicksPerRev = 537.7; // Drive.TICKS_PER_REV
const driveRpm = 312;
const freeSpeed = (driveRpm / 60) * wheelCircIn; // Drive.FREE_SPEED_IN_PER_SEC = 66.889
const shortBy = (wheelIn / 4 - 1) * 100; // "using 4.0 makes every distance read 2.4 % short"

const G = 5; // Turret external reduction
const ticksPerRad = (537.7 * G) / (2 * Math.PI); // Turret.TICKS_PER_RAD = 427.889
const ticksPerDeg = ticksPerRad * (Math.PI / 180);
const slew = 1872 / G; // "Free slew speed is 1872 / G deg/s"
const motorTurns = (340 * G) / 360; // ±170° of travel → motor output turns

/** The shot every page uses as its worked example (same as the ArcMotif default). */
export const EXAMPLE_SHOT = { distanceIn: 96, targetHeightIn: 40 } as const;
const exInput: SolveInput = {
  muzzle: { x: 0, y: 0, z: SHOOTER.muzzleHeightIn },
  target: { x: EXAMPLE_SHOT.distanceIn, y: 0, z: EXAMPLE_SHOT.targetHeightIn },
  ball: "POLLEN",
};
const exPollen = solve(exInput);
const exApex = apexOf(exInput, exPollen);
export const exampleShot = { input: exInput, pollen: exPollen, apex: exApex };
const exNectarRpm = muzzleSpeedToRpm(exPollen.muzzleSpeedIn, "NECTAR_RED");
const nectarUplift = (BALLS.POLLEN.transferEfficiency / BALLS.NECTAR_RED.transferEfficiency - 1) * 100;

/** Turret gear-ratio trade study, straight from the comment above Turret.TICKS_PER_RAD. */
export const turretRatios = [1, 5, 6.25, 8, 10, 20].map((g) => ({
  g,
  ticksPerRad: (537.7 * g) / (2 * Math.PI),
  ticksPerDeg: ((537.7 * g) / (2 * Math.PI)) * (Math.PI / 180),
  slewDegPerSec: 1872 / g,
  chosen: g === G,
  note: g === 1 ? "Not viable — too coarse" : g === 20 ? "Too slow" : g === G ? "Chosen" : g <= 8 ? "In the 5–8 band" : "",
}));

// ─── Design stories ───────────────────────────────────────────────────────────

export interface Requirement {
  /** Manual rule number, rendered as a chip that links to the manual. */
  rule?: string;
  text: string;
  source: string;
}

export interface TradeOption {
  name: string;
  text: string;
  chosen?: boolean;
}

export interface Trade {
  question: string;
  options: TradeOption[];
  source: string;
}

export interface MathLine {
  label: string;
  expr: string;
  result: string;
  note?: string;
}

export interface Iteration {
  /** ISO date, or undefined when the source doesn't date it. */
  date?: string;
  change: string;
  source: string;
}

export type RiskStatus = "open" | "planned" | "in code" | "watch";

export interface Risk {
  risk: string;
  mitigation: string;
  status: RiskStatus;
  source: string;
}

export interface DesignStory {
  id: string;
  code: string;
  assembly: AssemblyId;
  /** Mono label, e.g. "DRIVETRAIN + ODOMETRY". */
  label: string;
  title: string;
  intro: string;
  /** Optional status line shown under the title (e.g. what isn't on the robot yet). */
  status?: string;
  requirements: Requirement[];
  trades: Trade[];
  decision: string[];
  math: MathLine[];
  iterations: Iteration[];
  risks: Risk[];
}

const RC = "RobotConstants.java";

export const designStories: DesignStory[] = [
  {
    id: "cad-ds-01",
    code: "DS-01",
    assembly: "drive",
    label: "Drivetrain + odometry",
    title: "Know where the robot is — without the AprilTags.",
    intro:
      "BIOBUZZ™ AprilTags ride on the HIVE, and the HIVE tips. So the robot carries its own position sensor on the drivetrain, and vision only measures the target.",
    requirements: [
      { rule: "R102", text: "Start inside an 18 × 18 × 18 in cube. The drivetrain sets the footprint.", source: "Competition Manual TU04 · R102" },
      {
        text: "Reposition while the turret keeps its aim — strafe and turn at the same time.",
        source: "docs/03-ARCHITECTURE.md · shooting while moving",
      },
      {
        text: "“Since BIOBUZZ AprilTags move, they are not suitable for absolute Field Localization.”",
        source: "FTC SDK 12.0 release notes, quoted in docs/03-ARCHITECTURE.md",
      },
    ],
    trades: [
      {
        question: "Who answers “where is the robot?”",
        options: [
          { name: "Usual FTC pattern", text: "AprilTags give an absolute pose; the goal is a hard-coded field constant." },
          { name: "What BIOBUZZ needs", text: "Odometry localises the robot. Vision measures the target live.", chosen: true },
        ],
        source: "docs/03-ARCHITECTURE.md",
      },
    ],
    decision: [
      "4 × goBILDA 5203 motors (19.2 : 1, 312 RPM) on 104 mm mecanum wheels.",
      "goBILDA Pinpoint (“odomcomp”) with two dead-wheel pods: the X pod 84 mm right of the tracking point, the Y pod 168 mm behind it.",
      "Heading rate from the Pinpoint's fused IMU at 1500 Hz, plus 0.5 s of pose history so each camera frame meets the pose from when its shutter opened.",
    ],
    math: [
      {
        label: "Wheel",
        expr: "104 mm ÷ 25.4",
        result: `${fmtFixed(wheelIn, 3)} in`,
        note: `Using 4.0 would read every distance ${fmtFixed(shortBy, 1)} % short.`,
      },
      { label: "Ticks per inch", expr: `${fmtFixed(driveTicksPerRev, 1)} ÷ (π × ${fmtFixed(wheelIn, 3)} in)`, result: fmtFixed(driveTicksPerRev / wheelCircIn, 2) },
      {
        label: "Free speed",
        expr: `${driveRpm} rpm ÷ 60 × π × ${fmtFixed(wheelIn, 3)} in`,
        result: `${fmtFixed(freeSpeed, 1)} in/s`,
        note: "An upper bound: expect 53–58 in/s forward and 42–46 in/s strafing.",
      },
      { label: "Stale frame", expr: "60 in/s × 0.1 s", result: "6 in", note: "Why the pose history exists." },
    ],
    iterations: [
      {
        date: "2026-10-11",
        change: "Rewire: left drive motors to the Expansion Hub, right to the Control Hub. No Java changed — devices are found by name.",
        source: "hub-backup/README-rewire.md",
      },
      {
        date: "2026-10-11",
        change: "Forward drove backward, cleanly, with no veer — so all four motor directions were flipped together.",
        source: `${RC} · Drive.REVERSE_*`,
      },
    ],
    risks: [
      {
        risk: "If the Pinpoint reports robot-relative velocity, the turret leads correctly along one axis and backwards along the other.",
        mitigation: "T3 Velocity Frame Test answers it in about 20 s. Set to field-relative for now, on Pedro Pathing's evidence.",
        status: "watch",
        source: `${RC} · Odo.VELOCITY_IS_ROBOT_RELATIVE`,
      },
      {
        risk: "Left and right sides sit on different hubs, so latency is asymmetric — in principle a slight veer under hard acceleration.",
        mitigation: "Usually smaller than wheel scrub and battery sag. Only chase it if odometry tuning can't explain a drift.",
        status: "watch",
        source: "hub-backup/README-rewire.md",
      },
    ],
  },
  {
    id: "cad-ds-02",
    code: "DS-02",
    assembly: "intake",
    label: "Intake + sorter",
    title: "Hold four, and never the opponent's NECTAR.",
    intro:
      "The colour sensor in the hopper throat has two jobs: choose the flywheel RPM for the ball it sees, and throw out the ball we aren't allowed to keep.",
    requirements: [
      { rule: "G407", text: "Never control more than 4 scoring elements.", source: "Competition Manual TU04 · G407" },
      {
        rule: "G408",
        text: "Never control the opponent's NECTAR — so rejecting it is rule compliance, not just efficiency.",
        source: "Competition Manual TU04 · G408",
      },
      {
        text: "Two balls through one path: POLLEN 2.8 in and 25 g, NECTAR 3.6 in and 41 g (1.65× the mass, 1.29× the diameter).",
        source: "BallType.java · docs/01-BIOBUZZ-GAME.md",
      },
    ],
    trades: [
      {
        question: "How to tell the balls apart",
        options: [
          { name: "Raw RGB", text: "Every channel scales with light: a yellow ball in shadow and a red ball in bright light can read alike." },
          {
            name: "Hue + saturation",
            text: "Hue is the angle around the colour wheel and barely moves with brightness; saturation confirms it is a coloured object.",
            chosen: true,
          },
        ],
        source: "BallSorter.java",
      },
      {
        question: "How NECTAR gets more RPM",
        options: [
          { name: "Fixed RPM bump", text: "Only correct at the distance where it was measured." },
          { name: "Efficiency per ball", text: "One number per ball type, correct at every distance.", chosen: true },
        ],
        source: "docs/03-ARCHITECTURE.md",
      },
    ],
    decision: [
      "REV Color Sensor V3 in the hopper throat, 5–15 mm from the ball. A distance reading under 25 mm means a ball is present.",
      "Hue windows: POLLEN 35°–85°, RED 340°–20° (wrapping through 0°), BLUE 190°–265°. Below 0.35 saturation counts as no ball.",
      "Opponent NECTAR is ejected automatically (BallSorter.shouldReject() in TeleOpMain).",
    ],
    math: [
      { label: "Flywheel speed", expr: "rpm = 60 · v ÷ (η · π · D)", result: "" },
      {
        label: `POLLEN, ${EXAMPLE_SHOT.distanceIn} in shot`,
        expr: `η = ${fmtFixed(BALLS.POLLEN.transferEfficiency, 2)}`,
        result: `${fmtInt(exPollen.flywheelRpm)} rpm`,
      },
      {
        label: "NECTAR, same shot",
        expr: `η = ${fmtFixed(BALLS.NECTAR_RED.transferEfficiency, 2)}`,
        result: `${fmtInt(exNectarRpm)} rpm`,
        note: `${fmtInt(nectarUplift)} % more RPM for the same arc.`,
      },
    ],
    iterations: [],
    risks: [
      {
        risk: "Alliance colour left on the wrong setting: the sorter keeps their NECTAR and rejects ours.",
        mitigation: "Duplicate TeleOpMain into a red and a blue version, so nobody has to remember.",
        status: "planned",
        source: "docs/03-ARCHITECTURE.md",
      },
      {
        risk: "The hue windows are first guesses until measured under venue lighting.",
        mitigation: "T6 Color Sensor Calibration prints hue; adjust RobotConstants.Colors to match.",
        status: "planned",
        source: `${RC} · Colors (TUNE ME)`,
      },
    ],
  },
  {
    id: "cad-ds-03",
    code: "DS-03",
    assembly: "turret",
    label: "Turret",
    title: "Hold the aim while the chassis turns underneath.",
    intro:
      "When the chassis spins counter-clockwise at ω, the turret has to spin clockwise at ω just to stand still in the field.",
    status: "Turret motor not yet configured on the robot (config name “turret” reserved).",
    requirements: [
      {
        rule: "R105",
        text: "After the start, stay inside 18 × 24 × 29 in. A turret turning in the horizontal plane is legal only if its maximum extent stays inside (Fig. 12-6).",
        source: "Competition Manual TU04 · R105",
      },
      { text: "Hold a field-frame bearing while the robot drives and spins.", source: "Turret.java" },
    ],
    trades: [
      {
        question: "Control law",
        options: [
          { name: "Position PID only", text: "Always lags while the chassis spins: it reacts only after an error exists." },
          {
            name: "PID + heading feedforward",
            text: "Adds −ω · kV before the PID sees an error. ω comes from the Pinpoint at 1500 Hz.",
            chosen: true,
          },
        ],
        source: "Turret.java",
      },
    ],
    decision: [
      "±170° of travel through one clean external reduction, G = 5.",
      "turretAngle = wrap(azimuth − robotHeading), output += −ω · kV with kV = 0.11.",
      "On target within 1.5°; power capped at 85 %.",
    ],
    math: [
      { label: "Resolution", expr: `537.7 × ${G} ÷ 2π`, result: `${fmtFixed(ticksPerRad, 1)} ticks/rad`, note: `${fmtFixed(ticksPerDeg, 1)} ticks per degree.` },
      { label: "Free slew", expr: `1872 ÷ ${G}`, result: `${fmtInt(slew)} °/s`, note: `≈ ${fmtInt(slew * 0.85)} °/s at the 85 % power cap.` },
      { label: "Motor turns, full travel", expr: `340° × ${G} ÷ 360°`, result: `${fmtFixed(motorTurns, 1)} turns` },
    ],
    iterations: [],
    risks: [
      {
        risk: `Wiring tear-out: full travel is ${fmtFixed(motorTurns, 1)} turns of the motor shaft.`,
        mitigation: "Route the turret wiring with a service loop.",
        status: "planned",
        source: `${RC} · Turret`,
      },
      {
        risk: "Backlash, not encoder resolution, sets the accuracy — and every gear stage adds its own.",
        mitigation: "One external stage. Measure ticks per radian against a protractor instead of trusting the nameplate ratio.",
        status: "planned",
        source: `${RC} · Turret.TICKS_PER_RAD`,
      },
      {
        risk: "A target in the 20° dead zone behind the robot.",
        mitigation: "The solver refuses (“turret can't reach that angle — rotate the chassis”) and the PID never pushes past ±170°.",
        status: "in code",
        source: "Ballistics.java · Turret.java",
      },
    ],
  },
  {
    id: "cad-ds-04",
    code: "DS-04",
    assembly: "turret",
    label: "Shooter",
    title: "A soft lob, solved in closed form.",
    intro:
      "A HIVE TIP is worth 20 points against 2 for each element in a CELL, so the shooter is built for repeatable shots rather than long ones.",
    requirements: [
      { text: "Drop balls into the upward CELL, an opening about 20 × 14 in.", source: "Competition Manual TU04 · 9.6.2" },
      { text: "HIVE TIP 20 points vs 2 per element in a CELL — consistency is what scores.", source: "Competition Manual TU04 · Table 10-2" },
      { text: "Launch POLLEN (2.8 in) and NECTAR (3.6 in) off the same wheel.", source: "BallType.java" },
    ],
    trades: [
      {
        question: "Hood",
        options: [
          { name: "Adjustable", text: "Angle and speed are both unknowns, so the solver has to search." },
          {
            name: "Fixed 40°",
            text: "Flight time falls straight out of the geometry and the solver only picks RPM. 35–45° is the usual sweet spot for dropping into an upward opening.",
            chosen: true,
          },
        ],
        source: `${RC} · Shoot.LAUNCH_PITCH_DEG · docs/03-ARCHITECTURE.md`,
      },
      {
        question: "Drive",
        options: [
          { name: "Belted", text: "Moves the motor off its peak-power point and makes recovery between shots worse." },
          { name: "Direct 1 : 1", text: "Held at 2700–2900 rpm, a bare 5203 makes 22.6 W of its 22.64 W peak.", chosen: true },
        ],
        source: "Shooter.java",
      },
      {
        question: "Motors",
        options: [
          { name: "Two", text: "Buys nothing here." },
          {
            name: "One",
            text: "1.1 J (POLLEN) or 1.8 J (NECTAR) per shot against ~25 J stored in the wheel: 65–108 rpm of droop, recovered in 0.05–0.08 s.",
            chosen: true,
          },
        ],
        source: "Shooter.java",
      },
      {
        question: "Speed control",
        options: [
          { name: "Power number", text: "A different RPM at 13.5 V than at 11.8 V, and the wheel slows after every shot." },
          { name: "Closed-loop RPM", text: "The Hub's velocity PIDF holds the RPM, and no ball feeds until it has settled.", chosen: true },
        ],
        source: "Shooter.java",
      },
    ],
    decision: [
      "One 4.0 in flywheel on a goBILDA 5203 (1 : 1, 6000 rpm free) under a fixed 40° hood. The muzzle sits 14 in up and 2 in forward.",
      "Ready to fire after ±100 rpm has held for 0.15 s. Commands ramp at 4000 rpm/s and clamp at 5000 rpm.",
    ],
    math: [
      { label: "Flight time", expr: "t = √(2(d·tanθ − h) ÷ g)", result: `${fmtFixed(exPollen.flightTimeSec, 3)} s` },
      { label: "Exit speed", expr: "v = d ÷ (t · cosθ)", result: `${fmtInt(exPollen.muzzleSpeedIn)} in/s` },
      { label: "Flywheel", expr: `60 · v ÷ (${fmtFixed(BALLS.POLLEN.transferEfficiency, 2)} · π · 4 in)`, result: `${fmtInt(exPollen.flywheelRpm)} rpm` },
      { label: "Apex", expr: "z₀ + v_z² ÷ 2g", result: `${fmtFixed(exApex.z, 1)} in` },
      { label: "Range per rpm", expr: "≈ 0.117 in/rpm", result: "40 rpm ≈ 4.7 in", note: "Roughly half a CELL opening — why the ready gate exists." },
    ],
    iterations: [
      {
        change: "Flywheel direction set explicitly. It had been running whichever way the motor was wired — on this robot, backwards.",
        source: `${RC} · Shoot.REVERSE_FLYWHEEL`,
      },
    ],
    risks: [
      {
        risk: "The 0.8 in gap between POLLEN and NECTAR is 2–4× the usable compression of a compliant wheel, so one fixed gap can't grip both.",
        mitigation: "Needs a sprung or floating hood — no PIDF value fixes a ball that isn't touching the wheel.",
        status: "open",
        source: "Shooter.java",
      },
      {
        risk: "A stepped RPM command draws close to the 9.2 A stall current for over a second — a Control Hub brown-out mid-match.",
        mitigation: "Commands ramp at 4000 rpm/s.",
        status: "in code",
        source: `${RC} · Shoot.RPM_RAMP_PER_SEC`,
      },
      {
        risk: "28 counts/rev is the coarsest velocity feedback on the robot.",
        mitigation: "Average 5 samples; hold a 100 rpm tolerance.",
        status: "in code",
        source: "Shooter.java",
      },
    ],
  },
];

/** The four steps of a design story, in order (labels shared by the layout and the stepper). */
export const STORY_STEPS = [
  { key: "requirements", code: "01", label: "Requirement" },
  { key: "trades", code: "02", label: "Options" },
  { key: "decision", code: "03", label: "Decision + math" },
  { key: "iterations", code: "04", label: "Iterations" },
  { key: "risks", code: "05", label: "Risk" },
] as const;

// ─── Detail-drawing numbers ───────────────────────────────────────────────────

/** Hue windows in degrees + the saturation floor (RobotConstants.Colors). */
export const HUE = {
  pollen: [35, 85] as const,
  red: [340, 20] as const,
  blue: [190, 265] as const,
  minSaturation: 0.35,
  ballPresentMm: 25,
};

/** Odometry pod offsets from the tracking point, mm (RobotConstants.Odo). */
export const PODS = { xPodLateralMm: -84, yPodLongitudinalMm: -168 } as const;

/** Flywheel operating points (Shooter.java / RobotConstants.Shoot). */
export const RPM_POINTS = {
  gameBand: [1600, 2900] as const,
  peakPower: 3000,
  clamp: 5000,
  free: 6000,
} as const;

// ─── Toolchain + notes ────────────────────────────────────────────────────────

export interface Tool {
  code: string;
  name: string;
  role: string;
  note: string;
}

export const toolchain: Tool[] = [
  { code: "T-01", name: "Onshape", role: "CAD", note: "Subsystem models and assemblies. Exports GLB natively since release 1.217." },
  { code: "T-02", name: "Fusion 360", role: "CAD", note: "No native GLB: export STEP, import it into Onshape, export GLB from there." },
  { code: "T-03", name: "3D print", role: "Fab", note: "Printed parts." },
  { code: "T-04", name: "Mill", role: "Fab", note: "Machined parts." },
];

export const generalNotes: string[] = [
  "Concept model generated from RobotConstants.java. It shows the team's real numbers; geometry between them is estimated until the real CAD is public.",
  "Dimensions in inches [millimetres]. Angles in degrees.",
  "Robot frame: +X forward, +Y left, +Z up, heading counter-clockwise — the same convention as every file in TeamCode.",
  "Values marked TUNE ME in RobotConstants.java (muzzle position, hood angle, pod offsets, hue windows) are design values until measured on the built robot.",
  "Rules cited from the BIOBUZZ™ Competition Manual as of Team Update 04.",
];
