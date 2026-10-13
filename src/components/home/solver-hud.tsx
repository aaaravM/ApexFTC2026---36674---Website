"use client";

// SolverHud — C5's live readout (DESIGN_SPEC §5 C5): a Cult UI dynamic island that morphs between
// states the solver is actually in — SETTLING / READY / ARMED / IN FLIGHT (the full readout),
// NO SOLUTION or LIMIT (the solver's failReason, verbatim). Every number is a field of the
// `Solution` returned by src/lib/ballistics.ts (the port of the team's Ballistics.java); the four
// LEDs are AimController.isReadyToFire()'s gates. Numbers update through MotionValues (no React
// render per frame); screen readers only hear state changes (polite live region).

import { motion, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import {
  DynamicContainer,
  DynamicIsland,
  DynamicIslandProvider,
  useDynamicIslandSize,
  type SizePresets,
} from "@/components/ui/dynamic-island";
import { Magnetic, RollText } from "@/components/motion";
import { Button } from "@/components/site/button";
import { fireGates } from "@/content/code";
import { fmtFixed, fmtInt, fmtSigned } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { AimStatus, StoryBus, StoryLayout } from "./story-bus";

const ANNOUNCE: Record<AimStatus, string> = {
  IDLE: "",
  AIMING: "Aiming: turret settling.",
  READY: "Ready to fire: all four gates pass.",
  ARMED: "Fire requested: waiting for all four gates.",
  "IN FLIGHT": "POLLEN in flight.",
  "NO SOLUTION": "No solution.",
  LIMIT: "Turret limit.",
};

const CHIP: Record<AimStatus, string> = {
  IDLE: "IDLE",
  AIMING: "SETTLING",
  READY: "READY",
  ARMED: "ARMED",
  "IN FLIGHT": "IN FLIGHT · 0.5×",
  "NO SOLUTION": "NO SOLUTION",
  LIMIT: "LIMIT",
};

export function SolverHud({
  bus,
  active,
  onFire,
  link,
  layout,
}: {
  bus: StoryBus;
  active: boolean;
  onFire: () => void;
  link?: ReactNode;
  layout: StoryLayout;
}) {
  const short = useMediaQuery("(max-height: 620px)");
  const compact = layout === "stack" || short;
  return (
    <div className="mt-[clamp(14px,2.6vh,28px)]">
      <DynamicIslandProvider initialSize="compactLong">
        <HudIsland bus={bus} compact={compact} />
      </DynamicIslandProvider>
      <div className="mt-[clamp(12px,2vh,20px)] flex flex-wrap items-center gap-x-6 gap-y-3">
        <Magnetic>
          <Button onClick={onFire} aria-keyshortcuts="F" aria-disabled={!active || undefined}>
            <span aria-hidden="true" className="mr-2.5 inline-block size-2 rounded-full border border-pollen-edge bg-pollen align-[0.05em]" />
            <RollText>Fire POLLEN</RollText>
          </Button>
        </Magnetic>
        {link && <Magnetic>{link}</Magnetic>}
      </div>
      <p className="mt-3 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
        <span className="hidden pointer-fine:inline">Move over the field to aim · click or press F to fire</span>
        <span className="pointer-fine:hidden">Tap the field beside the robot to aim and fire</span>
      </p>
    </div>
  );
}

function sizeFor(status: AimStatus, compact: boolean): SizePresets {
  if (status === "IDLE") return "compactLong";
  if (status === "NO SOLUTION" || status === "LIMIT") return "long";
  return compact ? "long" : "medium";
}

function HudIsland({ bus, compact }: { bus: StoryBus; compact: boolean }) {
  const { state, setSize } = useDynamicIslandSize();
  const [status, setStatus] = useState<AimStatus>("IDLE");
  const [fail, setFail] = useState("");
  useMotionValueEvent(bus.aim.status, "change", setStatus);
  useMotionValueEvent(bus.aim.failReason, "change", setFail);
  // keep the island's size in step with the solver state (and the layout)
  const want = sizeFor(status, compact);
  useEffect(() => {
    setSize(want);
  }, [want, setSize]);
  // the island's own size state picks the content (so box and content always agree)
  const size = state.size;
  const announce = status === "NO SOLUTION" || status === "LIMIT" ? `${ANNOUNCE[status]} ${fail}` : ANNOUNCE[status];

  // formatted readouts (MotionValues → text; created unconditionally)
  const range = useTransform(bus.aim.rangeIn, (v) => `${fmtFixed(v, 1)} in`);
  const rangeShort = useTransform(bus.aim.rangeIn, (v) => fmtFixed(v, 1));
  const tof = useTransform(bus.aim.tofSec, (v) => `${fmtFixed(v, 3)} s`);
  const tofShort = useTransform(bus.aim.tofSec, (v) => fmtFixed(v, 2));
  const rpm = useTransform(bus.aim.rpm, (v) => fmtInt(v));
  const turret = useTransform(bus.aim.turretDeg, (v) => `${fmtSigned(v, 1)}°`);
  const iter = useTransform(bus.aim.iter, (v) => String(v));
  const apex = useTransform(bus.aim.apexIn, (v) => (v < 0 ? "rising" : `${fmtFixed(v, 1)} in`));

  return (
    <DynamicIsland id="home-hud" announce={announce} containerClassName="justify-start" className="relative mx-0 text-left">
      {size === "medium" ? (
        <DynamicContainer key="full" className="absolute inset-0 flex flex-col px-4 pt-3 pb-3.5 font-mono">
          <Header status={status} />
          <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3 border-t border-hairline pt-3">
            <Cell label="Range" value={range} />
            <Cell label="TOF" value={tof} />
            <Cell label="RPM" value={rpm} />
            <Cell label="Turret" value={turret} />
            <Cell label="Iter" value={iter} />
            <Cell label="Apex" value={apex} />
          </dl>
          <Gates bus={bus} className="mt-auto" />
        </DynamicContainer>
      ) : size === "long" && (status === "NO SOLUTION" || status === "LIMIT") ? (
        <DynamicContainer key="fail" className="absolute inset-0 flex flex-col justify-center gap-1.5 px-4 font-mono">
          <Header status={status} />
          <p className="text-[11px] leading-4 tracking-[0.02em] text-fg">
            {fail}
            {status === "LIMIT" && <span className="text-fg-muted"> · scroll to turn it</span>}
          </p>
        </DynamicContainer>
      ) : size === "long" ? (
        <DynamicContainer key="compact" className="absolute inset-0 flex flex-col justify-center gap-2 px-3.5 font-mono">
          <div className="flex items-center justify-between gap-3 text-[10.5px] tracking-[0.04em] whitespace-nowrap tabular-nums">
            <span className="flex gap-3">
              <InlineCell label="RNG" value={rangeShort} />
              <InlineCell label="TOF" value={tofShort} />
              <InlineCell label="RPM" value={rpm} />
            </span>
            <StatusChip status={status} />
          </div>
          <Gates bus={bus} dense />
        </DynamicContainer>
      ) : (
        <DynamicContainer key="prompt" className="absolute inset-0 flex items-center justify-between gap-3 px-4 font-mono">
          <span className="text-[10px] tracking-[0.08em] text-fg-muted uppercase">solve() · Ballistics.java</span>
          <span className="text-[10px] tracking-[0.08em] text-fg uppercase">Acquiring</span>
        </DynamicContainer>
      )}
    </DynamicIsland>
  );
}

function Header({ status }: { status: AimStatus }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] tracking-[0.08em] whitespace-nowrap text-fg-muted uppercase">
        solve() · <span className="normal-case">Ballistics.java</span>
      </span>
      <StatusChip status={status} />
    </div>
  );
}

