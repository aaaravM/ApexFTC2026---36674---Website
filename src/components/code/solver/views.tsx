"use client";

// VIEW A — ELEVATION and VIEW B — PLAN of one shot, drawn from the solver's numbers.
// Both views share the horizontal scale (geometry.ts), so the CELL, the apex and every 50 ms tick
// line up vertically between them. Geometry is SVG (hairlines, true scale); text is HTML laid over
// it at fixed pixel sizes so it stays legible at 390 px.

import type { Ref } from "react";
import type { Solution, SolveInput } from "@/lib/ballistics";
import { fmtFixed, fmtSigned, toDeg } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AIM_Z_IN, MUZZLE } from "../solver-math";
import {
  CELL,
  EH,
  PH,
  ROBOT,
  W,
  X1,
  Y_BOT,
  Y_TOP,
  arrowHead,
  clampX,
  clampY,
  elevPath,
  pctX,
  pctY,
  pctZ,
  planPath,
  r3,
  vx,
  vy,
  vz,
  type Sample,
} from "./geometry";

const HAIR = { vectorEffect: "non-scaling-stroke" as const, strokeWidth: 1, fill: "none" };

function Label({
  x,
  y,
  children,
  className,
  align = "center",
}: {
  x: string;
  y: string;
  children: React.ReactNode;
  className?: string;
  align?: "center" | "left" | "right";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute font-mono text-[10px] leading-4 tracking-[0.08em] whitespace-nowrap uppercase",
        align === "center" && "-translate-x-1/2",
        align === "right" && "-translate-x-full",
        className,
      )}
      style={{ left: x, top: y }}
    >
      {children}
    </span>
  );
}

export interface ViewProps {
  input: SolveInput;
  sol: Solution;
  /** Flight samples (launch → arrival). */
  samples: Sample[];
  /** 50 ms strobe ticks. */
  ticks: Sample[];
  apex: { time: number; x: number; y: number; z: number };
  /** True when no shot exists at this hood angle (d·tanθ − h ≤ 0). */
  bracketFailed: boolean;
  ballDiameter: number;
  isPollen: boolean;
  /** The ball the FIRE animation moves (cx/cy written directly, no re-render). */
  ballRef: Ref<SVGCircleElement>;
  /** The robot group the FIRE animation moves. */
  robotRef?: Ref<SVGGElement>;
}

// ─── VIEW A — ELEVATION ───────────────────────────────────────────────────────────────────────

