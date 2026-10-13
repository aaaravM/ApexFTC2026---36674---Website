"use client";

// The interactive solver: set the range to the CELL, the robot's velocity and the ball; every
// number comes from solve() in src/lib/ballistics.ts (the port of Ballistics.java).
//   VIEW A — ELEVATION: the arc, apex (or RISING AT TARGET), d and h dimensioned
//   VIEW B — PLAN: aim at the virtual target (target − v·t); the robot's velocity carries the ball
//            the rest of the way, so it flies straight over the floor to the CELL
//   FIRE: the ball flies both views at ¼ speed while the robot moves v·τ (reduced motion: it lands)
// Then the maths with the live numbers, and the real code marking the path this solve took.

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Scramble, TextReveal } from "@/components/motion";
import { Armed } from "@/components/code/armed";
import { apexOf, ballPosition, solve, type SolveInput } from "@/lib/ballistics";
import { RangeRuler } from "@/components/watermelon/run-widget";
import { HaloSegmented } from "@/components/ui/halo-segmented";
import { fmtFixed, fmtInt, fmtSigned, toDeg } from "@/lib/format";
import { useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import {
  AIM_Z_IN,
  MUZZLE,
  RANGE_MAX,
  RANGE_MIN,
  SPEED_MAX,
  ballKind,
  diameterOf,
  efficiencyOf,
  javaFailReason,
  traceSolve,
  type BallChoice,
} from "../solver-math";
import { r3, sampleFlight, strobe, vx as viewX, vy as viewY, vz as viewZ } from "./geometry";
import { Formulas } from "./formulas";
import { Readouts } from "./readouts";
import { SolverCode, type ExcerptView } from "./solver-code";
import { SpeedSlider } from "./speed-slider";
import { ElevationView, PlanView } from "./views";

const SLOWMO = 0.25;

const PRESETS: { id: string; label: string; vx: number; vy: number }[] = [
  { id: "still", label: "Standing", vx: 0, vy: 0 },
  { id: "strafe", label: "Strafe left 30", vx: 0, vy: 30 },
  { id: "in", label: "Drive in 30", vx: 30, vy: 0 },
  { id: "away", label: "Back away 30", vx: -30, vy: 0 },
];

export interface SolverLabProps {
  excerpts: { solver: ExcerptView; rpm: ExcerptView; balltype: ExcerptView };
  /** DOM id prefix (hidden routes stay mounted). */
  idPrefix?: string;
}

export function SolverLab({ excerpts, idPrefix = "code-solver" }: SolverLabProps) {
  const mounted = useMounted();
  const reduce = (useReducedMotion() ?? false) && mounted; // after mount → hydration-safe
  const [range, setRange] = useState(96);
  const [vx, setVx] = useState(0);
  const [vy, setVy] = useState(30);
  const [ball, setBall] = useState<BallChoice>("POLLEN");
  const [flight, setFlight] = useState<"idle" | "flying" | "landed">("idle");

  const d = useMemo(() => {
    const input: SolveInput = {
      muzzle: MUZZLE,
      target: { x: range, y: 0, z: AIM_Z_IN },
      robotVel: { x: vx, y: vy },
      ball: ballKind(ball),
    };
    const sol = solve(input);
    const trace = traceSolve(input);
    const apex = apexOf(input, sol);
    return {
      input,
      sol,
      trace,
      apex,
      samples: sampleFlight(input, sol),
      ticks: strobe(input, sol),
      reason: javaFailReason(sol, trace),
    };
  }, [range, vx, vy, ball]);

  // ── FIRE: one rAF loop moving the ball (and the robot) in both views via refs.
  const elevBall = useRef<SVGCircleElement>(null);
  const planBall = useRef<SVGCircleElement>(null);
  const elevRobot = useRef<SVGGElement>(null);
  const planRobot = useRef<SVGGElement>(null);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const place = (tau: number, visible: boolean) => {
    const p = ballPosition(d.input, d.sol, tau);
    const v = d.input.robotVel ?? { x: 0, y: 0 };
    elevBall.current?.setAttribute("cx", String(viewX(p.x)));
    elevBall.current?.setAttribute("cy", String(viewZ(p.z)));
    planBall.current?.setAttribute("cx", String(viewX(p.x)));
    planBall.current?.setAttribute("cy", String(viewY(p.y)));
    elevBall.current?.setAttribute("opacity", visible ? "1" : "0");
    planBall.current?.setAttribute("opacity", visible ? "1" : "0");
    elevRobot.current?.setAttribute("transform", `translate(${r3(v.x * tau)} 0)`);
    planRobot.current?.setAttribute("transform", `translate(${r3(v.x * tau)} ${r3(-v.y * tau)})`);
  };

  const reset = () => {
    cancelAnimationFrame(raf.current);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    for (const el of [elevBall.current, planBall.current]) el?.setAttribute("opacity", "0");
    for (const el of [elevRobot.current, planRobot.current]) el?.removeAttribute("transform");
  };

  // Any change to the shot cancels a flight in progress (the cleanup runs before the next shot).
  useEffect(() => {
    const balls = [elevBall.current, planBall.current];
    const robots = [elevRobot.current, planRobot.current];
    const frame = raf;
    const pending = timer;
    return () => {
      cancelAnimationFrame(frame.current);
      if (pending.current) clearTimeout(pending.current);
      pending.current = null;
      for (const el of balls) el?.setAttribute("opacity", "0");
      for (const el of robots) el?.removeAttribute("transform");
    };
  }, [d]);

  const fire = () => {
    if (!d.sol.valid) return;
    reset();
    const T = d.sol.flightTimeSec;
    if (reduce) {
      place(T, true);
      setFlight("landed");
      timer.current = setTimeout(() => {
        reset();
        setFlight("idle");
      }, 1600);
      return;
    }
    setFlight("flying");
    let start = -1;
    const step = (now: number) => {
      if (start < 0) start = now;
      const tau = Math.min(T, ((now - start) / 1000) * SLOWMO);
      place(tau, true);
      if (tau < T) {
        raf.current = requestAnimationFrame(step);
      } else {
        setFlight("landed");
        timer.current = setTimeout(() => {
          reset();
          setFlight("idle");
        }, 900);
      }
    };
    raf.current = requestAnimationFrame(step);
  };

  const flightState = flight;
  const { sol, trace, apex } = d;
  const isPollen = ball === "POLLEN";
  // Announce state changes only (valid ↔ which failure), never every slider step.
  const statusKey = sol.valid ? "Solution valid." : `No solution: ${d.reason.split(":")[0].split("(")[0].trim()}.`;

  const describe = sol.valid
    ? `Shot to a CELL ${fmtFixed(range, 0)} inches away and ${AIM_Z_IN} inches up${vx || vy ? `, robot moving ${fmtSigned(vx, 0)} inches per second forward and ${fmtSigned(vy, 0)} sideways` : ", robot standing still"}. The turret aims ${fmtSigned(toDeg(sol.turretAngleRad), 1)} degrees at a virtual target ${fmtFixed(sol.virtualDistanceIn, 1)} inches away; the ball flies ${fmtFixed(sol.flightTimeSec, 3)} seconds at ${fmtInt(sol.flywheelRpm)} rpm.`
    : `No solution: ${d.reason}`;

  return (
    <div className="min-w-0">
      <div className="grid gap-x-[var(--gutter)] gap-y-10 lg:grid-cols-12">
        {/* ── the drawing ─────────────────────────────────────────────── */}
        <Armed effect="plot" className="min-w-0 lg:col-span-8" inset={0.2}>
        <figure className="min-w-0 border border-hairline bg-surface-1" aria-labelledby={`${idPrefix}-fig-title`}>
          <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-hairline px-4 py-2.5">
            <span id={`${idPrefix}-fig-title`} className="font-mono text-[11px] tracking-[0.1em] text-fg uppercase">
              Fig. 4 · One shot, two views
            </span>
            <span className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">True scale · views aligned on range</span>
          </figcaption>
          <div className="px-3 pt-4 pb-2 sm:px-5" role="img" aria-label={describe}>
            <p className="mb-1 font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">A · Elevation</p>
            <ElevationView
              input={d.input}
              sol={sol}
              samples={d.samples}
              ticks={d.ticks}
              apex={apex}
              bracketFailed={trace.bracketFailed}
              ballDiameter={diameterOf(ball)}
              isPollen={isPollen}
              ballRef={elevBall}
              robotRef={elevRobot}
            />
            <div className="mt-8 mb-1 flex items-baseline justify-between gap-4">
              <p className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">B · Plan, looking down</p>
              <p className="font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase max-sm:hidden">+Y left · +X toward the CELL</p>
            </div>
            <PlanView
              input={d.input}
              sol={sol}
              samples={d.samples}
              ticks={d.ticks}
              apex={apex}
              bracketFailed={trace.bracketFailed}
              ballDiameter={diameterOf(ball)}
              isPollen={isPollen}
              ballRef={planBall}
              robotRef={planRobot}
            />
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-hairline px-4 py-3 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">
            <li className="flex items-center gap-2">
              <svg width="22" height="6" aria-hidden="true" className="text-fg">
                <line x1="0" x2="22" y1="3" y2="3" stroke="currentColor" />
              </svg>
              Ball
            </li>
            <li className="flex items-center gap-2">
              <svg width="22" height="6" aria-hidden="true" className="text-fg">
                <line x1="0" x2="22" y1="3" y2="3" stroke="currentColor" strokeDasharray="4 3" />
              </svg>
              Turret aim
            </li>
            <li className="flex items-center gap-2">
              <svg width="22" height="6" aria-hidden="true" className="text-fg-muted">
                <line x1="0" x2="22" y1="3" y2="3" stroke="currentColor" strokeDasharray="1 2.5" />
              </svg>
              v·t the robot adds
            </li>
            <li className="flex items-center gap-2">
              <svg width="22" height="6" aria-hidden="true" className="text-fg-muted">
                <circle cx="5" cy="3" r="1.4" fill="currentColor" />
                <circle cx="17" cy="3" r="1.4" fill="currentColor" />
              </svg>
              Every 50 ms
            </li>
          </ul>
        </figure>
        </Armed>

        {/* ── controls + answer ───────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-4">
          <RangeRuler value={range} onValueChange={setRange} min={RANGE_MIN} max={RANGE_MAX} label="Range to the CELL" />

          <div className="grid gap-5">
            <SpeedSlider label="Forward · vx" plus="toward the CELL" minus="away" value={vx} onChange={setVx} max={SPEED_MAX} />
            <SpeedSlider label="Strafe · vy" plus="left" minus="right" value={vy} onChange={setVy} max={SPEED_MAX} />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Velocity presets">
              {PRESETS.map((p) => {
                const on = p.vx === vx && p.vy === vy;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setVx(p.vx);
                      setVy(p.vy);
                    }}
                    className={cn(
                      "h-8 rounded-sm border px-2.5 font-mono text-[10.5px] tracking-[0.06em] uppercase transition-colors duration-[120ms]",
                      on ? "border-border-ui bg-surface-2 text-fg" : "border-hairline text-fg-muted hover:border-border-ui hover:text-fg",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <HaloSegmented
              size="sm"
              aria-label="Ball"
              items={[
                { value: "POLLEN", label: "Pollen" },
                { value: "NECTAR", label: "Nectar" },
              ]}
              value={ball}
              onValueChange={(v) => setBall(v as BallChoice)}
            />
            <button
              type="button"
              onClick={fire}
              disabled={!sol.valid || flightState === "flying"}
              className="group/fire inline-flex h-11 items-center gap-2.5 rounded-sm border border-border-ui bg-surface-2 px-4 font-sans text-[14px] font-medium text-fg transition-[background-color,color,border-color] duration-[120ms] ease-out hover:border-pollen-edge hover:bg-pollen hover:text-pollen-ink focus-visible:border-pollen-edge focus-visible:bg-pollen focus-visible:text-pollen-ink disabled:pointer-events-none disabled:opacity-40"
            >
              <span aria-hidden="true" className="size-2 rounded-full border border-current" />
              {flightState === "flying" ? "In flight…" : "Fire"}
              <span className="font-mono text-[10px] tracking-[0.06em] uppercase opacity-70">{reduce ? "lands at once" : "¼ speed"}</span>
            </button>
          </div>

          <Readouts sol={sol} apex={apex} reason={d.reason} />
          <p className="sr-only" role="status" aria-live="polite">
            {flightState === "landed" ? `Landed after ${fmtFixed(sol.flightTimeSec, 2)} seconds.` : statusKey}
          </p>
        </div>
      </div>

      {/* ── the maths ───────────────────────────────────────────────────── */}
      <div className="mt-16">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <TextReveal as="h3" className="type-h3" text="The maths, with these numbers." mode="words" />
          <p className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">θ = 40° hood · g = 386.1 in/s² · d = virtual distance</p>
        </div>
        <Formulas sol={sol} trace={trace} efficiency={efficiencyOf(ball)} />
      </div>

      {/* ── the code ────────────────────────────────────────────────────── */}
      <div className="mt-16">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <TextReveal as="h3" className="type-h3" text="The code, following along." mode="words" />
          <Scramble className="font-mono text-[10px] tracking-[0.1em] whitespace-pre-wrap text-fg-muted uppercase" as="p" text="Verbatim from the repo · trimmed where marked ⋮" />
        </div>
        <SolverCode {...excerpts} sol={sol} trace={trace} ball={ball} efficiency={efficiencyOf(ball)} />
      </div>
    </div>
  );
}
