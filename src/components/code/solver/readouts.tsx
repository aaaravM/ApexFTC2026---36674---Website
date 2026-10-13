"use client";

// The solver's answer, one field per readout — every number maps 1:1 to a Ballistics.Solution field
// (or apexOf()). Flywheel RPM gets a scale with the 5000 RPM clamp and the 1600–2900 RPM band the
// game lives in (RobotConstants.Shoot comment); its needle is the only yellow here.

import type { Solution } from "@/lib/ballistics";
import { SHOOTER } from "@/lib/ballistics";
import { RollingNumber } from "@/components/ui/rolling-number";
import { fmtFixed, fmtInt, fmtSigned, toDeg } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GAME_RPM_BAND, MAX_PASSES } from "../solver-math";

const RPM_SCALE = 6000;

function Cell({ label, value, unit, note, className }: { label: string; value: string; unit?: string; note?: string; className?: string }) {
  return (
    <div className={cn("min-w-0 border-t border-hairline pt-2.5 pb-3", className)}>
      <dt className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">{label}</dt>
      <dd className="mt-1 font-mono text-[15px] leading-6 text-fg tabular-nums">
        {value}
        {unit && <span className="ml-1 text-[11px] text-fg-muted">{unit}</span>}
        {note && <span className="block text-[10px] leading-4 tracking-[0.06em] text-fg-muted uppercase">{note}</span>}
      </dd>
    </div>
  );
}

export interface ReadoutsProps {
  sol: Solution;
  apex: { time: number; z: number };
  /** Java-worded failReason when invalid. */
  reason: string;
  className?: string;
}

export function Readouts({ sol, apex, reason, className }: ReadoutsProps) {
  const hasNumbers = sol.flightTimeSec > 0;
  const rpm = hasNumbers ? sol.flywheelRpm : 0;
  const pos = (r: number) => `${Math.min(100, (r / RPM_SCALE) * 100)}%`;
  const apexAfter = apex.time > sol.flightTimeSec;

  return (
    <div className={cn("min-w-0", className)}>
      {/* status */}
      <div
        className={cn(
          "flex items-start justify-between gap-4 border px-4 py-3",
          sol.valid ? "border-border-ui" : "hatch border-dashed border-hairline-strong text-fg-muted",
        )}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase">
            <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", sol.valid ? "bg-fg" : "bg-border-ui")} />
            <span className="text-fg">{sol.valid ? "Solution · valid" : "No solution"}</span>
          </p>
          {!sol.valid && <p className="mt-1.5 font-mono text-[11.5px] leading-5 [overflow-wrap:anywhere] text-fg">{reason}</p>}
        </div>
        <p className="shrink-0 font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase tabular-nums">
          Iter <span className="text-fg">{sol.iterations}</span>/{MAX_PASSES}
        </p>
      </div>

      {/* flywheel */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="type-label text-fg-muted">Flywheel</p>
          <p className="font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">rpm = 60·v / (η·π·D)</p>
        </div>
        <p className="mt-1 flex items-baseline gap-2">
          <RollingNumber value={Math.round(rpm)} format={fmtInt} label="Flywheel RPM" className="type-figure text-[clamp(40px,4.4vw,60px)]" />
          <span className="font-mono text-[12px] tracking-[0.06em] text-fg-muted uppercase">rpm</span>
        </p>
        <div className="relative mt-3 h-8" aria-hidden="true">
          <span className="absolute inset-x-0 top-3 h-px bg-border-ui" />
          <span className="hatch absolute top-1.5 h-3 text-fg-muted" style={{ left: pos(GAME_RPM_BAND.from), width: `${((GAME_RPM_BAND.to - GAME_RPM_BAND.from) / RPM_SCALE) * 100}%` }} />
          {[0, 1000, 2000, 3000, 4000, 5000, 6000].map((t) => (
            <span key={t} className="absolute top-1.5 h-3 w-px -translate-x-1/2 bg-border-ui" style={{ left: pos(t) }} />
          ))}
          <span className="absolute top-0 h-[22px] w-px -translate-x-1/2 bg-fg" style={{ left: pos(SHOOTER.maxFlywheelRpm) }} />
          {hasNumbers && (
            <span
              className="absolute top-0 h-[22px] w-[3px] -translate-x-1/2 bg-pollen-line transition-[left] duration-[220ms] ease-out motion-reduce:transition-none"
              style={{ left: pos(rpm) }}
            />
          )}
          <span className="absolute top-5 left-0 font-mono text-[10px] text-fg-muted">0</span>
          <span className="absolute top-5 -translate-x-1/2 font-mono text-[10px] whitespace-nowrap text-fg-muted" style={{ left: pos((GAME_RPM_BAND.from + GAME_RPM_BAND.to) / 2) }}>
            game band
          </span>
          <span className="absolute top-5 -translate-x-1/2 font-mono text-[10px] whitespace-nowrap text-fg" style={{ left: pos(SHOOTER.maxFlywheelRpm) }}>
            max 5,000
          </span>
        </div>
      </div>

      {/* the rest of the Solution */}
      <dl className="mt-5 grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        <Cell label="Time of flight" value={hasNumbers ? fmtFixed(sol.flightTimeSec, 3) : "—"} unit="s" />
        <Cell label="Muzzle speed" value={hasNumbers ? fmtFixed(sol.muzzleSpeedIn, 1) : "—"} unit="in/s" />
        <Cell label="Turret" value={hasNumbers ? `${fmtSigned(toDeg(sol.turretAngleRad), 1)}°` : "—"} note="robot frame" />
        <Cell label="Range" value={fmtFixed(sol.actualDistanceIn, 1)} unit="in" note="to the CELL" />
        <Cell label="Virtual d" value={fmtFixed(sol.virtualDistanceIn, 1)} unit="in" note="what we aim at" />
        <Cell label="Lead" value={hasNumbers ? `${fmtSigned(toDeg(sol.leadAngleRad), 1)}°` : "—"} />
        <Cell
          label="Apex"
          value={!sol.valid ? "—" : apexAfter ? "Rising" : fmtFixed(apex.z, 1)}
          unit={sol.valid && !apexAfter ? "in" : undefined}
          note={!sol.valid ? undefined : apexAfter ? "still climbing at the CELL" : `at ${fmtFixed(apex.time, 3)} s`}
          className="col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1"
        />
      </dl>
    </div>
  );
}
