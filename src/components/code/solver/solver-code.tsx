"use client";

// The real code behind the solver demo, following the demo live:
//   • Ballistics.java solver loop — marks the path the current solve took (converged / bracket
//     failure) and replays it pass by pass in a table (t in → virtual target → d → t out → |Δt|)
//   • muzzleSpeedToRpm() — the return line carries the RPM it produces right now
//   • BallType — the enum constant(s) for the ball you picked
// Excerpts are verbatim from the repo (trimmed where marked ⋮), highlighted at build time.

import type { Solution } from "@/lib/ballistics";
import { fmtFixed, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CodeFigure, CodeView, lineText, type LineState } from "../code-view";
import type { CodeLine } from "../highlight";
import { blobUrl } from "../repo-snapshot";
import { MAX_PASSES, TOL_S, type BallChoice, type Trace } from "../solver-math";

export interface ExcerptView {
  title: string;
  file: string;
  startLine?: number;
  endLine?: number;
  lines: CodeLine[];
  resume?: Record<number, number>;
  synthetic?: number[];
}

const findLine = (lines: CodeLine[], re: RegExp) => lines.findIndex((l) => re.test(lineText(l)));
const findLines = (lines: CodeLine[], re: RegExp) => lines.flatMap((l, i) => (re.test(lineText(l)) ? [i] : []));

function range(ex: ExcerptView) {
  if (!ex.startLine) return ex.file;
  return `${ex.file} · L${ex.startLine}${ex.endLine ? `–${ex.endLine}` : ""}`;
}
function href(ex: ExcerptView) {
  const base = blobUrl(ex.file);
  return ex.startLine ? `${base}#L${ex.startLine}${ex.endLine ? `-L${ex.endLine}` : ""}` : base;
}

