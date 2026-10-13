// Shared state between the DOM half of /robot (panels, controls, overlay chrome) and the 3D half
// (the lazy-loaded R3F scene). Plain TypeScript, no React and no three.js, so it lives in the main
// bundle. Inputs are written by the DOM and read every frame by the scene; per-frame outputs are
// written straight into registered DOM nodes (no React re-render), and the AIM readout is
// published at ~10 Hz to subscribers (useSyncExternalStore).

import type { Gates } from "./data";
import { AIM_DEFAULTS } from "./data";

export type ViewMode = "assembled" | "exploded" | "xray";

/** One walkthrough stop measured from the DOM: the scroll position at which it is centred. */
export interface MeasuredStop {
  y: number;
}

export interface AimReadout {
  /** True while the 3D simulation is publishing (false → panel shows the steady state). */
  live: boolean;
  rpmNow: number;
  rpmTarget: number;
  gates: Gates;
  ready: boolean;
  readiness: string;
  /** Seconds since the chassis webcam last saw the HIVE (Infinity = never). */
  estimateAge: number;
  seen: boolean;
  inFlight: boolean;
  shots: number;
  /** Message after a FIRE press: "IN" or the reason the feeder held the ball. */
  lastShot: { ok: boolean; text: string; seq: number } | null;
}

export const IDLE_READOUT: AimReadout = {
  live: false,
  rpmNow: 0,
  rpmTarget: 0,
  gates: { solution: false, onTarget: false, atSpeed: false, fresh: true },
  ready: false,
  readiness: "",
  estimateAge: 0,
  seen: true,
  inFlight: false,
  shots: 0,
  lastShot: null,
};

/** DOM nodes the scene writes into every frame (registered by the stage chrome). */
export interface OverlayNodes {
  heading?: HTMLElement | null;
  turret?: HTMLElement | null;
  lock?: HTMLElement | null;
  lockDot?: HTMLElement | null;
  radarChassis?: SVGGElement | null;
  radarTurret?: SVGGElement | null;
  bracket?: HTMLElement | null;
  bracketTag?: HTMLElement | null;
  cubeLabel?: HTMLElement | null;
  apexLabel?: HTMLElement | null;
  targetLabel?: HTMLElement | null;
  rangeLabel?: HTMLElement | null;
  hitLabel?: HTMLElement | null;
}

export class RobotPageStore {
  // ── inputs (DOM → scene) ──
  mode: ViewMode = "assembled";
  /** Active stop index (0 = overview … 9 = AIM), computed from the scroll position. */
  active = 0;
  reduced = false;
  stacked = false;
  stops: MeasuredStop[] = [];
  aim = { rangeIn: AIM_DEFAULTS.rangeIn as number, turretDeg: AIM_DEFAULTS.turretDeg as number };
  /** Incremented by the FIRE button; the scene fires once per increment. */
  fireSeq = 0;
  /** Set by a click on the canvas: the scene raycasts it and reports the part. */
  pick: { x: number; y: number; seq: number } | null = null;
  onPick: ((stopIndex: number) => void) | null = null;

  // ── outputs (scene → DOM) ──
  dom: OverlayNodes = {};
  private readout: AimReadout = IDLE_READOUT;
  private listeners = new Set<() => void>();

  // ── writers used by the DOM half (methods, so React components never assign to a prop) ──
  setInputs(next: { mode: ViewMode; reduced: boolean; stacked: boolean; active: number }) {
    this.mode = next.mode;
    this.reduced = next.reduced;
    this.stacked = next.stacked;
    this.active = next.active;
  }
  setStops(stops: MeasuredStop[]) {
    this.stops = stops;
  }
  setAim(rangeIn: number, turretDeg: number) {
    this.aim.rangeIn = rangeIn;
    this.aim.turretDeg = turretDeg;
  }
  fire() {
    this.fireSeq += 1;
  }
  requestPick(x: number, y: number) {
    this.pick = { x, y, seq: (this.pick?.seq ?? 0) + 1 };
  }
  setOnPick(fn: ((stopIndex: number) => void) | null) {
    this.onPick = fn;
  }
  register<K extends keyof OverlayNodes>(key: K, el: OverlayNodes[K] | null) {
    this.dom[key] = el as OverlayNodes[K];
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  getReadout = () => this.readout;

  publish(next: AimReadout) {
    const a = this.readout;
    const same =
      a.live === next.live &&
      Math.round(a.rpmNow / 10) === Math.round(next.rpmNow / 10) &&
      Math.round(a.rpmTarget) === Math.round(next.rpmTarget) &&
      a.ready === next.ready &&
      a.readiness === next.readiness &&
      a.gates.solution === next.gates.solution &&
      a.gates.onTarget === next.gates.onTarget &&
      a.gates.atSpeed === next.gates.atSpeed &&
      a.gates.fresh === next.gates.fresh &&
      a.seen === next.seen &&
      Math.round(a.estimateAge * 10) === Math.round(next.estimateAge * 10) &&
      a.inFlight === next.inFlight &&
      a.shots === next.shots &&
      a.lastShot?.seq === next.lastShot?.seq;
    if (same) return;
    this.readout = next;
    this.listeners.forEach((l) => l());
  }
}
