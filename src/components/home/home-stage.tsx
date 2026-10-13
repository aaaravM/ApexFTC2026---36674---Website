"use client";
/* eslint-disable react-hooks/immutability --
   The home story deliberately mutates its shared input bus (bus.input.fire / pointer) and three.js
   objects inside useFrame / motion-value callbacks: per-frame state that must not re-render React.
   The React Compiler is not enabled (next.config.ts), so this rule has no runtime meaning here. */

// ─────────────────────────────────────────────────────────────────────────────
// HomeStage — the ONE WebGL canvas of the home story (loaded lazily by home-story.tsx, so three.js
// never blocks the name screen). Everything here is driven from the story bus:
//
//   • camera: view-offset side placement (the robot never moves in the world — the projection
//     slides it to the right/left half, so lighting and the contact shadow stay put), framing
//     distance computed from the viewport, per-chapter elevation / zoom keyframes, and the C5
//     pull-back that brings the HIVE CELL into frame
//   • chassis: heading scrubbed by scroll (damped, reversible); wheels turn with the yaw rate
//   • turret: holds a world-space lock exactly like Turret.java — clamp(wrap(azimuth − heading)),
//     plus heading-rate feedforward — so it counter-rotates while the chassis spins
//   • collapse: the robot assembles (explode 1 → 0) and grows 0.4 → 1 out of the stage centre
//   • C5: pointer → floor raycast → CELL target; the team's solver (src/lib/ballistics.ts) gives
//     the arc, apex, RPM and turret angle; four AimController gates; POLLEN flies along the arc
// ─────────────────────────────────────────────────────────────────────────────

import { useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import {
  ApexRobot,
  HIVE,
  IN,
  Stage,
  TURRET,
  clampTurret,
  mecanumWheelSpeeds,
  wrapAngle,
  type ApexRobotHandle,
  type RobotCommand,
  type SubsystemId,
  type WheelSpeeds,
} from "@/components/robot";
import { SceneShell } from "@/components/three";
import { apexOf, ballPosition, solve, type Solution, type SolveInput } from "@/lib/ballistics";
import { fmtFixed } from "@/lib/format";
import {
  AIM_CHAPTER,
  aimBlendAt,
  clamp01,
  lerp,
  step,
  type AimStatus,
  type StoryBus,
  type StoryChapterSpec,
  type StoryLayout,
} from "./story-bus";

// ─── Composition constants ───────────────────────────────────────────────────────────────────

const FOV = 26;
const TAN_HALF = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const D2R = Math.PI / 180;
/** Camera azimuth around the robot (world, atan2(x, z)); the robot's +Z is its front. */
const CAM_AZ = 38 * D2R;
/** Turret lock direction in the scroll chapters: toward the viewer, angled a little to screen-left. */
const LOCK_AZ = CAM_AZ - 24 * D2R;
/**
 * C5: the HIVE CELL sits to the robot's screen-right and a little away from the camera, so the shot
 * is seen almost side-on — the parabola and its APEX read clearly (≈122° from the aim camera).
 */
const AIM_AZ = CAM_AZ + 112 * D2R;
/** C5 framing: look at the middle of the shot, radius that fits robot + arc + CELL in the stage half. */
const AIM_LOOK_DIST = 1.38;
const AIM_LOOK_Y = 0.58;
const AIM_RADIUS = 1.66;
const AIM_ELEV = 20;
const AIM_DEFAULT_IN = 110;
/** Aim point height: centre of the upward CELL opening (robot engine's HIVE estimate). */
const AIM_H_IN = HIVE.aimHeightIn;
/** Chassis heading relative to the lock, swept across the story (≈ 0.9 turn — the lock never breaks). */
const REL_START = -160 * D2R;
const REL_END = 160 * D2R;
const SLOWMO = 0.5;

/** Per-segment camera keyframes (segment 0 = intro, 1..6 = C1..C6). */
const KEYS = [
  { elev: 13, zoom: 1.0, lookY: 0.2 },
  { elev: 15, zoom: 1.0, lookY: 0.2 },
  { elev: 20, zoom: 1.06, lookY: 0.21 },
  { elev: 8, zoom: 0.93, lookY: 0.17 },
  { elev: 26, zoom: 0.95, lookY: 0.19 },
  { elev: 24, zoom: 1.0, lookY: 0.2 }, // C5 (blended into the aim camera)
  { elev: 15, zoom: 1.0, lookY: 0.2 },
];
/** Mobile: the robot shifts a touch left/right per chapter instead of switching sides. */
const STACK_SHIFT = [0, -0.035, 0.035, -0.03, 0.03, 0, -0.03];

function keyAt(pos: number) {
  const b = Math.round(pos);
  const k = (i: number) => KEYS[Math.max(0, Math.min(KEYS.length - 1, i))];
  const shift = (i: number) => STACK_SHIFT[Math.max(0, Math.min(STACK_SHIFT.length - 1, i))];
  if (b < 1) return { ...k(0), shift: shift(0) };
  const t = step(b - 0.12, b + 0.1, pos);
  const a = k(b - 1);
  const c = k(b);
  return {
    elev: lerp(a.elev, c.elev, t),
    zoom: lerp(a.zoom, c.zoom, t),
    lookY: lerp(a.lookY, c.lookY, t),
    shift: lerp(shift(b - 1), shift(b), t),
  };
}

/** Subsystem to spotlight at a story position: focus list split across the chapter's reading window. */
function highlightAt(pos: number, chapters: StoryChapterSpec[]): SubsystemId | null {
  const i = Math.floor(pos - 1);
  const c = chapters[i];
  if (!c || !c.focus.length || i === AIM_CHAPTER) return null;
  const t = pos - 1 - i;
  if (t < 0.12 || t > 0.86) return null;
  const k = Math.min(c.focus.length - 1, Math.floor(((t - 0.12) / 0.74) * c.focus.length));
  return c.focus[k];
}

// ─── Colour helpers (theme-aware line colours for the aim overlay) ─────────────────────────────

const INK = { dark: "#ECECE7", light: "#111110" } as const;
const POLLEN_LINE = { dark: "#F7E326", light: "#7A6A00" } as const;

// ─── Public component ────────────────────────────────────────────────────────────────────────

export interface HomeStageProps {
  bus: StoryBus;
  /** Heavy-spring side position (−1..1), shared with the DOM text gating. */
  side: MotionValue<number>;
  chapters: StoryChapterSpec[];
  layout: StoryLayout;
  reduced: boolean;
  tone: "dark" | "light";
  /** Height of the robot region in stack layout (px). */
  stackRegion: number;
}

/** DOM labels the scene positions every frame (projected from 3D, no extra React roots). */
interface Labels {
  apex: HTMLDivElement | null;
  apexValue: HTMLSpanElement | null;
  target: HTMLDivElement | null;
  targetValue: HTMLSpanElement | null;
}

export default function HomeStage(props: HomeStageProps) {
  const labels = useRef<Labels>({ apex: null, apexValue: null, target: null, targetValue: null });
  const label =
    "pointer-events-none absolute top-0 left-0 font-mono text-[10px] leading-4 tracking-[0.08em] whitespace-nowrap uppercase opacity-0 will-change-transform";
  return (
    <div className="absolute inset-0">
      <SceneShell
        className="absolute inset-0"
        label="APEX-R1 concept model. Scrolling spins the chassis while the turret holds its lock; in chapter five it aims and fires POLLEN along the solver's arc."
        camera={{ fov: FOV, near: 0.05, far: 60, position: [1.6, 0.7, 1.9] }}
        frameloop={props.reduced ? "demand" : "always"}
        gl={{ toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.05 }}
        onCreated={() => props.bus.ready.set(1)}
      >
        <Stage look="clay" tone={props.tone} background={null} floor={false} fog={null} shadows shadowScale={1.7} stats={false}>
          <StoryScene {...props} labels={labels} />
        </Stage>
      </SceneShell>
      {/* APEX label: sits up-left of the apex tick */}
      <div
        ref={(el) => {
          labels.current.apex = el;
        }}
        aria-hidden="true"
        className={label}
      >
        <span className="absolute bottom-[10px] left-0 -translate-x-1/2 text-fg">
          APEX · <span ref={(el) => void (labels.current.apexValue = el)}>0.0</span> in
        </span>
      </div>
      {/* target label: under the CELL */}
      <div
        ref={(el) => {
          labels.current.target = el;
        }}
        aria-hidden="true"
        className={label}
      >
        <span className="absolute top-[18px] left-0 -translate-x-1/2 text-fg-muted">
          CELL · <span ref={(el) => void (labels.current.targetValue = el)}>—</span>
        </span>
      </div>
    </div>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────────────────────

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, "YXZ");

function StoryScene({ bus, side, chapters, layout, reduced, tone, stackRegion, labels }: HomeStageProps & { labels: RefObject<Labels> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const chassis = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);
  const robot = useRef<ApexRobotHandle>(null);
  const command = useRef<RobotCommand>({});
  const aim = useRef<AimState>(createAimState());
  const [preload, setPreload] = useState(0);

  // animation state (never rendered)
  const st = useRef({
    heading: LOCK_AZ + REL_START,
    headingPrev: LOCK_AZ + REL_START,
    side: 0,
    elev: KEYS[0].elev,
    zoom: 1,
    aimBlend: 0,
    look: new THREE.Vector3(0, 0.2, 0),
    settleFrames: 0,
    lastPos: -1,
    preload: 0,
  });

  // Reduced motion: render on demand — re-render when the story moves and for a short settle window.
  useEffect(() => {
    if (!reduced) return;
    const kick = () => {
      st.current.settleFrames = 90;
      invalidate();
    };
    const unsubs = [bus.pos.on("change", kick), side.on("change", kick), bus.chapter.on("change", kick)];
    kick();
    return () => unsubs.forEach((u) => u());
  }, [reduced, bus, side, invalidate]);

  useEffect(() => {
    if (!reduced) return;
    st.current.settleFrames = 90;
    invalidate();
  }, [reduced, size.width, size.height, tone, layout, invalidate]);

  // Clean up the view offset if this scene unmounts (the camera object is R3F's).
  useEffect(() => () => camera.clearViewOffset(), [camera]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const s = st.current;
    const pos = bus.pos.get();
    const collapse = bus.collapse.get();
    const exit = bus.exit.get();
    const snap = reduced;

    // ---- chassis heading: scrubbed by scroll, damped (λ 5 — "chassis"), reversible
    const relT = clamp01((pos - 0.3) / (6.95 - 0.3));
    const headingGoal = LOCK_AZ + lerp(REL_START, REL_END, relT);
    s.headingPrev = s.heading;
    s.heading = snap ? headingGoal : THREE.MathUtils.damp(s.heading, headingGoal, 5, dt);
    const omega = THREE.MathUtils.clamp((s.heading - s.headingPrev) / Math.max(dt, 1e-3), -3, 3);
    if (chassis.current) chassis.current.rotation.y = s.heading;

    // ---- C5 ownership of the stage
    const aimBlendGoal = aimBlendAt(pos);
    s.aimBlend = snap ? aimBlendGoal : THREE.MathUtils.damp(s.aimBlend, aimBlendGoal, 6, dt);
    bus.aimBlend.set(Math.round(s.aimBlend * 1000) / 1000);

    // ---- collapse (assemble + grow out of the centre) and exit (drop + fade handled in DOM)
    const grow = step(0.28, 1, collapse);
    const scale = lerp(0.4, 1, grow) * lerp(1, 0.86, exit);
    if (lift.current) {
      lift.current.scale.setScalar(scale);
      lift.current.position.y = -0.22 * exit * exit;
    }

    // ---- camera framing
    const key = keyAt(pos);
    s.elev = snap ? key.elev : THREE.MathUtils.damp(s.elev, key.elev, 4, dt);
    s.zoom = snap ? key.zoom : THREE.MathUtils.damp(s.zoom, key.zoom, 4, dt);
    const a = s.aimBlend;
    // C5 aim camera: look at the middle of the shot, higher and wider
    const aimDir = _v2.set(Math.sin(AIM_AZ), 0, Math.cos(AIM_AZ));
    const lookGoal = _v.set(0, key.lookY, 0).lerp(_v2.copy(aimDir).multiplyScalar(AIM_LOOK_DIST).setY(AIM_LOOK_Y), a);
    if (snap) s.look.copy(lookGoal);
    else s.look.lerp(lookGoal, 1 - Math.exp(-6 * dt));
    const elev = lerp(s.elev, AIM_ELEV, a) * D2R;
    const az = CAM_AZ + lerp(0, -10, a) * D2R;
    const radius = lerp(0.34, AIM_RADIUS, a);

    const W = size.width;
    const H = size.height;
    const headerH = 56;
    let regionW: number;
    let regionH: number;
    let cx: number;
    let cy: number;
    if (layout === "sides") {
      const contentW = Math.min(W, 1440 + 2 * Math.min(56, Math.max(16, W * 0.04)));
      regionW = contentW * lerp(0.46, 0.52, a);
      regionH = (H - headerH) * lerp(0.7, 0.86, a);
      s.side = side.get();
      // C5 pulls the stage centre in a touch so the CELL keeps a margin from the screen edge
      cx = W / 2 + s.side * contentW * lerp(0.255, 0.232, a);
      cy = headerH + (H - headerH) * 0.5;
    } else {
      regionW = W * 0.92;
      regionH = Math.max(140, stackRegion - headerH - 12);
      s.side = 0;
      cx = W / 2 + key.shift * W;
      cy = headerH + 6 + regionH / 2;
    }
    const fitPx = Math.max(80, Math.min(regionW, regionH));
    const dist = (radius / (TAN_HALF * (fitPx / H))) * s.zoom;
    camera.position.set(
      s.look.x + dist * Math.cos(elev) * Math.sin(az),
      s.look.y + dist * Math.sin(elev),
      s.look.z + dist * Math.cos(elev) * Math.cos(az),
    );
    camera.lookAt(s.look);
    if (camera.fov !== FOV) camera.fov = FOV;
    camera.setViewOffset(W, H, Math.round(W / 2 - cx), Math.round(H / 2 - cy), W, H);
    camera.updateProjectionMatrix();

    // ---- turret lock: world target → robot-frame yaw (Turret.java), with heading-rate feedforward
    const r = robot.current;
    chassis.current?.updateMatrixWorld(true);
    const aimTarget = aim.current.target; // world, floor point of the CELL
    const useAim = s.aimBlend > 0.5;
    const tgt = useAim
      ? _v.set(aimTarget.x, AIM_H_IN * IN, aimTarget.z)
      : _v.set(Math.sin(LOCK_AZ) * 30, 0.36, Math.cos(LOCK_AZ) * 30);
    const axis = _v2.set(0, 0, TURRET.axisXmm / 1000);
    chassis.current?.localToWorld(axis);
    const azToTarget = Math.atan2(tgt.x - axis.x, tgt.z - axis.z);
    const ff = snap ? 0 : omega * 0.12;
    const rawYaw = wrapAngle(azToTarget - s.heading - ff);
    const yawCmd = clampTurret(rawYaw);

    // ---- per-chapter mechanisms
    const ch = Math.floor(pos - 1);
    const t = pos - 1 - ch;
    const strafe = ch === 2 && t > 0.1 && t < 0.88 ? 16 : 0; // C3: mecanum strafe
    const wheels = mecanumWheelSpeeds(0, strafe, omega) as WheelSpeeds;
    const intakeOn = ch === 3 && t > 0.1 && t < 0.88;
    const wantPreload = ch === 3 || ch === AIM_CHAPTER ? 2 : 0;
    if (wantPreload !== s.preload) {
      s.preload = wantPreload;
      setPreload(wantPreload);
    }
    const explode = 1 - step(0.34, 0.96, collapse);

    const c = command.current;
    c.turretYaw = yawCmd;
    c.wheelSpeeds = wheels;
    c.intakeOn = intakeOn;
    c.explode = explode;
    c.highlight = highlightAt(pos, chapters);
    // flywheel: idle in the story, solver RPM in C5 (set by the aim layer), spin-down after
    c.flywheelRpm = useAim ? aim.current.flywheelCmd : 0;
    c.feederOn = aim.current.feederUntil > aim.current.clock;

    // ---- telemetry (HDG / TURRET / LOCK)
    const hdg = THREE.MathUtils.radToDeg(wrapAngle(s.heading));
    bus.hdgDeg.set(Math.round(hdg * 10) / 10);
    const tur = r ? THREE.MathUtils.radToDeg(r.getTurretYaw()) : THREE.MathUtils.radToDeg(yawCmd);
    bus.turretDeg.set(Math.round(tur * 10) / 10);
    const atLimit = Math.abs(rawYaw - yawCmd) > 1e-6;
    bus.lock.set(atLimit ? -1 : r?.isTurretSettled(1.5 * D2R) ? 1 : 0);

    if (snap && s.settleFrames > 0) {
      s.settleFrames -= 1;
      invalidate();
    }
    s.lastPos = pos;
  }, -2);

  return (
    <>
      <group ref={lift}>
        <group ref={chassis}>
          <ApexRobot ref={robot} command={command} look="clay" tone={tone} explodeSmoothing={0} preload={preload} reducedMotion={reduced} />
        </group>
      </group>
      <AimLayer bus={bus} robot={robot} aim={aim} tone={tone} reduced={reduced} labels={labels} />
    </>
  );
}

// ─── C5 aim layer ─────────────────────────────────────────────────────────────────────────────

interface Flight {
  active: boolean;
  t: number;
  input: SolveInput;
  sol: Solution;
  /** 0 → 1 drop inside the CELL after arrival. */
  drop: number;
  fade: number;
}

interface AimState {
  /** Smoothed CELL floor point (world, metres). */
  target: THREE.Vector3;
  goal: THREE.Vector3;
  flywheelCmd: number;
  feederUntil: number;
  clock: number;
  armedAt: number;
  lastFire: number;
  atSpeedFor: number;
  shots: number;
  sol: Solution | null;
  input: SolveInput | null;
  status: string;
}

function createAimState(): AimState {
  const g = new THREE.Vector3(Math.sin(AIM_AZ) * AIM_DEFAULT_IN * IN, 0, Math.cos(AIM_AZ) * AIM_DEFAULT_IN * IN);
  return {
    target: g.clone(),
    goal: g.clone(),
    flywheelCmd: 0,
    feederUntil: 0,
    clock: 0,
    armedAt: -1,
    lastFire: 0,
    atSpeedFor: 0,
    shots: 0,
    sol: null,
    input: null,
    status: "IDLE",
  };
}

const ARC_N = 64;
const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const CELL_W = 20 * IN;
const CELL_L = 14 * IN;
const CELL_D = 12 * IN;
const MIN_IN = 20;
const MAX_IN = 168;

function AimLayer({
  bus,
  robot,
  aim,
  tone,
  reduced,
  labels,
}: {
  bus: StoryBus;
  robot: RefObject<ApexRobotHandle | null>;
  aim: RefObject<AimState>;
  tone: "dark" | "light";
  reduced: boolean;
  labels: RefObject<Labels>;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const root = useRef<THREE.Group>(null);
  const cell = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Mesh>(null);
  const flight = useRef<Flight | null>(null);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const muzzle = useMemo(() => new THREE.Vector3(), []);

  const ink = INK[tone];
  const pollen = POLLEN_LINE[tone];

  // Geometry + materials (created once per tone; lines are 1px hairlines by design)
  const parts = useMemo(() => {
    const lineMat = (color: string, opacity: number, dashed = false) =>
      dashed
        ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.03, gapSize: 0.02, depthWrite: false, toneMapped: false })
        : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });

    // CELL basket (opening up) — wireframe box, centred on the opening
    const box = new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL_W, CELL_D, CELL_L));
    box.translate(0, -CELL_D / 2, 0);
    const cellLines = new THREE.LineSegments(box, lineMat(ink, 0.75));
    // opening rim (drawn brighter)
    const rimGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-CELL_W / 2, 0, -CELL_L / 2),
      new THREE.Vector3(CELL_W / 2, 0, -CELL_L / 2),
      new THREE.Vector3(CELL_W / 2, 0, CELL_L / 2),
      new THREE.Vector3(-CELL_W / 2, 0, CELL_L / 2),
      new THREE.Vector3(-CELL_W / 2, 0, -CELL_L / 2),
    ]);
    const rim = new THREE.Line(rimGeo, lineMat(pollen, 0.95));
    // drop line to the floor + floor ring + ticks
    const dropGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -CELL_D, 0), new THREE.Vector3(0, -AIM_H_IN * IN, 0)]);
    const drop = new THREE.Line(dropGeo, lineMat(ink, 0.4, true));
    drop.computeLineDistances();
    const ringPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * 0.09, -AIM_H_IN * IN + 0.002, Math.sin(a) * 0.09));
    }
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), lineMat(ink, 0.5));
    const tickPts: THREE.Vector3[] = [];
    for (const [x, z] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      tickPts.push(new THREE.Vector3(x * 0.11, -AIM_H_IN * IN + 0.002, z * 0.11), new THREE.Vector3(x * 0.16, -AIM_H_IN * IN + 0.002, z * 0.16));
    }
    const ticks = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPts), lineMat(ink, 0.5));

    // the predicted arc (dashed, pollen) and the apex tick
    const arcGeo = new THREE.BufferGeometry();
    arcGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ARC_N * 3), 3));
    const arc = new THREE.Line(arcGeo, lineMat(pollen, 0.95, true));
    arc.frustumCulled = false;
    const apexGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.035, 0), new THREE.Vector3(0, 0.035, 0)]);
    const apexTick = new THREE.Line(apexGeo, lineMat(ink, 0.95));
    const apexDot = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 16, 12), new THREE.MeshBasicMaterial({ color: ink, toneMapped: false, transparent: true }));
    const ballMat = new THREE.MeshStandardMaterial({ color: "#F7E326", roughness: 0.55, metalness: 0, transparent: true });
    const ballGeo = new THREE.SphereGeometry(1, 28, 18);
    return { cellLines, rim, drop, ring, ticks, arc, apexTick, apexDot, ballMat, ballGeo };
  }, [ink, pollen]);

  useEffect(
    () => () => {
      const { cellLines, rim, drop, ring, ticks, arc, apexTick, apexDot, ballMat, ballGeo } = parts;
      for (const o of [cellLines, rim, drop, ring, ticks, arc, apexTick]) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
      apexDot.geometry.dispose();
      (apexDot.material as THREE.Material).dispose();
      ballMat.dispose();
      ballGeo.dispose();
    },
    [parts],
  );

  const setOpacity = (k: number) => {
    const { cellLines, rim, drop, ring, ticks, arc, apexTick, apexDot } = parts;
    (cellLines.material as THREE.LineBasicMaterial).opacity = 0.7 * k;
    (rim.material as THREE.LineBasicMaterial).opacity = 0.95 * k;
    (drop.material as THREE.LineDashedMaterial).opacity = 0.4 * k;
    (ring.material as THREE.LineBasicMaterial).opacity = 0.5 * k;
    (ticks.material as THREE.LineBasicMaterial).opacity = 0.5 * k;
    (arc.material as THREE.LineDashedMaterial).opacity = 0.95 * k;
    (apexTick.material as THREE.LineBasicMaterial).opacity = 0.95 * k;
    (apexDot.material as THREE.MeshBasicMaterial).opacity = k;
  };

  const project = (world: THREE.Vector3, el: HTMLDivElement | null, show: boolean) => {
    if (!el) return;
    if (!show) {
      el.style.opacity = "0";
      return;
    }
    _v.copy(world).project(camera);
    const x = (_v.x * 0.5 + 0.5) * size.width;
    const y = (-_v.y * 0.5 + 0.5) * size.height;
    el.style.opacity = _v.z < 1 ? "1" : "0";
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };

  useFrame((_, rawDt) => {
    const A = aim.current;
    const L = labels.current;
    const dt = Math.min(rawDt, 1 / 20);
    A.clock += dt;
    const blend = bus.aimBlend.get();
    const active = blend > 0.02;
    if (root.current) root.current.visible = active;
    setOpacity(clamp01(blend * 1.3 - 0.15));
    const r = robot.current;
    if (!active || !r) {
      project(hit, L.apex, false);
      project(hit, L.target, false);
      A.flywheelCmd = 0;
      if (flight.current) flight.current.active = false;
      if (A.status !== "IDLE") {
        A.status = "IDLE";
        bus.aim.status.set("IDLE");
      }
      return;
    }

    // ---- target: pointer → floor raycast, clamped to a sane range, smoothed
    r.getMuzzleWorld(muzzle);
    const p = bus.input.pointer;
    if (p.inside && blend > 0.6) {
      ndc.set(p.ndcX, p.ndcY);
      ray.setFromCamera(ndc, camera);
      const got = ray.ray.intersectPlane(FLOOR, hit);
      const dir = got ? _v2.set(hit.x - muzzle.x, 0, hit.z - muzzle.z) : _v2.set(ray.ray.direction.x, 0, ray.ray.direction.z);
      let d = got ? dir.length() / IN : MAX_IN;
      if (dir.lengthSq() < 1e-8) dir.set(Math.sin(AIM_AZ), 0, Math.cos(AIM_AZ));
      dir.normalize();
      d = Math.min(MAX_IN, Math.max(MIN_IN, d));
      A.goal.set(muzzle.x + dir.x * d * IN, 0, muzzle.z + dir.z * d * IN);
    }
    if (reduced) A.target.copy(A.goal);
    else A.target.lerp(A.goal, 1 - Math.exp(-14 * dt));

    // ---- solve (the team's Ballistics.java, ported): field frame inches (+x fwd = world Z, +y left = world X)
    const hdg = r.root ? _e.setFromQuaternion(r.root.getWorldQuaternion(_q), "YXZ").y : 0;
    const input: SolveInput = {
      muzzle: { x: muzzle.z / IN, y: muzzle.x / IN, z: muzzle.y / IN },
      target: { x: A.target.z / IN, y: A.target.x / IN, z: AIM_H_IN },
      robotVel: { x: 0, y: 0 },
      robotHeadingRad: hdg,
      ball: "POLLEN",
    };
    const sol = solve(input);
    A.sol = sol;
    A.input = input;

    // ---- flywheel + gates (AimController.isReadyToFire)
    A.flywheelCmd = sol.valid ? sol.flywheelRpm : 1500;
    const rpmNow = r.getFlywheelRpm();
    if (sol.valid && Math.abs(rpmNow - sol.flywheelRpm) < 100) A.atSpeedFor += dt;
    else A.atSpeedFor = 0;
    const gSolution = sol.valid;
    const gTurret = blend > 0.9 && r.isTurretSettled(1.5 * D2R) && !r.isTurretAtLimit();
    const gSpeed = A.atSpeedFor >= 0.15;
    const gFresh = blend > 0.9;
    const ready = gSolution && gTurret && gSpeed && gFresh;

    // ---- fire requests (queued until all four gates pass, like the feeder)
    if (bus.input.fire !== A.lastFire) {
      A.lastFire = bus.input.fire;
      if (blend > 0.6) A.armedAt = A.clock;
    }
    let fired = false;
    if (A.armedAt >= 0) {
      if (ready && (!flight.current || !flight.current.active)) {
        flight.current = { active: true, t: 0, input, sol, drop: 0, fade: 1 };
        A.feederUntil = A.clock + 0.25;
        A.shots += 1;
        bus.aim.shots.set(A.shots);
        A.armedAt = -1;
        fired = true;
      } else if (A.clock - A.armedAt > 2.5) A.armedAt = -1;
    }

    // ---- ball flight (0.5× slow-mo so the arc is readable; real flights are 0.15–0.7 s)
    const f = flight.current;
    const b = ball.current;
    if (f && f.active && b) {
      const radius = (2.8 / 2) * IN;
      if (reduced) {
        f.t = f.sol.flightTimeSec;
        f.drop = 1;
      } else if (f.t < f.sol.flightTimeSec) f.t = Math.min(f.sol.flightTimeSec, f.t + dt * SLOWMO);
      else if (f.drop < 1) f.drop = Math.min(1, f.drop + dt / 0.35);
      else f.fade -= dt / 0.5;
      const q = ballPosition(f.input, f.sol, f.t);
      b.position.set(q.y * IN, q.z * IN, q.x * IN);
      // inside the CELL: fall to the basket floor
      b.position.y -= (CELL_D - radius) * f.drop * f.drop;
      b.scale.setScalar(radius * Math.max(0, Math.min(1, f.fade * 1.5)));
      parts.ballMat.opacity = clamp01(f.fade);
      b.visible = f.fade > 0;
      if (f.fade <= 0) f.active = false;
    } else if (b) b.visible = false;

    // ---- CELL group + arc + apex
    if (cell.current) {
      cell.current.position.set(A.target.x, AIM_H_IN * IN, A.target.z);
      cell.current.rotation.y = Math.atan2(muzzle.x - A.target.x, muzzle.z - A.target.z);
    }
    const arcGeo = parts.arc.geometry;
    const posAttr = arcGeo.getAttribute("position") as THREE.BufferAttribute;
    let apexWorld: THREE.Vector3 | null = null;
    let apexIn = -1;
    if (sol.valid) {
      for (let i = 0; i < ARC_N; i++) {
        const q = ballPosition(input, sol, (i / (ARC_N - 1)) * sol.flightTimeSec);
        posAttr.setXYZ(i, q.y * IN, q.z * IN, q.x * IN);
      }
      posAttr.needsUpdate = true;
      arcGeo.computeBoundingSphere();
      parts.arc.computeLineDistances();
      parts.arc.visible = true;
      const apex = apexOf(input, sol);
      if (apex.time <= sol.flightTimeSec) {
        apexIn = apex.z;
        apexWorld = hit.set(apex.y * IN, apex.z * IN, apex.x * IN);
        parts.apexTick.position.copy(apexWorld);
        parts.apexDot.position.copy(apexWorld);
      }
    } else parts.arc.visible = false;
    parts.apexTick.visible = !!apexWorld;
    parts.apexDot.visible = !!apexWorld;

    // ---- DOM labels
    const show = blend > 0.85 && sol.valid;
    if (apexWorld) project(apexWorld, L.apex, show);
    else project(hit, L.apex, false);
    // the CELL label sits under its floor ring (the APEX label lives above the arc — they never meet)
    project(_v2.set(A.target.x, 0, A.target.z), L.target, blend > 0.85);
    if (L.apexValue && apexIn > 0) {
      const txt = fmtFixed(apexIn, 1);
      if (L.apexValue.textContent !== txt) L.apexValue.textContent = txt;
    }
    if (L.targetValue) {
      const txt = sol.valid ? (apexIn > 0 ? `${fmtFixed(sol.actualDistanceIn, 1)} IN` : "RISING AT TARGET") : "NO SOLUTION";
      if (L.targetValue.textContent !== txt) L.targetValue.textContent = txt;
    }

    // ---- readouts → bus (rounded, so the DOM only updates on visible changes)
    const status: AimStatus =
      f && f.active && f.t < f.sol.flightTimeSec
        ? "IN FLIGHT"
        : !sol.valid
          ? sol.failReason.startsWith("turret")
            ? "LIMIT"
            : "NO SOLUTION"
          : A.armedAt >= 0
            ? "ARMED"
            : ready
              ? "READY"
              : "AIMING";
    if (status !== A.status) {
      A.status = status;
      bus.aim.status.set(status);
    }
    bus.aim.valid.set(sol.valid ? 1 : 0);
    bus.aim.failReason.set(sol.failReason);
    bus.aim.rangeIn.set(Math.round(sol.actualDistanceIn * 10) / 10);
    bus.aim.tofSec.set(Math.round(sol.flightTimeSec * 1000) / 1000);
    bus.aim.rpm.set(Math.round(sol.flywheelRpm));
    bus.aim.rpmNow.set(Math.round(rpmNow / 10) * 10);
    bus.aim.turretDeg.set(Math.round(THREE.MathUtils.radToDeg(sol.turretAngleRad) * 10) / 10);
    bus.aim.iter.set(sol.iterations);
    bus.aim.apexIn.set(apexIn > 0 ? Math.round(apexIn * 10) / 10 : -1);
    bus.aim.gates[0].set(gSolution ? 1 : 0);
    bus.aim.gates[1].set(gTurret ? 1 : 0);
    bus.aim.gates[2].set(gSpeed ? 1 : 0);
    bus.aim.gates[3].set(gFresh ? 1 : 0);

    if (reduced && (fired || (f && f.active))) invalidate();
  });

  const { cellLines, rim, drop, ring, ticks, arc, apexTick, apexDot, ballMat, ballGeo } = parts;
  return (
    <group ref={root} visible={false}>
      <group ref={cell}>
        <primitive object={cellLines} />
        <primitive object={rim} />
        <primitive object={drop} />
        <primitive object={ring} />
        <primitive object={ticks} />
      </group>
      <primitive object={arc} />
      <primitive object={apexTick} />
      <primitive object={apexDot} />
      <mesh ref={ball} geometry={ballGeo} material={ballMat} visible={false} castShadow />
    </group>
  );
}