function StatusChip({ status }: { status: AimStatus }) {
  const ready = status === "READY";
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-sm border px-1.5 text-[10px] leading-none tracking-[0.08em] whitespace-nowrap uppercase",
        ready ? "border-pollen-edge bg-pollen text-pollen-ink" : status === "NO SOLUTION" || status === "LIMIT" ? "border-border-ui text-fg hatch" : "border-hairline text-fg",
      )}
    >
      {CHIP[status]}
    </span>
  );
}

function Cell({ label, value }: { label: string; value: MotionValue<string> }) {
  return (
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="mt-0.5 text-[9.5px] tracking-[0.08em] text-fg-muted uppercase">{label}</dt>
      <motion.dd className="text-[15px] leading-5 whitespace-nowrap text-fg tabular-nums">{value}</motion.dd>
    </div>
  );
}

function InlineCell({ label, value }: { label: string; value: MotionValue<string> }) {
  return (
    <span>
      <span className="text-fg-muted">{label} </span>
      <motion.span className="text-fg">{value}</motion.span>
    </span>
  );
}

function Gates({ bus, className, dense }: { bus: StoryBus; className?: string; dense?: boolean }) {
  return (
    <ul aria-label="Fire gates" className={cn("flex justify-between gap-2", !dense && "border-t border-hairline pt-2.5", className)}>
      {fireGates.map((g, i) => (
        <Gate key={g.id} label={g.label} on={bus.aim.gates[i]} detail={g.detail} />
      ))}
    </ul>
  );
}

function Gate({ label, on, detail }: { label: string; on: MotionValue<number>; detail: string }) {
  const bg = useTransform(on, (v) => (v > 0.5 ? "var(--pollen-line)" : "transparent"));
  const fg = useTransform(on, (v) => (v > 0.5 ? "var(--text)" : "var(--muted)"));
  return (
    <li className="flex min-w-0 shrink items-center gap-1.5" title={detail}>
      <motion.span aria-hidden="true" className="size-1.5 shrink-0 rounded-full border border-pollen-line" style={{ backgroundColor: bg }} />
      <motion.span className="truncate text-[9.5px] leading-3 tracking-[0.04em] uppercase" style={{ color: fg }}>
        {label}
      </motion.span>
    </li>
  );
}