export function ElevationView({ input, sol, samples, ticks, apex, bracketFailed, ballDiameter, isPollen, ballRef, robotRef }: ViewProps) {
  const R = input.target.x;
  const Z = input.target.z;
  const hasArc = samples.length > 1;
  const apexShown = sol.valid && apex.time <= sol.flightTimeSec;
  const risingAtTarget = sol.valid && apex.time > sol.flightTimeSec;
  const tan40 = Math.tan((40 * Math.PI) / 180);
  const launchEndX = Math.min(X1, R + 12);
  const dimZ = -10.5;
  const hX = Math.min(X1 - 4, R + CELL.halfX + 6);
  const feet = Array.from({ length: Math.floor((X1 - 4) / 12) + 1 }, (_, i) => i * 12);

  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${EH}` }}>
      <svg viewBox={`0 0 ${W} ${EH}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        {/* drafting grid: 1 ft */}
        <g className="text-hairline" stroke="currentColor">
          {feet.map((x) => (
            <line key={`g${x}`} x1={vx(x)} x2={vx(x)} y1={vz(72)} y2={vz(0)} {...HAIR} opacity={0.75} />
          ))}
          {[12, 24, 36, 48, 60, 72].map((z) => (
            <line key={`h${z}`} x1={vx(-18)} x2={vx(X1)} y1={vz(z)} y2={vz(z)} {...HAIR} opacity={0.75} />
          ))}
        </g>
        {/* floor + foot ticks */}
        <g className="text-fg" stroke="currentColor">
          <line x1={0} x2={W} y1={vz(0)} y2={vz(0)} {...HAIR} opacity={0.6} />
          {feet.map((x) => (
            <line key={`t${x}`} x1={vx(x)} x2={vx(x)} y1={vz(0)} y2={vz(-1.6)} {...HAIR} opacity={0.5} />
          ))}
        </g>

        {/* muzzle datum (h is measured from here) */}
        <line x1={vx(0)} x2={vx(clampX(R + CELL.halfX + 9))} y1={vz(MUZZLE.z)} y2={vz(MUZZLE.z)} {...HAIR} className="text-fg-muted" stroke="currentColor" strokeDasharray="1.5 2.5" opacity={0.55} />

        {/* robot (schematic side profile inside the 18 in start cube) */}
        <g ref={robotRef} className="text-fg" stroke="currentColor">
          <rect x={vx(ROBOT.x0)} y={vz(ROBOT.height)} width={ROBOT.x1 - ROBOT.x0} height={ROBOT.height} {...HAIR} strokeDasharray="1.2 2" opacity={0.45} />
          <circle cx={vx(-7.5)} cy={vz(2.05)} r={2.05} {...HAIR} opacity={0.7} />
          <circle cx={vx(3.5)} cy={vz(2.05)} r={2.05} {...HAIR} opacity={0.7} />
          <line x1={vx(ROBOT.x0 + 0.5)} x2={vx(ROBOT.x1 - 0.5)} y1={vz(4.6)} y2={vz(4.6)} {...HAIR} opacity={0.7} />
          {/* flywheel + hood at 40° up to the muzzle */}
          <circle cx={vx(-3.3)} cy={vz(10.9)} r={2} {...HAIR} opacity={0.7} />
          <line x1={vx(-6.4)} x2={vx(0)} y1={vz(8.6)} y2={vz(MUZZLE.z)} {...HAIR} opacity={0.85} />
          <line x1={vx(-2)} x2={vx(-2)} y1={vz(4.6)} y2={vz(8.4)} {...HAIR} opacity={0.5} />
        </g>
        <circle cx={vx(0)} cy={vz(MUZZLE.z)} r={0.75} className="fill-fg" />

        {/* 40° launch reference */}
        <g className="text-fg-muted" stroke="currentColor">
          <line x1={vx(0)} x2={vx(10)} y1={vz(MUZZLE.z)} y2={vz(MUZZLE.z)} {...HAIR} opacity={0.8} />
          <path
            d={`M${vx(7)} ${vz(MUZZLE.z)} A 7 7 0 0 0 ${vx(r3(7 * Math.cos((40 * Math.PI) / 180)))} ${vz(r3(MUZZLE.z + 7 * Math.sin((40 * Math.PI) / 180)))}`}
            {...HAIR}
          />
        </g>
        {bracketFailed && (
          <g className="text-fg" stroke="currentColor">
            <line
              x1={vx(0)}
              y1={vz(MUZZLE.z)}
              x2={vx(launchEndX)}
              y2={vz(r3(MUZZLE.z + launchEndX * tan40))}
              {...HAIR}
              strokeDasharray="3 2"
              opacity={0.8}
            />
          </g>
        )}

        {/* the flight */}
        {hasArc && (
          <g className="code-trace">
            <path
              d={elevPath(samples)}
              {...HAIR}
              stroke="currentColor"
              className={sol.valid ? "text-fg" : "text-fg-muted"}
              strokeDasharray={sol.valid ? undefined : "2.5 2"}
            />
          </g>
        )}
        {sol.valid && (
          <g className="code-late">
            {ticks.map((p) => (
              <circle key={p.t} cx={vx(clampX(p.x))} cy={vz(p.z)} r={0.55} className="fill-fg-muted" />
            ))}
          </g>
        )}

        {/* apex */}
        {apexShown && (
          <g className="code-late text-fg" stroke="currentColor">
            <line x1={vx(apex.x)} x2={vx(apex.x)} y1={vz(apex.z + 2.2)} y2={vz(apex.z - 2.2)} {...HAIR} />
            <line x1={vx(apex.x)} x2={vx(apex.x)} y1={vz(apex.z - 3)} y2={vz(0)} {...HAIR} strokeDasharray="0.8 2" opacity={0.5} />
          </g>
        )}

        {/* the CELL mouth at the aim height (stylised) */}
        <g className="text-fg" stroke="currentColor">
          <polyline
            points={`${vx(R - CELL.halfX)},${vz(Z + 0.01)} ${vx(R - CELL.halfX)},${vz(Z - CELL.depth)} ${vx(R + CELL.halfX)},${vz(Z - CELL.depth)} ${vx(R + CELL.halfX)},${vz(Z + 0.01)}`}
            {...HAIR}
          />
          <line x1={vx(R - 1.6)} x2={vx(R + 1.6)} y1={vz(Z)} y2={vz(Z)} {...HAIR} />
          <line x1={vx(R)} x2={vx(R)} y1={vz(Z - 1.6)} y2={vz(Z + 1.6)} {...HAIR} />
        </g>

        {/* RANGE dimension (actual distance, muzzle → CELL) */}
        <g className="text-fg-muted" stroke="currentColor">
          <line x1={vx(0)} x2={vx(0)} y1={vz(-0.8)} y2={vz(dimZ - 2)} {...HAIR} opacity={0.6} />
          <line x1={vx(R)} x2={vx(R)} y1={vz(Z - CELL.depth - 1)} y2={vz(dimZ - 2)} {...HAIR} strokeDasharray="1 2" opacity={0.6} />
          <line x1={vx(0)} x2={vx(R)} y1={vz(dimZ)} y2={vz(dimZ)} {...HAIR} />
          <path d={arrowHead({ x: vx(0), y: vz(dimZ) }, -1, 0, 2.6)} {...HAIR} />
          <path d={arrowHead({ x: vx(R), y: vz(dimZ) }, 1, 0, 2.6)} {...HAIR} />
        </g>

        {/* RISE dimension h (muzzle datum → aim point) */}
        <g className="text-fg-muted" stroke="currentColor">
          <line x1={vx(hX)} x2={vx(hX)} y1={vz(MUZZLE.z)} y2={vz(Z)} {...HAIR} />
          <path d={arrowHead({ x: vx(hX), y: vz(Z) }, 0, -1, 2.6)} {...HAIR} />
          <path d={arrowHead({ x: vx(hX), y: vz(MUZZLE.z) }, 0, 1, 2.6)} {...HAIR} />
          <line x1={vx(R + CELL.halfX + 1)} x2={vx(hX + 2)} y1={vz(Z)} y2={vz(Z)} {...HAIR} opacity={0.6} />
        </g>

        {/* the ball (FIRE) */}
        <circle
          ref={ballRef}
          cx={vx(0)}
          cy={vz(MUZZLE.z)}
          r={r3(ballDiameter / 2)}
          opacity={0}
          className={isPollen ? "fill-pollen stroke-pollen-edge" : "fill-bg stroke-fg"}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* labels */}
      {feet
        .filter((x) => x > 0 && x % 24 === 0)
        .map((x) => (
          <Label
            key={x}
            x={pctX(x)}
            y={pctZ(-1.8)}
            // phones: keep every 4 ft, minus any that would collide with the RANGE dimension
            className={cn("text-fg-muted", (x % 48 !== 0 || Math.abs(x - R / 2) < 34 || Math.abs(x - R) < 16) && "max-sm:hidden")}
          >
            {x / 12} ft
          </Label>
        ))}
      <Label x={pctX(R / 2)} y={`calc(${pctZ(dimZ)} - 8px)`} className="bg-surface-1 px-1.5 text-fg">
        Range {fmtFixed(R, 1)} in
      </Label>
      <Label x={`calc(${pctX(hX)} + 8px)`} y={`calc(${pctZ((MUZZLE.z + Z) / 2)} - 8px)`} align="left" className="text-fg">
        h {fmtFixed(Z - MUZZLE.z, 1)}
        <span className="max-sm:hidden"> in</span>
      </Label>
      <Label x={pctX(R)} y={`calc(${pctZ(Z - CELL.depth)} + 6px)`} className="text-fg-muted">
        CELL<span className="max-sm:hidden"> · {AIM_Z_IN} in (est.)</span>
      </Label>
      <Label x={`calc(${pctX(10)} + 4px)`} y={`calc(${pctZ(MUZZLE.z + 4)} - 8px)`} align="left" className="text-fg-muted max-sm:hidden">
        40°
      </Label>
      <Label x={pctX(ROBOT.x0 + 9)} y={`calc(${pctZ(ROBOT.height)} - 20px)`} className="text-fg-muted max-sm:hidden">
        Muzzle 14 in
      </Label>
      {apexShown && (
        <Label x={pctX(apex.x)} y={`calc(${pctZ(apex.z + 2.2)} - 20px)`} className="text-fg">
          Apex · {fmtFixed(apex.z, 1)} in
        </Label>
      )}
      {risingAtTarget && (
        <Label x={pctX(R)} y={`calc(${pctZ(Z + 3)} - 20px)`} className="text-fg">
          ↑ Rising at target
        </Label>
      )}
      {bracketFailed && (
        <Label x={pctX(Math.min(X1 - 30, launchEndX - 4))} y={`calc(${pctZ(Math.min(70, MUZZLE.z + launchEndX * tan40))} + 4px)`} align="right" className="bg-bg px-1 text-fg">
          40° launch line — CELL is above it
        </Label>
      )}
      {!sol.valid && !bracketFailed && hasArc && (
        <Label x={pctX(Math.max(30, apex.x))} y={`calc(${pctZ(Math.min(70, samples[Math.floor(samples.length / 2)].z))} - 22px)`} className="bg-bg px-1 text-fg">
          Needs {Math.round(sol.flywheelRpm).toLocaleString("en-US")} rpm
        </Label>
      )}
    </div>
  );
}

