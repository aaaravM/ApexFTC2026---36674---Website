"use client";

// The fire decision, mirrored from AimController.java:
//   isReadyToFire() = aimingEnabled && assumedBall.canFire() && solution.valid
//                     && turret.isOnTarget() && shooter.isAtSpeed() && hiveTracker.hasTarget()
// Toggle each condition. READY lights pollen only when all pass. The listing shows Java's
// short-circuit: evaluation stops at the first false (✕) and the lines after it never run.
// The telemetry line is getReadinessText() — its own order — framed the way TeleOpMain prints it
// (">>> … <<<"). AT SPEED latches only after the wheel has held tolerance for 0.15 s
// (RobotConstants.Shoot.READY_STABLE_SEC). The trigger is a request: feeder.setPower(trigger && ready).

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Magnetic, RollText } from "@/components/motion";
import { Armed } from "@/components/code/armed";
import { Stagger, StaggerItem } from "@/components/code/motion-safe";
import { fireGates } from "@/content/code";
import { cn } from "@/lib/utils";
import { CodeFigure, CodeView, lineText, type LineState } from "./code-view";
import type { CodeLine } from "./highlight";
import { blobUrl } from "./repo-snapshot";

type CondId = "aim" | "ball" | "solution" | "on-target" | "at-speed" | "hive-fresh";

interface Cond {
  id: CondId;
  label: string;
  call: string;
  detail: string;
  pre?: boolean;
  /** Matches the condition's line in the listing. */
  re: RegExp;
}

const gateDetail = (id: string) => fireGates.find((g) => g.id === id)?.detail ?? "";
const gateLabel = (id: string) => fireGates.find((g) => g.id === id)?.label ?? id.toUpperCase();

const CONDS: Cond[] = [
  { id: "aim", label: "AIM ON", call: "aimingEnabled", detail: "The operator is holding the left bumper (gamepad 2).", pre: true, re: /aimingEnabled/ },
  { id: "ball", label: "BALL KNOWN", call: "assumedBall.canFire()", detail: "The colour sensor named the ball. An unclassified ball refuses to fire.", pre: true, re: /canFire\(\)/ },
  { id: "solution", label: gateLabel("solution"), call: "solution.valid", detail: gateDetail("solution"), re: /solution\.valid/ },
  { id: "on-target", label: gateLabel("on-target"), call: "turret.isOnTarget()", detail: gateDetail("on-target"), re: /isOnTarget\(\)/ },
  { id: "at-speed", label: gateLabel("at-speed"), call: "shooter.isAtSpeed()", detail: gateDetail("at-speed"), re: /isAtSpeed\(\)/ },
  { id: "hive-fresh", label: gateLabel("hive-fresh"), call: "hiveTracker.hasTarget()", detail: gateDetail("hive-fresh"), re: /hasTarget\(\)/ },
];

const HOLD_MS = 150;

/** getReadinessText(), in its own order (AimController.java L144–154). */
function readiness(on: Record<CondId, boolean>): ReactNode {
  const fmt = (s: string) => <span className="text-fg-muted">{s}</span>;
  if (!on.aim) return "AIM OFF";
  if (!on.ball) return "BALL NOT IDENTIFIED -- will not fire";
  if (!on["hive-fresh"]) return "NO TARGET";
  if (!on.solution) return <>NO SOLUTION: {fmt("‹failReason›")}</>;
  if (!on["on-target"]) return <>TURRET {fmt("±n.n")} deg</>;
  if (!on["at-speed"]) return <>SPINNING {fmt("±nnn")} rpm</>;
  return "READY";
}

export interface GatesPanelProps {
  ready: { title: string; file: string; startLine?: number; endLine?: number; lines: CodeLine[] };
  className?: string;
}

