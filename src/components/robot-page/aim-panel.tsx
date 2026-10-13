"use client";

// AIM playground (DESIGN_SPEC §5 ROBOT): watermelon run-widget (RANGE TO HIVE ruler), knob-slider
// (turret dial, ±170° with the hatched dead zone) and gauge (flywheel RPM + READY band) drive the
// 3D robot and the team's own solver. The feeder obeys the four gates of AimController
// .isReadyToFire(); the status line is getReadinessText(), word for word.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Gauge } from "@/components/ui/gauge";
import KnobSlider from "@/components/watermelon/knob-slider";
import RangeRuler from "@/components/watermelon/run-widget";
import { Magnetic, RollText, TextReveal } from "@/components/motion";
import { Button, ButtonLink } from "@/components/site/button";
import { Rise } from "./rise";
import { RobotTag } from "./tag";
import { fmtFixed, fmtInt } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { AIM_DEFAULTS, AIM_RANGE, CAMERA_HFOV_DEG, CELL_AIM_Z_IN, RC, aimGeometry, aimHeadingDeg, readinessText, type Gates } from "./data";
import { IDLE_READOUT, type RobotPageStore } from "./store";

const DEG = Math.PI / 180;

const GATE_ROWS: { key: keyof Gates; label: string; source: string }[] = [
  { key: "solution", label: "Solution", source: "in range · turret can reach" },
  { key: "onTarget", label: "On target", source: `turret within ±${RC.turretToleranceDeg}°` },
  { key: "atSpeed", label: "At speed", source: `±${RC.rpmTolerance} rpm for ${RC.readyStableSec} s` },
  { key: "fresh", label: "HIVE fresh", source: `seen < ${RC.maxEstimateAgeSec} s ago` },
];

/** The coarse state for screen readers (announced only when it changes). */
function srState(ready: boolean, readiness: string) {
  if (ready) return "Ready to fire.";
  if (readiness.startsWith("NO TARGET")) return "Not ready: the webcam has lost the HIVE.";
  if (readiness.startsWith("NO SOLUTION")) return "Not ready: no ballistic solution at this range.";
  if (readiness.startsWith("TURRET")) return "Not ready: turret settling.";
  if (readiness.startsWith("SPINNING")) return "Not ready: flywheel spinning up.";
  return "Aiming.";
}

