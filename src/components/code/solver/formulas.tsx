"use client";

// The solver's three steps (docs/03-ARCHITECTURE.md; Ballistics.java), each written out with the
// live numbers substituted — the same d and h that are dimensioned in the drawing above.
//   t   = √(2(d·tanθ − h)/g)      flight time falls out of the geometry when the hood is fixed
//   v   = (d / t) / cosθ          muzzle speed
//   rpm = 60·v / (η·π·D)          flywheel speed for THIS ball (η: transfer efficiency, BallType)

import type { ReactNode } from "react";
import { Stagger, StaggerItem } from "@/components/code/motion-safe";
import { G_IN_S2, SHOOTER, type Solution } from "@/lib/ballistics";
import { fmtFixed, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Trace } from "../solver-math";

function N({ children }: { children: ReactNode }) {
  return <span className="text-fg">{children}</span>;
}

function Card({
  index,
  label,
  formula,
  work,
  result,
  failed,
  className,
}: {
  index: string;
  label: string;
  formula: ReactNode;
  work: ReactNode;
  result: ReactNode;
  failed?: boolean;
  className?: string;
}) {
  return (
    <StaggerItem className={cn("flex min-w-0 flex-col bg-bg p-5 sm:p-6", className)}>
      <p className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">
        <span className="text-fg">{index}</span> · {label}
      </p>
      <p className="mt-4 font-mono text-[17px] leading-7 text-fg sm:text-[19px]">{formula}</p>
      <p className="mt-3 font-mono text-[12px] leading-6 [overflow-wrap:anywhere] text-fg-muted">{work}</p>
      <p className={cn("mt-auto border-t border-hairline pt-3 font-mono text-[13px] tabular-nums", failed ? "text-fg-muted" : "text-fg")}>{result}</p>
    </StaggerItem>
  );
}

export function Formulas({ sol, trace, efficiency, className }: { sol: Solution; trace: Trace; efficiency: number; className?: string }) {
  const last = trace.passes[trace.passes.length - 1];
  const d = last?.d ?? sol.virtualDistanceIn;
  const tan = trace.tanTheta;
  const cos = trace.cosTheta;
  const h = trace.h;
  const bracket = d * tan - h;
  const hasT = !trace.bracketFailed && sol.flightTimeSec > 0;
  const t = sol.flightTimeSec;
  const v = sol.muzzleSpeedIn;
  const rpm = sol.flywheelRpm;
  const over = hasT && rpm > SHOOTER.maxFlywheelRpm;

  return (
    <Stagger className={cn("grid gap-px border border-hairline bg-hairline md:grid-cols-3", className)}>
      <Card
        index="01"
        label="Flight time · fixed hood"
        formula={
          <>
            t = √(2(d·tanθ − h) / g)
          </>
        }
        work={
          <>
            = √(2(<N>{fmtFixed(d, 1)}</N> × <N>{fmtFixed(tan, 3)}</N> − <N>{fmtFixed(h, 1)}</N>) / <N>{fmtFixed(G_IN_S2, 1)}</N>)
          </>
        }
        result={
          hasT ? (
            <>
              t = {fmtFixed(t, 3)} s<span className="text-fg-muted"> · after {sol.iterations} passes</span>
            </>
          ) : (
            <>d·tanθ − h = {fmtFixed(bracket, 1)} ≤ 0 → no shot at 40°. Back up.</>
          )
        }
        failed={!hasT}
      />
      <Card
        index="02"
        label="Muzzle speed"
        formula={<>v = (d / t) / cosθ</>}
        work={
          hasT ? (
            <>
              = (<N>{fmtFixed(d, 1)}</N> / <N>{fmtFixed(t, 3)}</N>) / <N>{fmtFixed(cos, 3)}</N>
            </>
          ) : (
            <>needs a flight time</>
          )
        }
        result={hasT ? <>v = {fmtFixed(v, 1)} in/s</> : <>—</>}
        failed={!hasT}
      />
      <Card
        index="03"
        label="Flywheel · this ball"
        formula={<>rpm = 60·v / (η·π·D)</>}
        work={
          hasT ? (
            <>
              = 60 × <N>{fmtFixed(v, 1)}</N> / (<N>{fmtFixed(efficiency, 2)}</N> × π × <N>{fmtFixed(SHOOTER.flywheelDiameterIn, 1)}</N>)
            </>
          ) : (
            <>needs a muzzle speed</>
          )
        }
        result={
          hasT ? (
            over ? (
              <>
                rpm = {fmtInt(rpm)} &gt; {fmtInt(SHOOTER.maxFlywheelRpm)} max · out of range
              </>
            ) : (
              <>rpm = {fmtInt(rpm)}</>
            )
          ) : (
            <>—</>
          )
        }
        failed={!hasT || over}
      />
    </Stagger>
  );
}