// ─── VIEW B — PLAN ────────────────────────────────────────────────────────────────────────────

export function PlanView({ input, sol, samples, ticks, bracketFailed, ballDiameter, isPollen, ballRef, robotRef }: ViewProps) {
  const R = input.target.x;
  const v = input.robotVel ?? { x: 0, y: 0 };
  const moving = Math.hypot(v.x, v.y) > 0.01;
  const hasSolution = sol.flightTimeSec > 0 && !bracketFailed;
  const t = sol.flightTimeSec;
  const A = { x: R - v.x * t, y: -v.y * t }; // virtual target (field frame)
  const B = { x: v.x * t, y: v.y * t }; // robot travel during the flight
  const az = sol.fieldAzimuthRad;
  const leadDeg = toDeg(sol.leadAngleRad);
  const showLead = hasSolution && moving && Math.abs(leadDeg) >= 0.5;
  const arcR = 26;
  const aimLen = 11;
  const ax = (x: number) => vx(clampX(x));
  const ay = (y: number) => vy(clampY(y));
  const offChart = hasSolution && (A.x > X1 || A.y > Y_TOP || A.y < Y_BOT);
  const turretAz = hasSolution ? az : 0;

  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${PH}` }}>
      <svg viewBox={`0 0 ${W} ${PH}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        {/* grid */}
        <g className="text-hairline" stroke="currentColor">
          {Array.from({ length: 17 }, (_, i) => i * 12).map((x) => (
            <line key={`g${x}`} x1={vx(x)} x2={vx(x)} y1={0} y2={PH} {...HAIR} opacity={0.75} />
          ))}
          {[-36, -24, -12, 12, 24, 36].map((y) => (
            <line key={`h${y}`} x1={vx(-18)} x2={W} y1={vy(y)} y2={vy(y)} {...HAIR} opacity={0.75} />
          ))}
        </g>
        {/* centre line */}
        <line x1={vx(-18)} x2={W} y1={vy(0)} y2={vy(0)} {...HAIR} stroke="currentColor" className="text-fg-muted" strokeDasharray="6 2 1 2" opacity={0.45} />

        {/* CELL (aim point) */}
        <g className="text-fg" stroke="currentColor">
          <rect x={vx(R - CELL.halfX)} y={vy(CELL.halfY)} width={CELL.halfX * 2} height={CELL.halfY * 2} {...HAIR} />
          <line x1={vx(R - 1.8)} x2={vx(R + 1.8)} y1={vy(0)} y2={vy(0)} {...HAIR} />
          <line x1={vx(R)} x2={vx(R)} y1={vy(-1.8)} y2={vy(1.8)} {...HAIR} />
        </g>

        {hasSolution && (
          <>
            {/* the ball's path over the floor: straight from the muzzle to the CELL */}
            {samples.length > 1 && (
              <g className="code-trace">
                <path d={planPath(samples)} {...HAIR} stroke="currentColor" className={sol.valid ? "text-fg" : "text-fg-muted"} />
              </g>
            )}
            {sol.valid && (
              <g className="code-late">
                {ticks.map((p) => (
                  <circle key={p.t} cx={ax(p.x)} cy={ay(p.y)} r={0.55} className="fill-fg-muted" />
                ))}
              </g>
            )}

            {moving && (
              <>
                {/* turret aim → virtual target */}
                <line x1={vx(0)} y1={vy(0)} x2={ax(A.x)} y2={ay(A.y)} {...HAIR} stroke="currentColor" className="text-fg" strokeDasharray="3 2" />
                {/* +v·t: what the robot's velocity adds during the flight (virtual target → CELL) */}
                <line x1={ax(A.x)} y1={ay(A.y)} x2={vx(R)} y2={vy(0)} {...HAIR} stroke="currentColor" className="text-fg-muted" strokeDasharray="0.8 1.8" />
                <path d={arrowHead({ x: vx(R), y: vy(0) }, vx(R) - ax(A.x), vy(0) - ay(A.y), 2.6)} {...HAIR} stroke="currentColor" className="text-fg-muted" />
                {/* robot travel during the flight */}
                <line x1={vx(0)} y1={vy(0)} x2={ax(B.x)} y2={ay(B.y)} {...HAIR} stroke="currentColor" className="text-fg" />
                <path d={arrowHead({ x: ax(B.x), y: ay(B.y) }, ax(B.x) - vx(0), ay(B.y) - vy(0), 2.6)} {...HAIR} stroke="currentColor" className="text-fg" />
                {/* parallelogram closing side */}
                <line x1={ax(B.x)} y1={ay(B.y)} x2={vx(R)} y2={vy(0)} {...HAIR} stroke="currentColor" className="text-fg-muted" strokeDasharray="0.8 2.4" opacity={0.5} />
                {/* robot at arrival (ghost) */}
                <rect
                  x={ax(B.x + ROBOT.x0)}
                  y={ay(B.y + ROBOT.half)}
                  width={ROBOT.x1 - ROBOT.x0}
                  height={ROBOT.half * 2}
                  {...HAIR}
                  stroke="currentColor"
                  className="text-fg-muted"
                  strokeDasharray="1.2 2"
                  opacity={0.6}
                />
                {/* virtual target */}
                <g className="text-fg" stroke="currentColor">
                  <circle cx={ax(A.x)} cy={ay(A.y)} r={2.2} {...HAIR} />
                  <line x1={ax(A.x) - 3.6} x2={ax(A.x) + 3.6} y1={ay(A.y)} y2={ay(A.y)} {...HAIR} />
                  <line x1={ax(A.x)} x2={ax(A.x)} y1={ay(A.y) - 3.6} y2={ay(A.y) + 3.6} {...HAIR} />
                </g>
              </>
            )}
            {showLead && (
              <path
                d={`M${vx(arcR)} ${vy(0)} A ${arcR} ${arcR} 0 0 ${az < 0 ? 1 : 0} ${vx(r3(arcR * Math.cos(az)))} ${vy(r3(arcR * Math.sin(az)))}`}
                {...HAIR}
                stroke="currentColor"
                className="text-fg-muted"
              />
            )}
          </>
        )}

        {/* robot (top view) */}
        <g ref={robotRef} className="text-fg" stroke="currentColor">
          <rect x={vx(ROBOT.x0)} y={vy(ROBOT.half)} width={ROBOT.x1 - ROBOT.x0} height={ROBOT.half * 2} {...HAIR} />
          <circle cx={vx(ROBOT.trackX)} cy={vy(0)} r={4.6} {...HAIR} opacity={0.8} />
          <line
            x1={vx(ROBOT.trackX)}
            y1={vy(0)}
            x2={vx(r3(ROBOT.trackX + aimLen * Math.cos(turretAz)))}
            y2={vy(r3(aimLen * Math.sin(turretAz)))}
            {...HAIR}
          />
          <circle cx={vx(0)} cy={vy(0)} r={0.75} className="fill-fg" stroke="none" />
        </g>

        {/* the ball (FIRE) */}
        <circle
          ref={ballRef}
          cx={vx(0)}
          cy={vy(0)}
          r={r3(ballDiameter / 2)}
          opacity={0}
          className={isPollen ? "fill-pollen stroke-pollen-edge" : "fill-bg stroke-fg"}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* labels */}
      <Label x={`calc(${pctX(R + CELL.halfX)} + 6px)`} y={`calc(${pctY(CELL.halfY)} - 2px)`} align="left" className="text-fg max-sm:hidden">
        CELL
      </Label>
      {hasSolution && moving && !offChart && (
        <Label x={`calc(${pctX(clampX(A.x))} + 9px)`} y={`calc(${pctY(clampY(A.y))} - 8px)`} align="left" className="text-fg">
          <span className="max-sm:hidden">Virtual target · </span>−v·t
        </Label>
      )}
      {offChart && (
        <Label x={`calc(${pctX(X1)} - 4px)`} y={`calc(${pctY(clampY(A.y))} - 8px)`} align="right" className="bg-bg px-1 text-fg">
          Virtual target off chart ›
        </Label>
      )}
      {hasSolution && moving && (
        <Label
          x={`calc(${pctX(clampX(B.x + ROBOT.x1))} + 6px)`}
          y={`calc(${pctY(clampY(B.y + (B.y >= 0 ? ROBOT.half : -ROBOT.half)))} - ${B.y >= 0 ? 18 : -2}px)`}
          align="left"
          className="text-fg-muted max-sm:hidden"
        >
          Robot at arrival · v·t {fmtFixed(Math.hypot(B.x, B.y), 1)} in
        </Label>
      )}
      {showLead && (
        <Label
          x={`calc(${pctX(r3((arcR + 3) * Math.cos(az / 2)))} + 4px)`}
          y={`calc(${pctY(r3((arcR + 3) * Math.sin(az / 2)))} - 8px)`}
          align="left"
          className="text-fg-muted max-sm:bg-surface-1 max-sm:px-1"
        >
          Lead {fmtSigned(leadDeg, 1)}°
        </Label>
      )}
      {!moving && hasSolution && (
        <Label x={pctX(R / 2 + 6)} y={`calc(${pctY(0)} - 22px)`} className="text-fg-muted">
          Standing still · aim straight at the CELL
        </Label>
      )}
    </div>
  );
}
