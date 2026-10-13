// Console transcripts for the Code page terminal. Everything printed is real:
//   build — the command + result recorded in docs/00-START-HERE.md
//   solve — calls to the team's Ballistics API (real signatures). The results are computed HERE, when
//           the page is built, by src/lib/ballistics.ts (the line-for-line port of Ballistics.java),
//           and printed exactly like Ballistics.Solution.toString().
//   tune  — grep output of the OpMode annotations on `main` (see repo-snapshot.ts).
// Pure + deterministic (no Date, no randomness) so it is safe in a static server render.

import { solve, type SolveInput } from "@/lib/ballistics";
import { buildLog } from "@/content/code";
import { AIM_Z_IN, MUZZLE, javaSolutionString, traceSolve } from "./solver-math";
import { driveOpModeGrep, repoFileUrl, tuningAnnotations } from "./repo-snapshot";

export type Tone = "fg" | "muted" | "dim" | "ok" | "strong";
export interface Seg {
  t: string;
  tone?: Tone;
}
export interface ConsoleLine {
  segs: Seg[];
  /** ms before this line appears. */
  delay: number;
}
export interface ConsoleTab {
  id: "build" | "solve" | "tune";
  label: string;
  /** Shown before the typed command. */
  prompt: string;
  command: string;
  /** Trailing comment typed after the command (dimmed). */
  comment?: string;
  /** Working directory shown in the title bar. */
  cwd: string;
  lines: ConsoleLine[];
  /** What this tab is and where it came from. */
  caption: string;
  source: { label: string; href?: string };
}

const line = (delay: number, ...segs: Seg[]): ConsoleLine => ({ segs, delay });
const blank = (delay = 60): ConsoleLine => ({ segs: [], delay });

// ─── solve ────────────────────────────────────────────────────────────────────────────────────

interface Call {
  /** Java call text after `Ballistics.` */
  java: string;
  input: SolveInput;
  comment?: string;
}

const target = (x: number) => ({ x, y: 0, z: AIM_Z_IN });

const CALLS: Call[] = [
  {
    java: `solveStationary(0, 0, 14, 96, 0, ${AIM_Z_IN}, 0, BallType.POLLEN)`,
    input: { muzzle: MUZZLE, target: target(96), ball: "POLLEN" },
  },
  {
    java: `solve(0, 0, 14, 96, 0, ${AIM_Z_IN}, 0, 30, 0, BallType.POLLEN)`,
    input: { muzzle: MUZZLE, target: target(96), robotVel: { x: 0, y: 30 }, ball: "POLLEN" },
    comment: "// strafing left, 30 in/s",
  },
  {
    java: `solveStationary(0, 0, 14, 96, 0, ${AIM_Z_IN}, 0, BallType.NECTAR_RED)`,
    input: { muzzle: MUZZLE, target: target(96), ball: "NECTAR_RED" },
  },
  {
    java: `solveStationary(0, 0, 14, 40, 0, ${AIM_Z_IN}, 0, BallType.POLLEN)`,
    input: { muzzle: MUZZLE, target: target(40), ball: "POLLEN" },
  },
  {
    java: `solveStationary(0, 0, 14, 36, 0, ${AIM_Z_IN}, 0, BallType.POLLEN)`,
    input: { muzzle: MUZZLE, target: target(36), ball: "POLLEN" },
  },
];

function solveTab(): ConsoleTab {
  const lines: ConsoleLine[] = [];
  CALLS.forEach((call, i) => {
    const sol = solve(call.input);
    const out = javaSolutionString(sol, traceSolve(call.input));
    if (i > 0) {
      lines.push(blank(90));
      lines.push(
        line(
          650,
          { t: "jshell> ", tone: "muted" },
          { t: `Ballistics.${call.java}`, tone: "fg" },
          ...(call.comment ? [{ t: `  ${call.comment}`, tone: "dim" as const }] : []),
        ),
      );
    }
    lines.push(line(i === 0 ? 260 : 320, { t: `$${i + 1} ==> `, tone: "muted" }, { t: out, tone: sol.valid ? "fg" : "strong" }));
  });
  return {
    id: "solve",
    label: "solve",
    prompt: "jshell>",
    command: `Ballistics.${CALLS[0].java}`,
    cwd: "jshell · util.Ballistics",
    lines,
    caption:
      "What the team's solver returns for these calls, printed the way Solution.toString() prints it. Computed when this site is built by src/lib/ballistics.ts, a line-for-line port of Ballistics.java with the same constants. Muzzle at 14 in, aim point 46 in up (an estimate; on the robot, vision measures it).",
    source: { label: "util/Ballistics.java", href: repoFileUrl("TeamCode/src/main/java/org/firstinspires/ftc/teamcode/util/Ballistics.java") },
  };
}

// ─── build ────────────────────────────────────────────────────────────────────────────────────

function buildTab(): ConsoleTab {
  const [ok, apk] = buildLog.output;
  return {
    id: "build",
    label: "build",
    prompt: "$",
    command: buildLog.command,
    comment: "# compile",
    cwd: "~/ApexFTC2026---36674",
    lines: [blank(140), line(1100, { t: ok, tone: "ok" }), line(180, { t: apk, tone: "muted" })],
    caption: "The real build, as recorded in the team's setup guide. It compiles without a robot attached, from VS Code or Cursor with adb — no Android Studio needed.",
    source: { label: "docs/00-START-HERE.md", href: repoFileUrl("docs/00-START-HERE.md") },
  };
}

// ─── tune ─────────────────────────────────────────────────────────────────────────────────────

function annotationSegs(src: string): Seg[] {
  // @TeleOp(name = "T1 Odometry Test", group = "Tuning") → name in full strength, the rest muted
  const m = /^(@TeleOp\(name = ")(.*?)(", group = ")(.*?)("\))$/.exec(src);
  if (!m) return [{ t: src, tone: src.startsWith("@Disabled") ? "strong" : "muted" }];
  return [
    { t: m[1], tone: "muted" },
    { t: m[2], tone: "fg" },
    { t: m[3], tone: "muted" },
    { t: m[4], tone: "muted" },
    { t: m[5], tone: "muted" },
  ];
}

function tuneTab(): ConsoleTab {
  const lines: ConsoleLine[] = [blank(120)];
  tuningAnnotations.forEach((a, i) => {
    lines.push(line(i === 0 ? 220 : 90, ...annotationSegs(`@TeleOp(name = "${a.name}", group = "${a.group}")`)));
  });
  lines.push(blank(120));
  lines.push(line(700, { t: "$ ", tone: "muted" }, { t: 'grep -h -A1 "@TeleOp" opmodes/TeleOp*.java', tone: "fg" }));
  driveOpModeGrep.forEach((src, i) => {
    lines.push(line(i === 0 ? 260 : 90, ...annotationSegs(src)));
  });
  return {
    id: "tune",
    label: "tune",
    prompt: "$",
    command: 'grep -h "@TeleOp" opmodes/tuning/*.java',
    cwd: "…/ftc/teamcode",
    lines,
    caption:
      "The tuning OpModes exactly as the Driver Station lists them, grepped from the source on main (2026-10-12). TeleOp Main stays @Disabled until the turret, shooter, feeder, intake and colour sensor exist; until then the team drives TeleOp Drive Only.",
    source: { label: "opmodes/tuning/", href: `${repoFileUrl("TeamCode/src/main/java/org/firstinspires/ftc/teamcode/opmodes/tuning").replace("/blob/", "/tree/")}` },
  };
}

/** The three console tabs, computed once per build. */
export function getConsoleTabs(): ConsoleTab[] {
  return [buildTab(), solveTab(), tuneTab()];
}