export function GatesPanel({ ready, className }: GatesPanelProps) {
  const [on, setOn] = useState<Record<CondId, boolean>>({
    aim: true,
    ball: true,
    solution: true,
    "on-target": false,
    "at-speed": true,
    "hive-fresh": true,
  });
  // AT SPEED latches after the wheel has held tolerance for 0.15 s.
  const [held, setHeld] = useState(true);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shot, setShot] = useState<{ fed: boolean } | null>(null);
  const [fed, setFed] = useState(0);
  const shotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (shotTimer.current) clearTimeout(shotTimer.current);
    },
    [],
  );

  const toggle = (id: CondId) => {
    setShot(null);
    const nextValue = !on[id];
    setOn({ ...on, [id]: nextValue });
    if (id === "at-speed") {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      setHeld(false);
      if (nextValue) holdTimer.current = setTimeout(() => setHeld(true), HOLD_MS);
    }
  };

  const pass = (id: CondId) => (id === "at-speed" ? on[id] && held : on[id]);
  const value: Record<CondId, boolean> = {
    aim: pass("aim"),
    ball: pass("ball"),
    solution: pass("solution"),
    "on-target": pass("on-target"),
    "at-speed": pass("at-speed"),
    "hive-fresh": pass("hive-fresh"),
  };
  const firstFalse = CONDS.findIndex((c) => !value[c.id]);
  const isReady = firstFalse === -1;

  const pull = () => {
    if (shotTimer.current) clearTimeout(shotTimer.current);
    setShot({ fed: isReady });
    if (isReady) setFed((f) => f + 1);
    shotTimer.current = setTimeout(() => setShot(null), 2400);
  };

  // listing states: ✓ evaluated-true · ✕ the first false (where && stops) · dim = never evaluated
  const states: (LineState | undefined)[] = ready.lines.map((line) => {
    const idx = CONDS.findIndex((c) => c.re.test(lineText(line)));
    if (idx < 0) return undefined;
    if (firstFalse === -1 || idx < firstFalse) return "pass";
    if (idx === firstFalse) return "fail";
    return "dim";
  });
  const notes: Record<number, string> = {};
  ready.lines.forEach((line, i) => {
    const idx = CONDS.findIndex((c) => c.re.test(lineText(line)));
    if (idx >= 0 && firstFalse !== -1 && idx === firstFalse) notes[i] = "// false → stop here";
    if (idx >= 0 && firstFalse !== -1 && idx === firstFalse + 1) notes[i] = "// never evaluated";
  });

  const href = `${blobUrl(ready.file)}${ready.startLine ? `#L${ready.startLine}${ready.endLine ? `-L${ready.endLine}` : ""}` : ""}`;

  return (
    <Armed effect="tilt" inset={0.18} className={cn("grid gap-x-[var(--gutter)] gap-y-10 lg:grid-cols-12", className)}>
      {/* annunciator */}
      <div className="min-w-0 lg:col-span-5">
        <div className="border border-hairline bg-surface-1">
          <Group title="Preconditions">
            {CONDS.filter((c) => c.pre).map((c, i) => (
              <GateRow key={c.id} lamp={i} cond={c} pressed={on[c.id]} passing={value[c.id]} onToggle={() => toggle(c.id)} />
            ))}
          </Group>
          <Group title="The four gates">
            {CONDS.filter((c) => !c.pre).map((c, i) => (
              <GateRow
                key={c.id}
                lamp={CONDS.filter((d) => d.pre).length + i}
                cond={c}
                pressed={on[c.id]}
                passing={value[c.id]}
                holding={c.id === "at-speed" && on[c.id] && !held}
                onToggle={() => toggle(c.id)}
              />
            ))}
          </Group>

          {/* AND → READY */}
          <div className="border-t border-hairline p-4 sm:p-5">
            <p className="font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">All of them, every loop → </p>
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "mt-3 flex min-h-[76px] items-center justify-between gap-4 border px-5 py-4 transition-[background-color,border-color,color] duration-[220ms] ease-out motion-reduce:transition-none",
                isReady ? "border-pollen-edge bg-pollen text-pollen-ink" : "hatch border-dashed border-hairline-strong text-fg-muted",
              )}
            >
              <span className="relative block overflow-clip py-1 font-display text-[30px] leading-none font-[560] tracking-[0.02em] uppercase [font-stretch:112%]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={isReady ? "ready" : "not"}
                    className="block"
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-110%" }}
                    transition={{ type: "spring", stiffness: 260, damping: 30, mass: 1 }}
                  >
                    {isReady ? "Ready" : "Not ready"}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className={cn("text-right font-mono text-[10.5px] leading-4 tracking-[0.08em] uppercase", isReady ? "text-pollen-ink" : "text-fg-muted")}>
                {isReady ? "Feeder may run" : `Blocked at ${CONDS[firstFalse].label}`}
              </span>
            </div>

            <div className="mt-4 border border-hairline bg-bg px-4 py-3">
              <p className="font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">Driver telemetry · getReadinessText()</p>
              <p className="mt-1.5 font-mono text-[13px] leading-6 [overflow-wrap:anywhere] text-fg">
                <span className="text-fg-muted">&gt;&gt;&gt; </span>
                {readiness(value)}
                <span className="text-fg-muted"> &lt;&lt;&lt;</span>
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Magnetic>
              <button
                type="button"
                onClick={pull}
                className="inline-flex h-11 items-center gap-2 rounded-sm border border-border-ui bg-surface-2 px-4 text-[14px] font-medium text-fg transition-[background-color,color,border-color] duration-[120ms] ease-out hover:border-fg focus-visible:border-fg"
              >
                <RollText>Pull the trigger</RollText>
              </button>
              </Magnetic>
              <p className="min-w-0 flex-1 font-mono text-[11.5px] leading-5 text-fg-muted" aria-live="polite">
                {shot ? (
                  shot.fed ? (
                    <>
                      <span className="text-fg">feeder.setPower(1.0)</span> · ball fed
                    </>
                  ) : (
                    <>
                      <span className="text-fg">feeder.setPower(0.0)</span> · request refused
                    </>
                  )
                ) : (
                  <>trigger &gt; 0.5 &amp;&amp; isReadyToFire()</>
                )}
                {fed > 0 && <span className="ml-2 text-[10px] tracking-[0.08em] uppercase">· fed {fed}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* the listing */}
      <div className="min-w-0 lg:col-span-7" style={{ "--i": 1 } as CSSProperties}>
        <CodeFigure
          title={ready.title}
          meta={`${ready.file}${ready.startLine ? ` · L${ready.startLine}${ready.endLine ? `–${ready.endLine}` : ""}` : ""}`}
          href={href}
        >
          <CodeView lines={ready.lines} startLine={ready.startLine} states={states} notes={notes} statusGutter label={`${ready.title}, ${ready.file}`} className="text-[13.5px] sm:py-6" />
        </CodeFigure>
        <Stagger as="dl" className="mt-6 grid gap-px border border-hairline bg-hairline sm:grid-cols-2" delay={0.2}>
          <Fact term="Why four, not one">
            On a robot that is also driving, any one of them can be false without the driver noticing. The code checks them and lights one indicator.
          </Fact>
          <Fact term="Why at speed means settled">
            A wheel spinning up passes through its target on the way to overshooting. A ball fed then gets the right speed for a millisecond.
          </Fact>
          <Fact term="Short-circuit">
            Java&apos;s &amp;&amp; stops at the first false, so the lines after it never run. The listing shows where this loop&apos;s check stopped.
          </Fact>
          <Fact term="Why it matters">Under the provisional scoring a HIVE TIP is worth 20 points, an element in a CELL 2. Tips need balls in the CELL, and a ball fired before the wheel settled misses it.</Fact>
        </Stagger>
      </div>
    </Armed>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-hairline first:border-t-0">
      <p className="px-4 pt-3 pb-1 font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase sm:px-5">{title}</p>
      <ul>{children}</ul>
    </div>
  );
}

