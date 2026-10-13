// ─────────────────────────────────────────────────────────────────────────────
// Story bus — the ONE channel between the home page's DOM scroll driver (home-story.tsx) and the
// 3D stage (home-stage.tsx). Everything that changes per frame is a motion MotionValue (DOM binds
// to it without React renders; the R3F loop reads `.get()` in useFrame). Inputs from the DOM to
// the scene (pointer, fire requests) are plain mutable fields — never rendered.
//
// Story position `pos` (the single source of truth for the choreography):
//   0 → 1        the name collapses into the robot (scroll 0 → 1 viewport)
//   1 + i + t    chapter i (0-based), t ∈ [0, 1) across its pinned slot
//   7 →          past the last chapter (the robot exits, the stage unpins)
// ─────────────────────────────────────────────────────────────────────────────

import { motionValue, type MotionValue } from "motion/react";
import type { SubsystemId } from "@/content/robot";

export type StoryLayout = "sides" | "stack";

/** What the scene needs to know about each chapter (from content/robot.ts homeChapters). */
export interface StoryChapterSpec {
  id: string;
  code: string;
  /** Which side of a landscape screen the ROBOT takes: +1 right, −1 left (text takes the other). */
  side: 1 | -1;
  focus: SubsystemId[];
}

/** Index of the interactive AIM chapter (C5) in homeChapters. */
export const AIM_CHAPTER = 4;
export const CHAPTER_COUNT = 6;

export type AimStatus = "IDLE" | "AIMING" | "READY" | "ARMED" | "IN FLIGHT" | "NO SOLUTION" | "LIMIT";

export interface StoryBus {
  /** Story position (see header). */
  pos: MotionValue<number>;
  /** Name → robot collapse, 0..1. */
  collapse: MotionValue<number>;
  /** Scrubbed robot side target: −1 left · 0 centre · +1 right. */
  sideTarget: MotionValue<number>;
  /** Robot exit after the last chapter, 0..1. */
  exit: MotionValue<number>;
  /** Active chapter index (−1 before C1). */
  chapter: MotionValue<number>;
  /** 0..1 how much the AIM chapter owns the stage (camera pull-back, target, HUD). */
  aimBlend: MotionValue<number>;

  /** Telemetry written by the 3D loop. */
  hdgDeg: MotionValue<number>;
  turretDeg: MotionValue<number>;
  /** 1 locked · 0 slewing · −1 parked on the ±170° stop. */
  lock: MotionValue<number>;
  /** 1 once the WebGL scene has rendered. */
  ready: MotionValue<number>;

  /** Live solver readout (C5) — every number comes from src/lib/ballistics.ts. */
  aim: {
    valid: MotionValue<number>;
    rangeIn: MotionValue<number>;
    tofSec: MotionValue<number>;
    rpm: MotionValue<number>;
    rpmNow: MotionValue<number>;
    turretDeg: MotionValue<number>;
    iter: MotionValue<number>;
    /** Apex height in inches, or −1 when the ball is still rising at the target. */
    apexIn: MotionValue<number>;
    gates: [MotionValue<number>, MotionValue<number>, MotionValue<number>, MotionValue<number>];
    status: MotionValue<AimStatus>;
    failReason: MotionValue<string>;
    shots: MotionValue<number>;
  };

  /** DOM → scene inputs (mutable, never rendered). */
  input: {
    /** Pointer over the aim zone, in canvas NDC (−1..1). */
    pointer: { inside: boolean; ndcX: number; ndcY: number; stamp: number };
    /** Incremented on every fire request (button, click, tap, ⌘K). */
    fire: number;
  };
}

export function createStoryBus(): StoryBus {
  const mv = (v: number) => motionValue(v);
  return {
    pos: mv(0),
    collapse: mv(0),
    sideTarget: mv(0),
    exit: mv(0),
    chapter: mv(-1),
    aimBlend: mv(0),
    hdgDeg: mv(0),
    turretDeg: mv(0),
    lock: mv(1),
    ready: mv(0),
    aim: {
      valid: mv(0),
      rangeIn: mv(0),
      tofSec: mv(0),
      rpm: mv(0),
      rpmNow: mv(0),
      turretDeg: mv(0),
      iter: mv(0),
      apexIn: mv(0),
      gates: [mv(0), mv(0), mv(0), mv(0)],
      status: motionValue<AimStatus>("IDLE"),
      failReason: motionValue(""),
      shots: mv(0),
    },
    input: {
      pointer: { inside: false, ndcX: 0, ndcY: 0, stamp: 0 },
      fire: 0,
    },
  };
}

// ─── Shared maths ────────────────────────────────────────────────────────────────────────────

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
/** smoothstep between edges a → b. */
export const step = (a: number, b: number, v: number) => smooth((v - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Where the robot sits for a story position: −1/0/+1 side target, blended across each chapter
 * boundary (the robot leaves after the old text has faded and arrives before the new text shows).
 */
export function sideAt(pos: number, sides: number[]): number {
  // segment 0 = intro (centre), segment k (1..6) = chapter k−1
  const seg = (k: number) => (k <= 0 ? 0 : sides[Math.min(k, sides.length) - 1]);
  const b = Math.round(pos); // nearest boundary
  if (b < 1 || b > sides.length) return seg(Math.floor(pos));
  const t = step(b - 0.11, b + 0.07, pos);
  return lerp(seg(b - 1), seg(b), t);
}

/** Text panel visibility for chapter i at story position `pos` (scroll part only). */
export function panelVisibility(pos: number, i: number, last: boolean) {
  const t = pos - 1 - i;
  const fadeIn = step(0.07, 0.2, t);
  const fadeOut = last ? 1 - step(0.86, 0.97, t) : 1 - step(0.79, 0.89, t);
  return { visible: fadeIn * fadeOut, enter: fadeIn, leave: 1 - fadeOut };
}

/** How much the AIM chapter (C5) owns the stage. */
export function aimBlendAt(pos: number) {
  const a = 1 + AIM_CHAPTER;
  return step(a - 0.12, a + 0.1, pos) * (1 - step(a + 1 - 0.14, a + 1 + 0.06, pos));
}