export function AimPanel({ store }: { store: RobotPageStore }) {
  const [range, setRange] = useState<number>(AIM_DEFAULTS.rangeIn);
  const [turret, setTurret] = useState<number>(AIM_DEFAULTS.turretDeg);
  const live = useSyncExternalStore(store.subscribe, store.getReadout, () => IDLE_READOUT);
  const narrow = useMediaQuery("(max-width: 430px)");
  const [localShot, setLocalShot] = useState<{ ok: boolean; text: string; seq: number } | null>(null);

  useEffect(() => {
    store.setAim(range, turret);
  }, [store, range, turret]);

  // The solver for the steady state (what the robot settles to). The 3D scene runs the same
  // function every frame and adds the dynamics: turret slew, flywheel ramp, webcam freshness.
  const geo = useMemo(() => aimGeometry(range, aimHeadingDeg(turret) * DEG), [range, turret]);
  const sol = geo.solution;
  const camSees = Math.abs(turret) <= CAMERA_HFOV_DEG / 2;
  const steady: Gates = { solution: sol.valid, onTarget: sol.valid, atSpeed: sol.valid, fresh: camSees };
  const gates = live.live ? live.gates : steady;
  const ready = live.live ? live.ready : gates.solution && gates.onTarget && gates.atSpeed && gates.fresh;
  const readiness = live.live ? live.readiness : readinessText(steady, sol, 0, 0);
  const rpmTarget = sol.valid ? sol.flywheelRpm : live.live ? live.rpmTarget : 0;
  const rpmNow = live.live ? live.rpmNow : rpmTarget;
  const shot = live.live ? live.lastShot : localShot;

  const fire = () => {
    store.fire();
    if (!live.live) {
      const seq = (localShot?.seq ?? 0) + 1;
      setLocalShot(ready ? { ok: true, text: `IN · TOF ${fmtFixed(sol.flightTimeSec, 2)} s`, seq } : { ok: false, text: `HELD — ${readiness}`, seq });
    }
  };

  const gateDetail = (key: keyof Gates): string => {
    switch (key) {
      case "solution":
        return sol.valid ? `${fmtInt(sol.flywheelRpm)} rpm · ${fmtFixed(sol.flightTimeSec, 2)} s` : "no solution";
      case "onTarget":
        return gates.onTarget ? "settled" : "slewing";
      case "atSpeed":
        return `${fmtInt(rpmNow)} / ${fmtInt(rpmTarget)} rpm`;
      case "fresh":
        if (live.live) return live.seen ? "webcam sees it" : `odometry · ${fmtFixed(Math.min(live.estimateAge, 9.9), 1)} s`;
        return camSees ? "webcam sees it" : "out of view";
    }
  };

  const dial = narrow ? 168 : 196;
  const gaugeSize = narrow ? 148 : 172;

  return (
    <div>
      <RobotTag code="09" label="AIM" />
      <TextReveal as="h2" id="robot-aim-title" text="Aim it yourself." className="type-h2 mt-6" />
      <p className="type-body mt-4 text-fg-muted">
        Pick a range and a turret angle. The solver — the same maths as the team&apos;s{" "}
        <span className="font-mono text-[0.88em]">Ballistics.java</span> — chooses the flywheel speed, and the feeder only lets a ball go when
        all four gates of <span className="font-mono text-[0.88em]">isReadyToFire()</span> agree.
      </p>

      <RangeRuler className="mt-10" value={range} onValueChange={setRange} min={AIM_RANGE.min} max={AIM_RANGE.max} label="Range to HIVE">
        <dl className="text-right font-mono text-[11px] leading-5 tracking-[0.06em] uppercase">
          <div>
            <dt className="inline text-fg-muted">TOF </dt>
            <dd className="inline text-fg tabular-nums">{sol.valid ? `${fmtFixed(sol.flightTimeSec, 2)} s` : "—"}</dd>
          </div>
          <div>
            <dt className="inline text-fg-muted">Flywheel </dt>
            <dd className="inline text-fg tabular-nums">{sol.valid ? `${fmtInt(sol.flywheelRpm)} rpm` : "—"}</dd>
          </div>
          <div>
            <dt className="inline text-fg-muted">Apex </dt>
            <dd className="inline text-fg tabular-nums">{!sol.valid ? "—" : geo.apexZIn === null ? "rising at CELL" : `${fmtFixed(geo.apexZIn, 1)} in`}</dd>
          </div>
        </dl>
      </RangeRuler>

      <div className="mt-10 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 sm:gap-x-8">
        <div className="relative">
          <KnobSlider value={turret} onChange={setTurret} size={dial} label="Turret" />
          {/* Webcam 1 is fixed to the chassis: it only sees ±27° either side of FWD */}
          <svg viewBox="0 0 100 100" aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 text-fg-muted" style={{ width: dial, height: dial }}>
            {[-1, 1].map((s) => {
              const a = (s * CAMERA_HFOV_DEG) / 2;
              const rad = (a - 90) * DEG;
              return (
                <line
                  key={s}
                  x1={(50 + 31.5 * Math.cos(rad)).toFixed(3)}
                  y1={(50 + 31.5 * Math.sin(rad)).toFixed(3)}
                  x2={(50 + 49 * Math.cos(rad)).toFixed(3)}
                  y2={(50 + 49 * Math.sin(rad)).toFixed(3)}
                  stroke="currentColor"
                  strokeWidth={0.6}
                  strokeDasharray="1.6 1.4"
                />
              );
            })}
          </svg>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-3 pt-2">
          <Gauge
            value={rpmNow}
            min={0}
            max={RC.maxRpm}
            size={gaugeSize}
            unit="RPM"
            label="Flywheel"
            ticks={10}
            band={sol.valid ? { from: sol.flywheelRpm - RC.rpmTolerance, to: sol.flywheelRpm + RC.rpmTolerance } : undefined}
            aria-label="Flywheel speed"
          />
          <p className="max-w-[24ch] text-center font-mono text-[10px] leading-4 tracking-[0.06em] text-fg-muted uppercase">
            Band = ready window ±{RC.rpmTolerance} rpm · ramp {fmtInt(RC.rpmRampPerSec)} rpm/s
          </p>
        </div>
      </div>
      <p className="mt-3 font-mono text-[10px] leading-4 tracking-[0.06em] text-fg-muted uppercase">
        Dashed: Webcam 1&apos;s view, ±{fmtFixed(CAMERA_HFOV_DEG / 2, 1)}° (fixed to the chassis)
      </p>

      {/* the four gates */}
      <h3 className="sr-only">Fire gates</h3>
      <Rise as="ul" className="mt-8 grid grid-cols-2 gap-px border border-hairline bg-hairline sm:grid-cols-4">
        {GATE_ROWS.map((g) => {
          const on = gates[g.key];
          return (
            <li key={g.key} className="bg-bg px-3 py-3">
              <p className="flex items-center gap-2 font-mono text-[10px] leading-4 tracking-[0.08em] uppercase">
                <span
                  aria-hidden="true"
                  className={cn("size-1.5 shrink-0 rounded-full transition-colors duration-[120ms]", on ? "bg-fg" : "bg-transparent ring-1 ring-border-ui")}
                />
                <span className={on ? "text-fg" : "text-fg-muted"}>{g.label}</span>
                <span className="sr-only">{on ? ": pass" : ": fail"}</span>
              </p>
              <p className="mt-1 font-mono text-[10px] leading-4 text-fg-muted tabular-nums [overflow-wrap:anywhere]">{gateDetail(g.key)}</p>
              <p className="font-mono text-[10px] leading-4 text-fg-muted/70">{g.source}</p>
            </li>
          );
        })}
      </Rise>

      {/* status + fire */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-4">
        <Magnetic>
          <Button onClick={fire} size="lg" aria-describedby="robot-aim-status">
            <RollText>Fire POLLEN</RollText>
          </Button>
        </Magnetic>
        <div className="min-w-0 flex-1">
          <p id="robot-aim-status" className="flex items-center gap-2 font-mono text-[11px] leading-5 tracking-[0.06em] uppercase">
            <span
              className={cn(
                "inline-flex h-5 items-center rounded-sm border px-1.5 text-[10px] tracking-[0.08em] transition-colors duration-[120ms]",
                ready ? "border-pollen-edge bg-pollen text-pollen-ink" : "border-hairline text-fg-muted",
              )}
            >
              {ready ? "Ready" : "Not ready"}
            </span>
            <span className={cn("min-w-0 [overflow-wrap:anywhere]", ready ? "text-fg" : "text-fg-muted")}>{ready ? "all four gates agree" : readiness}</span>
          </p>
          <p className="mt-1 min-h-5 font-mono text-[11px] leading-5 tracking-[0.06em] uppercase">
            {shot ? (
              <span key={shot.seq} className={cn("animate-in fade-in-0 duration-200", shot.ok ? "text-fg" : "text-fg-muted")}>
                {shot.text}
              </span>
            ) : (
              <span className="text-fg-muted">Feeder idle · {live.shots} shot{live.shots === 1 ? "" : "s"}</span>
            )}
          </p>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {srState(ready, readiness)}
      </p>

      <p className="mt-10 max-w-[60ch] border-t border-hairline pt-4 text-[13px] leading-6 text-fg-muted">
        Standing still, the solver converges in 2 passes; while strafing it typically takes 4–6 (max 6). The CELL aim point is the centre of
        the upward opening in our HIVE model, {fmtFixed(CELL_AIM_Z_IN, 1)} in up; the hood, flywheel, limits and gates are the robot&apos;s own.
        In 3D the ball flies at half speed so you can follow it.
      </p>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <ButtonLink href="/lab/robot" variant="secondary">
          <RollText>Open the Robot Lab</RollText>
        </ButtonLink>
        <span className="font-mono text-[10px] leading-4 tracking-[0.06em] text-fg-muted uppercase">
          The model on its own bench · orbit, explode, change the look
        </span>
      </div>
    </div>
  );
}