export function SolverCode({
  solver,
  rpm,
  balltype,
  sol,
  trace,
  ball,
  efficiency,
  className,
}: {
  solver: ExcerptView;
  rpm: ExcerptView;
  balltype: ExcerptView;
  sol: Solution;
  trace: Trace;
  ball: BallChoice;
  efficiency: number;
  className?: string;
}) {
  // ── solver loop states
  const L = solver.lines;
  const iFor = findLine(L, /for \(int i = 0; i < 6/);
  const iBracketIf = findLine(L, /if \(bracket <= 0\)/);
  const iBreak = findLine(L, /if \(converged\) break/);
  const iTNew = findLine(L, /double tNew/);
  const failLines = iBracketIf >= 0 ? [iBracketIf, iBracketIf + 1, iBracketIf + 2] : [];
  const okLines = [iTNew, iTNew + 1, iTNew + 2, iBreak].filter((i) => i >= 0);
  const hitLimit = !trace.bracketFailed && trace.passes.length === MAX_PASSES && (trace.passes[MAX_PASSES - 1].dt ?? 1) >= TOL_S;
  const solverStates: (LineState | undefined)[] = L.map((_, i) => {
    if (i === iFor) return "active";
    if (trace.bracketFailed) {
      if (failLines.includes(i)) return "active";
      if (okLines.includes(i)) return "dim";
    } else {
      if (failLines.includes(i)) return "dim";
      if (i === iBreak && !hitLimit) return "active";
    }
    return undefined;
  });
  const solverNotes: Record<number, string> = {};
  if (iFor >= 0) solverNotes[iFor] = `// ${trace.passes.length} of ${MAX_PASSES} passes${hitLimit ? " — limit" : ""}`;
  if (trace.bracketFailed && iBracketIf >= 0) solverNotes[iBracketIf] = `// ${fmtFixed(trace.passes[trace.passes.length - 1].bracket, 1)} ≤ 0`;
  if (!trace.bracketFailed && iBreak >= 0 && !hitLimit) {
    const dt = trace.passes[trace.passes.length - 1].dt ?? 0;
    solverNotes[iBreak] = `// |Δt| ${dt < 1e-6 ? "0" : dt.toExponential(1)} s`;
  }

  // ── rpm states
  const R = rpm.lines;
  const iRet = findLine(R, /return 60\.0/);
  const iEff = findLine(R, /double eff/);
  const rpmStates = R.map((_, i) => (i === iRet ? ("active" as const) : undefined));
  const rpmNotes: Record<number, string> = {};
  if (iEff >= 0) rpmNotes[iEff] = `// η = ${fmtFixed(efficiency, 2)}`;
  if (iRet >= 0) rpmNotes[iRet] = sol.flightTimeSec > 0 ? `// → ${fmtInt(sol.flywheelRpm)} rpm` : "// no speed to convert";

  // ── ball type states
  const B = balltype.lines;
  const activeBall = ball === "POLLEN" ? findLines(B, /^\s*POLLEN\(/) : findLines(B, /^\s*NECTAR_(RED|BLUE)\(/);
  const ballStates = B.map((_, i) => (activeBall.includes(i) ? ("active" as const) : undefined));

  return (
    <div className={cn("grid gap-x-[var(--gutter)] gap-y-8 lg:grid-cols-12", className)}>
      <div className="min-w-0 lg:col-span-7">
        <CodeFigure title={solver.title} meta={range(solver)} href={href(solver)}>
          <CodeView
            lines={L}
            startLine={solver.startLine}
            resume={solver.resume}
            synthetic={solver.synthetic}
            states={solverStates}
            notes={solverNotes}
            label={`${solver.title}, ${solver.file}`}
          />
          <Passes trace={trace} />
        </CodeFigure>
      </div>
      <div className="flex min-w-0 flex-col gap-8 lg:col-span-5">
        <CodeFigure title={rpm.title} meta={range(rpm)} href={href(rpm)}>
          <CodeView lines={R} startLine={rpm.startLine} states={rpmStates} notes={rpmNotes} label={`${rpm.title}, ${rpm.file}`} />
        </CodeFigure>
        <CodeFigure title={balltype.title} meta={range(balltype)} href={href(balltype)}>
          <CodeView
            lines={B}
            startLine={balltype.startLine}
            resume={balltype.resume}
            synthetic={balltype.synthetic}
            states={ballStates}
            label={`${balltype.title}, ${balltype.file}`}
          />
        </CodeFigure>
        <p className="text-[14px] leading-6 text-fg-muted">
          NECTAR is 1.65× the mass and 1.29× the diameter of POLLEN, so less of the wheel&apos;s speed reaches the ball (η 0.42 vs 0.50). Same
          required ball speed, about 19% more RPM — which is why the colour sensor picks the RPM curve.
        </p>
      </div>
    </div>
  );
}

/** The fixed-point iteration, pass by pass. */
function Passes({ trace }: { trace: Trace }) {
  return (
    <div className="border-t border-hairline">
      <div className="flex items-baseline justify-between gap-4 px-4 pt-3">
        <p className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">This solve, pass by pass</p>
        <p className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">stop when |Δt| &lt; 1e-4 s</p>
      </div>
      <div className="overflow-x-auto px-4 pt-2 pb-4" tabIndex={0} aria-label="Solver passes">
        <table className="w-full min-w-[520px] border-collapse font-mono text-[12px] tabular-nums">
          <thead>
            <tr className="text-left text-[10px] tracking-[0.08em] text-fg-muted uppercase">
              <th scope="col" className="py-1.5 pr-4 font-normal">Pass</th>
              <th scope="col" className="py-1.5 pr-4 font-normal">t in</th>
              <th scope="col" className="py-1.5 pr-4 font-normal">Virtual target (x, y)</th>
              <th scope="col" className="py-1.5 pr-4 font-normal">d</th>
              <th scope="col" className="py-1.5 pr-4 font-normal">t out</th>
              <th scope="col" className="py-1.5 font-normal">|Δt|</th>
            </tr>
          </thead>
          <tbody>
            {trace.passes.map((p) => {
              const done = p.dt !== null && p.dt < TOL_S;
              return (
                <tr key={p.i} className="border-t border-hairline">
                  <td className="py-1.5 pr-4 text-fg">{p.i}</td>
                  <td className="py-1.5 pr-4 text-fg-muted">{fmtFixed(p.tIn, 4)} s</td>
                  <td className="py-1.5 pr-4 text-fg-muted">
                    ({fmtFixed(p.vtx, 1)}, {fmtFixed(p.vty, 1)})
                  </td>
                  <td className="py-1.5 pr-4 text-fg">{fmtFixed(p.d, 1)} in</td>
                  <td className="py-1.5 pr-4 text-fg">{p.tOut === null ? "—" : `${fmtFixed(p.tOut, 4)} s`}</td>
                  <td className={cn("py-1.5", done ? "text-fg" : "text-fg-muted")}>
                    {p.dt === null ? "no shot" : p.dt < 1e-6 ? "0" : p.dt.toExponential(1)}
                    {done && <span className="ml-2 text-[10px] tracking-[0.08em] uppercase">✓ converged</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
