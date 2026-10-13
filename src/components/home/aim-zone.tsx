"use client";
/* eslint-disable react-hooks/immutability --
   The home story deliberately mutates its shared input bus (bus.input.fire / pointer) and three.js
   objects inside useFrame / motion-value callbacks: per-frame state that must not re-render React.
   The React Compiler is not enabled (next.config.ts), so this rule has no runtime meaning here. */

// AimZone — the interactive half of the stage in C5 (DESIGN_SPEC §5 C5): the Watermelon cursor
// reticle (scoped to this zone, fine pointers only) aims the turret at the pointer; a click — or a
// tap on touch screens — fires POLLEN. `F` fires from the keyboard while C5 is on screen; the
// visible "Fire POLLEN" button in the chapter does the same. Pointer positions go to the story bus
// as canvas NDC; the scene raycasts them onto the field.

import { motion, useMotionValueEvent, useTransform } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Cursor, CursorFollow, CursorProvider } from "@/components/ui/cursor";
import { fmtFixed, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AimStatus, StoryBus, StoryLayout } from "./story-bus";

export function AimZone({
  bus,
  active,
  layout,
  side,
  region,
  stageRef,
}: {
  bus: StoryBus;
  active: boolean;
  layout: StoryLayout;
  /** Robot side in C5 (+1 right / −1 left): the zone is that half. */
  side: 1 | -1;
  /** Stack layout: robot region height (px). */
  region: number;
  stageRef: RefObject<HTMLDivElement | null>;
}) {
  const [status, setStatus] = useState<AimStatus>("IDLE");
  useMotionValueEvent(bus.aim.status, "change", setStatus);
  const down = useRef<{ x: number; y: number; t: number } | null>(null);

  const setNdc = (clientX: number, clientY: number) => {
    const st = stageRef.current;
    if (!st) return;
    const r = st.getBoundingClientRect();
    const p = bus.input.pointer;
    p.ndcX = ((clientX - r.left) / r.width) * 2 - 1;
    p.ndcY = -(((clientY - r.top) / r.height) * 2 - 1);
    p.inside = true;
    p.stamp = performance.now();
  };

  // leaving C5 releases the pointer; `F` fires while C5 is active
  useEffect(() => {
    const p = bus.input.pointer;
    if (!active) {
      p.inside = false;
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      bus.input.fire += 1;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, bus]);

  const style =
    layout === "sides"
      ? { top: "var(--header-h)", bottom: 0, width: "50%", left: side > 0 ? "50%" : 0 }
      : { top: 0, left: 0, right: 0, height: region };

  return (
    <div
      className={cn("absolute touch-pan-y select-none", active ? "pointer-events-auto" : "pointer-events-none")}
      style={style}
      onPointerMove={(e) => {
        if (active && (e.pointerType === "mouse" || e.pointerType === "pen")) setNdc(e.clientX, e.clientY);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" || e.pointerType === "pen") bus.input.pointer.inside = false;
      }}
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      }}
      onPointerUp={(e) => {
        const d = down.current;
        down.current = null;
        if (!active || !d) return;
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 600) return;
        setNdc(e.clientX, e.clientY);
        bus.input.fire += 1;
      }}
    >
      {active && (
        <CursorProvider>
          <Cursor locked={status === "READY" || status === "ARMED"} blocked={status === "NO SOLUTION" || status === "LIMIT"} />
          <CursorFollow side="bottom" align="end">
            <FollowLabel bus={bus} status={status} />
          </CursorFollow>
        </CursorProvider>
      )}
    </div>
  );
}

const STATUS_HINT: Record<AimStatus, string> = {
  IDLE: "AIM",
  AIMING: "SETTLING",
  READY: "CLICK TO FIRE",
  ARMED: "WAITING FOR 4 GATES",
  "IN FLIGHT": "IN FLIGHT · 0.5× SLOW-MO",
  "NO SOLUTION": "NO SOLUTION",
  LIMIT: "TURRET LIMIT",
};

function FollowLabel({ bus, status }: { bus: StoryBus; status: AimStatus }) {
  const range = useTransform(bus.aim.rangeIn, (v) => `${fmtFixed(v, 1)} IN`);
  const rpm = useTransform(bus.aim.rpm, (v) => `${fmtInt(v)} RPM`);
  const ok = status !== "NO SOLUTION" && status !== "LIMIT";
  return (
    <span className="flex flex-col gap-0.5 uppercase">
      <span className={cn(status === "READY" ? "text-pollen-text" : "text-fg")}>{STATUS_HINT[status]}</span>
      {ok && (
        <span className="text-fg-muted">
          <motion.span>{range}</motion.span> · <motion.span>{rpm}</motion.span>
        </span>
      )}
    </span>
  );
}
