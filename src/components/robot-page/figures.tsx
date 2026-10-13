// One "only-Apex" detail per subsystem panel: a derivation, a drawing or a table built from the
// team's real constants (RobotConstants.java, BallType.java, hub-backup/README-rewire.md).
//
// Each one moves in its own way when it scrolls in (USER-REQUIREMENTS #6/#7c — vary the motion
// section by section; the motion explains the content):
//   01 DRIVE        the free-speed equation evaluates term by term, then the result counts up
//   02 ODOMETRY     the two pods travel out from the tracking point to their real offsets
//   03 INTAKE       the code's device names are looked up one by one; each hub port answers
//   04 HOPPER       a scan line sweeps the hue scale and the sorter's windows fill behind it
//   05 TURRET       the chassis turns 100°, the turret −100°: the line to the HIVE never moves
//   06 SHOOTER      the flywheel bars spin up at the code's real ramp, 4,000 rpm/s
//   07 VISION       the webcam's field of view opens to 54.4°
//   08 ELECTRONICS  the configured ports come online in order, hub by hub
// Server components (pure SVG / HTML); the choreography is CSS on one trigger per figure
// (./armed + ./robot-page.css). Final state in the server HTML; static under reduced motion.

import type { ReactNode } from "react";
import { solve } from "@/lib/ballistics";
import { fmtFixed, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SubsystemId } from "@/content/robot";
import { Armed, Tally } from "./armed";
import { CAMERA_HFOV_DEG, CELL_AIM_Z_IN, DRIVE_FREE_SPEED_IN_S, HUE_BANDS, RC, WIRING, aimGeometry, aimHeadingDeg } from "./data";
import { fx } from "./fx";

const DEG = Math.PI / 180;
/** Servo-like in-out for mechanisms that move and stop (DESIGN_SPEC §2 --ease-in-out). */
const IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const r2 = (n: number) => Math.round(n * 100) / 100;

/** A small engineering note: mono label, then content, with a hairline rule on the left. */
function Note({ label, source, children, className }: { label: string; source?: string; children: ReactNode; className?: string }) {
  return (
    <figure className={cn("border-l border-hairline-strong pl-4", className)}>
      <figcaption className="type-label text-fg-muted">{label}</figcaption>
      <div className="mt-3">{children}</div>
      {source && <p className="mt-3 font-mono text-[10px] leading-4 [overflow-wrap:anywhere] text-fg-muted/80">{source}</p>}
    </figure>
  );
}