function GateRow({
  cond,
  lamp,
  pressed,
  passing,
  holding,
  onToggle,
}: {
  cond: Cond;
  /** Position in the lamp test that runs when the panel tilts in. */
  lamp: number;
  pressed: boolean;
  passing: boolean;
  holding?: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={pressed}
        onClick={onToggle}
        className="group grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-3 text-left transition-colors duration-[120ms] outline-offset-[-2px] hover:bg-surface-2 sm:px-5"
      >
        <span aria-hidden="true" className="relative mt-[5px] flex size-3 items-center justify-center">
          <span
            style={{ "--lamp": lamp } as CSSProperties}
            className={cn(
              "code-lamp size-2 rounded-full transition-[background-color,box-shadow] duration-[120ms]",
              passing ? "bg-pollen-line shadow-[0_0_0_3px_color-mix(in_oklab,var(--pollen-line)_22%,transparent)]" : "bg-border-ui",
            )}
          />
          {holding && (
            <svg viewBox="0 0 12 12" className="absolute inset-0 size-3 -rotate-90 motion-reduce:hidden">
              <motion.circle
                cx="6"
                cy="6"
                r="5"
                fill="none"
                stroke="var(--pollen-line)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: HOLD_MS / 1000, ease: "linear" }}
              />
            </svg>
          )}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className={cn("font-mono text-[12px] tracking-[0.08em] uppercase", passing ? "text-fg" : "text-fg-muted")}>{cond.label}</span>
            <span className="font-mono text-[11px] text-fg-muted">{cond.call}</span>
          </span>
          <span className="mt-1 block text-[13.5px] leading-5 text-fg-muted">{cond.detail}</span>
        </span>
        {/* switch */}
        <span
          aria-hidden="true"
          className={cn(
            "relative mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-sm border transition-colors duration-[120ms]",
            pressed ? "border-fg bg-surface-2" : "border-border-ui",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 h-3 w-3.5 -translate-y-1/2 rounded-[1px] transition-[left,background-color] duration-[220ms] ease-out motion-reduce:transition-none",
              pressed ? "left-[calc(100%-1rem)] bg-fg" : "left-0.5 bg-border-ui",
            )}
          />
        </span>
        <span className="sr-only">{pressed ? " — true" : " — false"}</span>
      </button>
    </li>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <StaggerItem className="bg-bg p-4 sm:p-5">
      <dt className="font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">{term}</dt>
      <dd className="mt-2 text-[14px] leading-6 text-fg-muted">{children}</dd>
    </StaggerItem>
  );
}