/** A worked line of maths in mono: "a × b ÷ c = d". */
function Eq({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[13px] leading-6 [overflow-wrap:anywhere] text-fg tabular-nums", className)}>{children}</p>;
}

// ─── 01 DRIVE: the equation evaluates ───────────────────────────────────────────────────────
function DriveDetail() {
  const terms = [`${RC.driveMotorRpm} rpm`, "× π", `× ${fmtFixed(RC.wheelDiameterIn, 3)} in`, "÷ 60", "="];
  const step = 0.16;
  return (
    <Note label="Free speed, from the motor and the wheel" source="RobotConstants.java · Drive.FREE_SPEED_IN_PER_SEC = 66.889">
      <Armed as="p" className="font-mono text-[13px] leading-6 text-fg tabular-nums">
        {terms.map((t, i) => (
          <span key={t} className="rp-fx-clip mr-[0.75ch] inline-block whitespace-nowrap" style={fx(i * step, 0.26, { steps: 6 })}>
            {t}
          </span>
        ))}
        <span className="rp-fx-fade inline-block whitespace-nowrap" style={fx(terms.length * step, 0.12, { ease: "steps(1, start)" })}>
          <Tally value={DRIVE_FREE_SPEED_IN_S} decimals={1} suffix=" in/s" delay={terms.length * step} duration={1} className="text-pollen-text" />
        </span>
      </Armed>
      <p className="mt-2 text-[14px] leading-6 text-fg-muted">Strafe, drive and turn add per wheel, so the robot can slide sideways while it spins.</p>
    </Note>
  );
}

// ─── 02 ODOMETRY: pod offsets, top view — the pods travel out to where they sit ─────────────
function OdometryDetail() {
  // top view, mm, robot forward = up, robot left = screen left. Tracking point at the origin.
  const half = 228.6; // 18 in start cube
  const xPod = 84; // X pod: 84 mm RIGHT of the tracking point (X_POD_OFFSET_MM = −84, left positive)
  const yPod = 168; // Y pod: 168 mm BEHIND it (Y_POD_OFFSET_MM = −168, forward positive)
  const travel = { at: 0.6, dur: 1.1 };
  return (
    <Note label="Pod offsets, top view" source="RobotConstants.java · Odo.X_POD_OFFSET_MM = −84 · Odo.Y_POD_OFFSET_MM = −168">
      <Armed>
        <svg
          viewBox="-262 -262 524 524"
          className="w-full max-w-[300px] text-fg-muted"
          role="img"
          aria-label="Top view: the X pod sits 84 millimetres right of the tracking point, the Y pod 168 millimetres behind it."
        >
          {/* 18 in cube + wheels */}
          <g className="rp-fx-fade" style={fx(0, 0.5)} fill="none" stroke="currentColor" strokeWidth={1}>
            <rect x={-half} y={-half} width={half * 2} height={half * 2} strokeDasharray="6 8" opacity={0.6} vectorEffect="non-scaling-stroke" />
            {[
              [-197, -120],
              [197, -120],
              [-197, 120],
              [197, 120],
            ].map(([x, y]) => (
              <rect key={`${x}${y}`} x={x - 25} y={y - 52} width={50} height={104} opacity={0.55} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          {/* tracking point — snaps in first: everything is measured from here */}
          <g className="rp-fx-from rp-svg text-fg" style={fx(0.2, 0.5, { from: "scale(0)" })} fill="none" stroke="currentColor" strokeWidth={1}>
            <circle cx={0} cy={0} r={9} vectorEffect="non-scaling-stroke" />
            <line x1={-22} y1={0} x2={22} y2={0} vectorEffect="non-scaling-stroke" />
            <line x1={0} y1={-22} x2={0} y2={22} vectorEffect="non-scaling-stroke" />
          </g>
          {/* +X forward, +Y left */}
          <g className="rp-fx-fade" style={fx(0.35, 0.4)} fill="none" stroke="currentColor" strokeWidth={1}>
            <path d="M 0 -60 L 0 -118 M -9 -104 L 0 -118 L 9 -104" opacity={0.8} vectorEffect="non-scaling-stroke" />
            <path d="M -60 0 L -118 0 M -104 -9 L -118 0 L -104 9" opacity={0.8} vectorEffect="non-scaling-stroke" />
          </g>
          {/* the two pods (rolling direction drawn as the long side) leave the tracking point */}
          <g className="text-fg" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect
              className="rp-fx-from rp-svg"
              style={fx(travel.at, travel.dur, { from: `translate(${-xPod}px, 0px)`, ease: IN_OUT })}
              x={xPod - 8}
              y={-22}
              width={16}
              height={44}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              className="rp-fx-from rp-svg"
              style={fx(travel.at, travel.dur, { from: `translate(0px, ${-yPod}px)`, ease: IN_OUT })}
              x={-22}
              y={yPod - 8}
              width={44}
              height={16}
              vectorEffect="non-scaling-stroke"
            />
          </g>
          {/* dimensions stretch out with them */}
          <g fill="none" stroke="var(--pollen-line)" strokeWidth={1}>
            <path d="M 0 -64 L 0 -48" vectorEffect="non-scaling-stroke" />
            <path
              className="rp-fx-from rp-svg"
              style={fx(travel.at, travel.dur, { from: "scaleX(0)", ease: IN_OUT })}
              d={`M 0 -56 L ${xPod} -56 M ${xPod} -64 L ${xPod} -48`}
              vectorEffect="non-scaling-stroke"
            />
            <path
              className="rp-fx-from rp-svg"
              style={fx(travel.at, travel.dur, { from: "scaleY(0)", ease: IN_OUT })}
              d={`M 56 0 L 56 ${yPod} M 48 ${yPod} L 64 ${yPod}`}
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <g className="font-mono" fill="currentColor" fontSize={22} letterSpacing={1}>
            <g className="rp-fx-fade" style={fx(travel.at + travel.dur - 0.15, 0.4)}>
              <text x={xPod / 2} y={-72} textAnchor="middle" className="fill-fg">
                84
              </text>
              <text x={72} y={yPod / 2 + 8} className="fill-fg">
                168
              </text>
              <text x={xPod + 18} y={8}>
                X POD
              </text>
              <text x={-28} y={yPod + 44} textAnchor="middle">
                Y POD
              </text>
            </g>
            <g className="rp-fx-fade" style={fx(0.35, 0.4)}>
              <text x={0} y={-130} textAnchor="middle">
                +X
              </text>
              <text x={-128} y={8} textAnchor="end">
                +Y
              </text>
            </g>
            <text x={-half + 8} y={half - 12} fontSize={18} opacity={0.8} className="rp-fx-fade" style={fx(0, 0.5)}>
              18 IN · MM
            </text>
          </g>
        </svg>
      </Armed>
      <p className="mt-2 text-[14px] leading-6 text-fg-muted">
        Only the sideways offset of the forward pod and the forward offset of the sideways pod matter — that is all the Pinpoint asks for.
      </p>
    </Note>
  );
}

// ─── 03 INTAKE: the names the code looks up ─────────────────────────────────────────────────
function DeviceNames({ what }: { what: string }) {
  const rows = WIRING.filter((w) => w.what === what);
  const step = 0.3;
  return (
    <Armed as="ul" className="divide-y divide-hairline border-y border-hairline">
      {rows.map((w, i) => (
        <li key={w.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-2">
          {/* the name is typed, then the hub answers with the port */}
          <span className="rp-fx-clip inline-block justify-self-start font-mono text-[13px] text-fg" style={fx(i * step, 0.4, { steps: 10 })}>
            “{w.name}”
          </span>
          <span
            className="rp-fx-fade font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase"
            style={fx(i * step + 0.48, 0.12, { ease: "steps(1, start)" })}
          >
            {w.hub} · {w.port}
          </span>
        </li>
      ))}
    </Armed>
  );
}

function IntakeDetail() {
  return (
    <Note label="Names the code asks the hubs for" source="hub-backup/README-rewire.md · the 2026-10-11 rewire">
      <DeviceNames what="intake" />
    </Note>
  );
}

// ─── 04 HOPPER: the colour sorter's hue windows, read by a scan line ─────────────────────────
function HopperDetail() {
  const pct = (h: number) => `${((h / 360) * 100).toFixed(3)}%`;
  const fill = { pollen: "bg-pollen-line", red: "bg-data-red", blue: "bg-data-blue" } as const;
  const segs = HUE_BANDS.flatMap((b) => (b.from > b.to ? [{ ...b, from: b.from, to: 360 }, { ...b, from: 0, to: b.to }] : [b]));
  const SCAN = 1.6; // seconds for the 0 → 360° sweep
  const lead = 0.15;
  const at = (h: number) => lead + (h / 360) * SCAN;
  return (
    <Note label="Hue windows of the colour sorter" source="RobotConstants.java · Colors.POLLEN/RED/BLUE_HUE_MIN/MAX · MIN_SATURATION · BALL_PRESENT_MM">
      <Armed
        className="relative h-16"
        role="img"
        aria-label="Hue scale 0 to 360 degrees: POLLEN 35 to 85, red NECTAR 340 to 20 (wrapping through 0), blue NECTAR 190 to 265."
      >
        {segs.map((s, i) => (
          <span
            key={i}
            className={cn("rp-fx-from absolute top-2 h-2.5 origin-left", fill[s.key])}
            style={{ left: pct(s.from), width: pct(s.to - s.from), ...fx(at(s.from), ((s.to - s.from) / 360) * SCAN, { from: "scaleX(0)", ease: "linear" }) }}
          />
        ))}
        {/* glyph above each band (red/blue never rely on colour alone) */}
        {HUE_BANDS.map((b) => {
          const mid = b.from > b.to ? 0 : (b.from + b.to) / 2;
          return (
            <span
              key={b.key}
              className="rp-fx-fade absolute -top-2 -translate-x-1/2 font-mono text-[9px] leading-3 text-fg"
              style={{ left: pct(mid), ...fx(at(mid), 0.2) }}
            >
              {b.key === "pollen" ? "P" : b.key === "red" ? "R" : "B"}
            </span>
          );
        })}
        <span className="absolute inset-x-0 top-[22px] h-px bg-border-ui" />
        {Array.from({ length: 13 }, (_, i) => i * 30).map((h) => (
          <span key={h} className={cn("absolute top-[22px] w-px bg-border-ui", h % 90 === 0 ? "h-2" : "h-1")} style={{ left: pct(h) }} />
        ))}
        {[0, 90, 180, 270, 360].map((h) => (
          <span
            key={h}
            className={cn("absolute top-8 font-mono text-[10px] text-fg-muted tabular-nums", h === 0 ? "" : h === 360 ? "-translate-x-full" : "-translate-x-1/2")}
            style={{ left: pct(h) }}
          >
            {h}°
          </span>
        ))}
        {/* the scan line (only visible while it plays; it never leaves the scale, so no overflow) */}
        <span aria-hidden="true" className="rp-scan-head pointer-events-none absolute -top-1 left-0 h-[34px] w-px bg-fg" style={fx(lead, SCAN)} />
      </Armed>
      <dl className="mt-1 grid grid-cols-1 gap-y-1 font-mono text-[11px] leading-5 sm:grid-cols-3 sm:gap-x-4">
        <div className="flex gap-2">
          <dt className="text-fg">P · POLLEN</dt>
          <dd className="text-fg-muted tabular-nums">35–85°</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-fg">R · NECTAR</dt>
          <dd className="text-fg-muted tabular-nums">340–20°</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-fg">B · NECTAR</dt>
          <dd className="text-fg-muted tabular-nums">190–265°</dd>
        </div>
      </dl>
      <p className="mt-3 text-[14px] leading-6 text-fg-muted">A ball counts only above 0.35 saturation and closer than 25 mm — then the sorter sets the RPM for it, or spits out the opponent&apos;s NECTAR.</p>
    </Note>
  );
}

// ─── 05 TURRET: the counter-rotation, drawn ─────────────────────────────────────────────────
function TurretDetail() {
  const turn = 100; // an example turn, degrees (+ = CCW, the team's convention)
  const at = 0.3;
  const dur = 1.6;
  // heading arc: from the robot's front (screen up) counter-clockwise by `turn` (SVG y points down)
  const r = 40;
  const end = (-90 - turn) * DEG;
  const ax = r2(r * Math.cos(end));
  const ay = r2(r * Math.sin(end));
  const spin = (to: string) => fx(at, dur, { from: "rotate(0deg)", to, ease: IN_OUT });
  return (
    <Note label="Holding a world bearing" source="Turret.java · setTargetFieldAngleRad() · update(headingVelRad) · Turret.KV = 0.11">
      <Armed className="relative w-full max-w-[300px]">
        <svg
          viewBox="-100 -112 200 172"
          className="w-full text-fg-muted"
          role="img"
          aria-label="Top view: the chassis turns 100 degrees counter-clockwise while the turret turns 100 degrees the other way, so the line to the HIVE never moves."
        >
          {/* the HIVE (fixed in the world) */}
          <circle cx={0} cy={-100} r={3.2} fill="var(--pollen-line)" />
          <text x={8} y={-96.5} className="font-mono" fontSize={8} letterSpacing={0.8} fill="currentColor">
            HIVE
          </text>
          {/* where the chassis started */}
          <g fill="none" stroke="currentColor" strokeWidth={1} strokeDasharray="3 3" opacity={0.55}>
            <rect x={-23} y={-23} width={46} height={46} vectorEffect="non-scaling-stroke" />
            <path d="M -8 -23 L 0 -31 L 8 -23" vectorEffect="non-scaling-stroke" />
          </g>
          {/* heading change (no non-scaling-stroke here: it would move the dash maths to screen
              space and pathLength=1 would no longer cover the arc) */}
          <path
            className="rp-fx-dash"
            style={fx(at, dur, { ease: IN_OUT })}
            d={`M 0 ${-r} A ${r} ${r} 0 0 0 ${ax} ${ay}`}
            pathLength={1}
            strokeDasharray="1 1"
            fill="none"
            stroke="currentColor"
            strokeWidth={0.7}
          />
          {/* chassis (turns) carrying the turret (turns back) */}
          <g className="rp-fx-from rp-svg text-fg" style={spin(`rotate(${-turn}deg)`)}>
            <rect x={-23} y={-23} width={46} height={46} fill="var(--bg)" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <path d="M -8 -23 L 0 -31 L 8 -23" fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {[
              [-23, -23],
              [17, -23],
              [-23, 9],
              [17, 9],
            ].map(([x, y]) => (
              <rect key={`${x}${y}`} x={x} y={y} width={6} height={14} fill="currentColor" opacity={0.35} />
            ))}
            <g className="rp-fx-from rp-svg" style={spin(`rotate(${turn}deg)`)}>
              <circle cx={0} cy={0} r={9} fill="var(--bg)" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <line x1={0} y1={0} x2={0} y2={-92} stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
            </g>
          </g>
        </svg>
        <dl className="absolute top-0 left-0 font-mono text-[10px] leading-4 tracking-[0.08em] uppercase">
          <div className="flex gap-2">
            <dt className="w-[7ch] text-fg-muted">Heading</dt>
            <dd className="text-fg">
              <Tally value={turn} prefix="+" suffix="°" delay={at} duration={dur} ease="inOut" />
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-[7ch] text-fg-muted">Turret</dt>
            <dd className="text-fg">
              <Tally value={turn} prefix="−" suffix="°" delay={at} duration={dur} ease="inOut" />
            </dd>
          </div>
        </dl>
      </Armed>
      <Eq className="mt-4">turret = wrap(azimuth − heading)</Eq>
      <Eq>power += −ω × kV   (kV = {RC.turretKv})</Eq>
      <p className="mt-2 text-[14px] leading-6 text-fg-muted">
        Turn the chassis 100° and the turret turns −100°: the line to the HIVE never moves. The Pinpoint reports the turn rate ω directly
        (fused IMU, 1500 Hz), so the turret starts turning back before an error appears — until its ±170° stop.
      </p>
    </Note>
  );
}

// ─── 06 SHOOTER: RPM per ball, spun up at the real ramp ─────────────────────────────────────
function ShooterDetail() {
  const pollen = aimGeometry(96, aimHeadingDeg(0) * DEG);
  const nectar = solve({ ...pollen.input, ball: "NECTAR_RED" });
  const rows = [
    { key: "POLLEN", rpm: pollen.solution.valid ? Math.round(pollen.solution.flywheelRpm) : null, bar: "bg-pollen-line" },
    { key: "NECTAR", rpm: nectar.valid ? Math.round(nectar.flywheelRpm) : null, bar: "bg-border-ui" },
  ];
  const at = 0.25;
  return (
    <Note label="Flywheel speed per ball · 96 in shot" source="Ballistics.java · muzzleSpeedToRpm() · BallType.java · Shoot.MAX_FLYWHEEL_RPM = 5000 · Shoot.RPM_RAMP_PER_SEC = 4000">
      <Eq>rpm = 60 × v ÷ (η × π × D)</Eq>
      <p className="mt-1 font-mono text-[11px] leading-5 text-fg-muted">
        D = {fmtFixed(RC.flywheelDiameterIn, 1)} in · η POLLEN {fmtFixed(RC.etaPollen, 2)} · η NECTAR {fmtFixed(RC.etaNectar, 2)}
      </p>
      <Armed as="dl" className="mt-5">
        {rows.map((r) => {
          const secs = r.rpm === null ? 0 : r.rpm / RC.rpmRampPerSec;
          return (
            <div key={r.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-1.5">
              <dt className="type-label text-fg-muted">{r.key}</dt>
              <dd aria-hidden="true" className="relative h-2.5">
                <span className="absolute inset-x-0 top-1/2 h-px bg-hairline" />
                {r.rpm !== null && (
                  <span
                    className={cn("rp-fx-from absolute inset-y-0 left-0 origin-left", r.bar)}
                    style={{ width: `${((r.rpm / RC.maxRpm) * 100).toFixed(2)}%`, ...fx(at, secs, { from: "scaleX(0)", ease: "linear" }) }}
                  />
                )}
              </dd>
              <dd className="w-[9ch] text-right font-mono text-[13px] text-fg tabular-nums">
                {r.rpm === null ? "—" : <Tally value={r.rpm} suffix=" rpm" delay={at} duration={secs} ease="linear" />}
              </dd>
            </div>
          );
        })}
      </Armed>
      <div aria-hidden="true" className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] gap-x-3">
        <span />
        <span className="flex justify-between border-t border-hairline-strong pt-1 font-mono text-[9px] leading-3 text-fg-muted tabular-nums">
          <span>0</span>
          <span>2,500</span>
          <span>{fmtInt(RC.maxRpm)} max</span>
        </span>
        <span className="w-[9ch]" />
      </div>
      <p className="mt-3 text-[14px] leading-6 text-fg-muted">
        Same shot to the CELL of our HIVE model ({fmtFixed(CELL_AIM_Z_IN, 1)} in up), same {fmtFixed(pollen.solution.flightTimeSec, 2)} s flight: the
        heavier NECTAR grips the wheel less, so it needs more RPM — which is why the colour sensor sits before the shooter. The bars fill at the code&apos;s
        ramp, {fmtInt(RC.rpmRampPerSec)} rpm/s: a step to full speed draws close to the motor&apos;s 9.2 A stall current, and with four drive motors
        accelerating that browns out the Control Hub.
      </p>
    </Note>
  );
}

// ─── 07 VISION: what the webcam can see — the field of view opens ───────────────────────────
function VisionDetail() {
  const half = CAMERA_HFOV_DEG / 2;
  const R = 92;
  const x = r2(R * Math.sin(half * DEG));
  const y = r2(-R * Math.cos(half * DEG));
  const at = 0.15;
  const dur = 1.1;
  return (
    <Note label="Webcam 1's field of view" source="RobotConstants.java · Camera.FX = 622 · WIDTH = 640 · MOUNTED_ON_TURRET = false · Hive.MAX_ESTIMATE_AGE_SEC = 1.5">
      <Armed>
        <svg
          viewBox="-118 -108 236 130"
          className="w-full max-w-[300px] text-fg-muted"
          role="img"
          aria-label={`Top view: Webcam 1 sees ${fmtFixed(CAMERA_HFOV_DEG, 1)} degrees, ${fmtFixed(half, 1)} either side of the robot's front.`}
        >
          <line x1={0} y1={0} x2={0} y2={-98} stroke="currentColor" strokeWidth={1} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          <text x={0} y={-101} textAnchor="middle" className="font-mono" fontSize={8} letterSpacing={0.8} fill="currentColor">
            FWD
          </text>
          <path
            className="rp-fx-from rp-svg text-fg"
            style={fx(at, dur, { from: "scaleX(0.02)" })}
            d={`M 0 0 L ${-x} ${y} A ${R} ${R} 0 0 1 ${x} ${y} Z`}
            fill="currentColor"
            fillOpacity={0.07}
            stroke="currentColor"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={0} cy={0} r={3} className="fill-fg" />
          <text x={0} y={16} textAnchor="middle" className="font-mono" fontSize={8} letterSpacing={0.8} fill="currentColor">
            WEBCAM 1 · FIXED TO THE CHASSIS
          </text>
        </svg>
        <Eq className="mt-2">
          2 × atan(320 ÷ {RC.cameraFxPx}) = <Tally value={CAMERA_HFOV_DEG} decimals={1} suffix="°" delay={at} duration={dur} className="text-pollen-text" />
        </Eq>
      </Armed>
      <p className="mt-2 text-[14px] leading-6 text-fg-muted">
        The camera is fixed to the chassis, not the turret. When the HIVE leaves its view, odometry carries the last sighting for up to{" "}
        {RC.maxEstimateAgeSec} s — try it in the aim playground below.
      </p>
    </Note>
  );
}

// ─── 08 ELECTRONICS: the real wiring map — ports come online ───────────────────────────────
function ElectronicsDetail() {
  const hubs = ["Control", "Expansion"] as const;
  const order = new Map(WIRING.map((w, i) => [w.name, i]));
  const onAt = (name: string) => 0.1 + (order.get(name) ?? 0) * 0.11;
  const snap = "steps(1, start)";
  return (
    <Note label="Wiring after the 2026-10-11 rewire" source="hub-backup/README-rewire.md · names must match the Robot Configuration exactly">
      <Armed className="grid gap-6 sm:grid-cols-2">
        {hubs.map((h) => (
          <div key={h}>
            <p className="type-label text-fg">{h} Hub</p>
            <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
              {WIRING.filter((w) => w.hub === h).map((w) => (
                <li
                  key={w.name}
                  className="rp-fx-dim grid grid-cols-[0.375rem_4.5rem_minmax(0,1fr)] items-baseline gap-3 py-1.5"
                  style={fx(onAt(w.name), 0.1, { ease: snap })}
                >
                  <span aria-hidden="true" className="rp-fx-led size-1.5 self-center rounded-full bg-fg-muted" style={fx(onAt(w.name), 0.1, { ease: snap })} />
                  <span className="font-mono text-[10px] tracking-[0.06em] text-fg-muted uppercase">{w.port}</span>
                  <span className="min-w-0 font-mono text-[12px] text-fg">
                    {w.name} <span className="text-fg-muted">· {w.what}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Armed>
      <p className="mt-3 text-[14px] leading-6 text-fg-muted">
        Note the capital F in <span className="font-mono text-[13px] text-fg">Flywheel</span>:{" "}
        <span className="font-mono text-[13px]">hardwareMap.get()</span> is case-sensitive.
      </p>
    </Note>
  );
}

const DETAILS: Record<SubsystemId, () => ReactNode> = {
  drivetrain: DriveDetail,
  odometry: OdometryDetail,
  intake: IntakeDetail,
  hopper: HopperDetail,
  turret: TurretDetail,
  shooter: ShooterDetail,
  vision: VisionDetail,
  electronics: ElectronicsDetail,
};

export function SubsystemDetail({ id, className }: { id: SubsystemId; className?: string }) {
  const D = DETAILS[id];
  return <div className={className}>{D()}</div>;
}
