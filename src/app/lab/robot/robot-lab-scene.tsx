"use client";

/**
 * /lab/robot — test bench for the procedural APEX-R1 (src/components/robot).
 * Plain UI on purpose: this page exists to exercise the 3D API, not to be designed.
 *
 * Query params (all optional) give deterministic states for screenshots:
 *   look=studio|clay|blueprint  tone=dark|light  accent=7F7F7F  explode=0..1  yaw=<rad>  rpm=<n>
 *   angle=threequarter|front|side|top|back|low|wide|aim  ortho=1  turntable=1
 *   highlight=<subsystem>  hl=<id>,<id>  (several = an assembly)
 *   aim=1  target=<x_in>,<y_in>  drive=1  shot=0..1 (fire + freeze mid-flight)  guides=1  hotspots=1
 *   intake=1  spin=1  limelight=1  preload=0..3  effects=1  ui=0  alliance=red|blue  debug=1
 *   cycle=0..1 (scrub the scoring cycle)  balls=1..3  auto=1 (run it)  kind=POLLEN|NECTAR_RED|NECTAR_BLUE
 *   idle=1  ao=0 (no baked AO)  cam=x,y,z  at=x,y,z  fov=<deg>
 */
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line, OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { solve, type Solution, type SolveInput } from "@/lib/ballistics";
import {
  ApexRobot,
  Balls,
  DEFAULT_ACCENT,
  ENVELOPE,
  Hive,
  IN,
  METRES,
  RobotCanvas,
  Stage,
  SUBSYSTEM_INFO,
  SUBSYSTEMS,
  Trajectory,
  fitRobot,
  hiveAimOffset,
  launchDirection,
  mecanumWheelSpeeds,
  stageBackground,
  usePrefersReducedMotion,
  type ApexRobotHandle,
  type ArcSource,
  type BallsHandle,
  type CycleBallKind,
  type HighlightTarget,
  type LaunchEvent,
  type RenderStats,
  type RobotCommand,
  type RobotLook,
  type RobotTone,
  type SubsystemId,
  type WheelSpeeds,
} from "@/components/robot";

type Angle = "threequarter" | "front" | "side" | "top" | "back" | "low" | "wide" | "aim";
const ANGLES: Angle[] = ["threequarter", "front", "side", "top", "back", "low", "wide", "aim"];

const CAMERAS: Record<Angle, { pos: [number, number, number]; target: [number, number, number]; fov: number }> = {
  threequarter: { pos: [0.93, 0.6, 1.1], target: [0, 0.19, 0.02], fov: 30 },
  front: { pos: [0, 0.27, 1.62], target: [0, 0.2, 0.0], fov: 30 },
  side: { pos: [1.72, 0.22, 0.02], target: [0, 0.22, 0.02], fov: 30 },
  top: { pos: [0, 1.8, -0.0001], target: [0, 0, 0], fov: 30 },
  back: { pos: [-0.78, 0.58, -1.08], target: [0, 0.2, 0], fov: 30 },
  low: { pos: [0.8, 0.15, 0.92], target: [0, 0.18, 0.0], fov: 30 },
  wide: { pos: [1.5, 1.0, 1.75], target: [0, 0.3, 0.03], fov: 32 },
  aim: { pos: [-3.3, 1.05, 0.55], target: [0.2, 0.62, 1.3], fov: 40 },
};

/** Assemblies (several subsystems highlighted together). */
const ASSEMBLIES: Record<string, SubsystemId[]> = {
  "turret + shooter": ["turret", "shooter"],
  "intake + hopper": ["intake", "hopper"],
  "drive + odometry": ["drivetrain", "odometry"],
};

interface LabInit {
  look: RobotLook;
  tone: RobotTone;
  explode: number;
  yaw: number;
  rpm: number;
  angle: Angle;
  ortho: boolean;
  highlight: HighlightTarget;
  turntable: boolean;
  aim: boolean;
  accent: string;
  shot: number;
  ui: boolean;
  effects: boolean;
  limelight: boolean;
  preload: number;
  guides: boolean;
  hotspots: boolean;
  target: { x: number; y: number };
  drive: boolean;
  intake: boolean;
  spin: boolean;
  alliance: "red" | "blue";
  debug: boolean;
  cam: [number, number, number] | null;
  at: [number, number, number] | null;
  fov: number;
  cycle: number | null;
  cycleBalls: number;
  autoCycle: boolean;
  kind: CycleBallKind;
  idle: boolean;
  ao: boolean;
}

function vec3(s: string | null): [number, number, number] | null {
  if (!s) return null;
  const v = s.split(",").map(Number);
  return v.length === 3 && v.every(Number.isFinite) ? [v[0], v[1], v[2]] : null;
}

function parseParams(): LabInit {
  const q = new URLSearchParams(window.location.search);
  const num = (k: string, d: number) => {
    const v = q.get(k);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const bool = (k: string, d: boolean) => {
    const v = q.get(k);
    return v === null ? d : v !== "0" && v !== "false";
  };
  function pick<T extends string>(k: string, opts: readonly T[], d: T): T {
    const v = q.get(k) as T | null;
    return v && opts.includes(v) ? v : d;
  }
  const aim = bool("aim", false);
  const t = (q.get("target") ?? "").split(",").map(Number);
  const isId = (s: string): s is SubsystemId => (SUBSYSTEMS as readonly string[]).includes(s);
  const hl = q.get("highlight");
  const hlList = (q.get("hl") ?? "").split(",").filter(isId);
  const accent = q.get("accent");
  return {
    look: pick("look", ["studio", "clay", "blueprint"] as const, "studio"),
    tone: pick("tone", ["dark", "light"] as const, "dark"),
    explode: Math.min(1, Math.max(0, num("explode", 0))),
    yaw: num("yaw", 0),
    rpm: num("rpm", 0),
    angle: pick("angle", ANGLES, aim ? "aim" : "threequarter"),
    ortho: bool("ortho", false),
    highlight: hlList.length ? hlList : hl && isId(hl) ? hl : null,
    turntable: bool("turntable", false),
    aim,
    accent: accent ? `#${accent.replace(/^#/, "")}` : DEFAULT_ACCENT,
    shot: num("shot", NaN),
    ui: bool("ui", true),
    effects: bool("effects", false),
    limelight: bool("limelight", false),
    preload: num("preload", 0),
    guides: bool("guides", false),
    hotspots: bool("hotspots", false),
    target: t.length === 2 && t.every(Number.isFinite) ? { x: t[0], y: t[1] } : { x: 104, y: 26 },
    drive: bool("drive", false),
    intake: bool("intake", false),
    spin: bool("spin", false),
    alliance: pick("alliance", ["red", "blue"] as const, "blue"),
    debug: bool("debug", false),
    cam: vec3(q.get("cam")),
    at: vec3(q.get("at")),
    fov: num("fov", 0),
    cycle: q.get("cycle") === null ? null : Math.max(0, num("cycle", 0)),
    cycleBalls: Math.max(1, Math.min(3, Math.round(num("balls", 1)))),
    autoCycle: bool("auto", false),
    kind: pick("kind", ["POLLEN", "NECTAR_RED", "NECTAR_BLUE"] as const, "POLLEN"),
    idle: bool("idle", false),
    ao: bool("ao", true),
  };
}

// ------------------------------------------------------------------------------------------------
// tiny external store (readouts update the DOM panel only, never the scene tree)
// ------------------------------------------------------------------------------------------------
function createStore<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set(v: T) {
      value = v;
      subs.forEach((s) => s());
    },
    subscribe(cb: () => void) {
      subs.add(cb);
      return () => void subs.delete(cb);
    },
  };
}
type Store<T> = ReturnType<typeof createStore<T>>;

// ------------------------------------------------------------------------------------------------
// camera
// ------------------------------------------------------------------------------------------------
function CameraRig({
  angle,
  ortho,
  turntable,
  explode,
  cam,
  at,
  fov,
}: {
  angle: Angle;
  ortho: boolean;
  turntable: boolean;
  explode: number;
  cam?: [number, number, number] | null;
  at?: [number, number, number] | null;
  fov?: number;
}) {
  const base = CAMERAS[angle];
  const preset = { pos: cam ?? base.pos, target: at ?? base.target, fov: fov || base.fov };
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const span = angle === "aim" ? 4 : 0.66;
  // portrait screens: frame the robot's bounding sphere on the narrower (horizontal) FOV
  useLayoutEffect(() => {
    if (ortho || cam || angle === "aim" || !(camera as THREE.PerspectiveCamera).isPerspectiveCamera) return;
    if (size.width >= size.height) return;
    const target = new THREE.Vector3(...preset.target);
    const dir = new THREE.Vector3(...preset.pos).sub(target).normalize();
    fitRobot(camera as THREE.PerspectiveCamera, size, { direction: dir, explode, center: target, margin: 1.02 });
    // the preset is fixed per mount (keyed by angle); size changes re-fit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size.width, size.height]);
  return (
    <>
      {ortho ? (
        <OrthographicCamera makeDefault position={preset.pos} zoom={Math.min(size.height, size.width) / span} near={0.01} far={60} />
      ) : (
        <PerspectiveCamera makeDefault position={preset.pos} fov={preset.fov} near={0.02} far={80} />
      )}
      <OrbitControls
        makeDefault
        target={preset.target}
        enableDamping
        dampingFactor={0.08}
        autoRotate={turntable}
        autoRotateSpeed={0.9}
        maxPolarAngle={Math.PI / 2 - 0.01}
        minDistance={0.25}
        maxDistance={9}
      />
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// DOM labels projected from 3D every frame (plain DOM nodes next to the canvas — no extra React
// roots, so no StrictMode unmount warnings like drei <Html> produces in dev)
// ------------------------------------------------------------------------------------------------
interface LabelItem {
  key: string;
  text: string;
  /** World position of the label's anchor (null hides it). */
  at: (out: THREE.Vector3) => THREE.Vector3 | null;
  className: string;
  /** CSS translate applied after projection. */
  offset?: string;
}

function DomLabels({ items }: { items: LabelItem[] }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const els = useRef<HTMLDivElement[]>([]);
  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return;
    const created = items.map((it) => {
      const d = document.createElement("div");
      d.textContent = it.text;
      d.className = it.className;
      Object.assign(d.style, { position: "absolute", left: "0", top: "0", pointerEvents: "none", willChange: "transform" });
      parent.appendChild(d);
      return d;
    });
    els.current = created;
    return () => created.forEach((d) => d.remove());
  }, [gl, items]);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    items.forEach((it, i) => {
      const d = els.current[i];
      if (!d) return;
      const p = it.at(v);
      if (!p) {
        d.style.display = "none";
        return;
      }
      p.project(camera);
      const x = (p.x * 0.5 + 0.5) * size.width;
      const y = (-p.y * 0.5 + 0.5) * size.height;
      d.style.display = p.z < 1 ? "block" : "none";
      d.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ${it.offset ?? "translate(6px, -50%)"}`;
    });
  });
  return null;
}

// ------------------------------------------------------------------------------------------------
// measurement guides (side view: 14 in muzzle line + 40° ray; 18 in envelope everywhere)
// ------------------------------------------------------------------------------------------------
const GUIDE_LABEL_CLASS = "whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-[#F7E326]";
const LAUNCH_RAD = (40 * Math.PI) / 180;
const GUIDE_LABELS: LabelItem[] = [
  {
    key: "h",
    text: "14 in = 355.6 mm (muzzle)",
    className: GUIDE_LABEL_CLASS,
    at: (o) => o.set(ENVELOPE / 2 + 0.02, METRES.muzzle.y + 0.014, -0.3),
  },
  {
    key: "a",
    text: "40° launch (hood exit tangent)",
    className: GUIDE_LABEL_CLASS,
    at: (o) =>
      o.set(METRES.muzzle.x, METRES.muzzle.y + 0.2 * Math.sin(LAUNCH_RAD) + 0.01, METRES.muzzle.z + 0.2 * Math.cos(LAUNCH_RAD)),
  },
  { key: "e", text: "18 in sizing cube", className: GUIDE_LABEL_CLASS, at: (o) => o.set(ENVELOPE / 2, ENVELOPE + 0.012, -ENVELOPE / 2) },
];

function Guides({ robot }: { robot: { current: ApexRobotHandle | null } }) {
  const E = ENVELOPE;
  const mz = METRES.muzzle;
  // (a <primitive> line: R3F 9.8's <threeLine> alias throws on prop updates)
  const ray = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#FF5A4E", depthTest: false, toneMapped: false }));
    l.renderOrder = 12;
    l.frustumCulled = false;
    return l;
  }, []);
  const rayGeo = ray.geometry;
  const muzzleDot = useRef<THREE.Mesh>(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  const d = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const r = robot.current;
    if (!r) return;
    r.getMuzzleWorld(v);
    launchDirection(r.getTurretYaw(), d);
    const pos = rayGeo.getAttribute("position") as THREE.BufferAttribute;
    pos.setXYZ(0, v.x, v.y, v.z);
    pos.setXYZ(1, v.x + d.x * 0.6, v.y + d.y * 0.6, v.z + d.z * 0.6);
    pos.needsUpdate = true;
    rayGeo.computeBoundingSphere();
    muzzleDot.current?.position.copy(v);
  });
  const box = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(E, E, E)), [E]);
  const ticks = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 18; i++) {
      const y = i * IN;
      const len = i % 6 === 0 ? 0.03 : 0.014;
      pts.push([E / 2 + 0.02, y, -E / 2 - 0.04], [E / 2 + 0.02, y, -E / 2 - 0.04 - len]);
    }
    return pts;
  }, [E]);
  return (
    <group>
      <lineSegments geometry={box} position={[0, E / 2, 0]} renderOrder={10}>
        <lineBasicMaterial color="#F7E326" transparent opacity={0.55} depthTest={false} toneMapped={false} />
      </lineSegments>
      {/* 14 in muzzle-height line, drawn on the near (left) side for the side view */}
      <Line points={[[E / 2 + 0.02, mz.y, -0.35], [E / 2 + 0.02, mz.y, 0.62]]} color="#F7E326" lineWidth={1.2} dashed dashSize={0.02} gapSize={0.012} depthTest={false} renderOrder={11} />
      {/* horizontal reference through the muzzle + the 40° launch ray */}
      <Line points={[[mz.x, mz.y, mz.z], [mz.x, mz.y, mz.z + 0.6]]} color="#ECECE7" lineWidth={1} depthTest={false} renderOrder={11} />
      <primitive object={ray} />
      <mesh ref={muzzleDot} renderOrder={12}>
        <sphereGeometry args={[0.006, 16, 12]} />
        <meshBasicMaterial color="#FF5A4E" depthTest={false} toneMapped={false} />
      </mesh>
      <Line points={ticks} segments color="#F7E326" lineWidth={1} depthTest={false} renderOrder={11} />
      <DomLabels items={GUIDE_LABELS} />
    </group>
  );
}

// ------------------------------------------------------------------------------------------------
// ?debug=1 — per-subsystem mesh / triangle report (console.warn so the screenshot helper shows it)
// ------------------------------------------------------------------------------------------------
function DebugReport({ robot }: { robot: { current: ApexRobotHandle | null } }) {
  const done = useRef(false);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (done.current || t.current < 2.5) return;
    const root = robot.current?.root;
    if (!root) return;
    done.current = true;
    const rows: Record<string, { meshes: number; tris: number; lines: number }> = {};
    let total = 0;
    root.traverse((o) => {
      if (o.userData?.hitProxy) return;
      let s: THREE.Object3D | null = o;
      let id = "other";
      while (s) {
        if (s.userData?.subsystem) {
          id = s.userData.subsystem as string;
          break;
        }
        s = s.parent;
      }
      const r = (rows[id] ??= { meshes: 0, tris: 0, lines: 0 });
      const m = o as THREE.Mesh;
      if ((m as THREE.Mesh).isMesh && m.geometry) {
        const g = m.geometry;
        const n = g.index ? g.index.count : g.getAttribute("position").count;
        const inst = (o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1;
        r.meshes += 1;
        r.tris += (n / 3) * inst;
        total += (n / 3) * inst;
      } else if ((o as THREE.LineSegments).isLineSegments) r.lines += 1;
    });
    console.warn(
      `[robot debug] total ${Math.round(total / 1000)}k tris | ` +
        Object.entries(rows)
          .map(([k, v]) => `${k}: ${v.meshes} meshes, ${Math.round(v.tris / 1000)}k tris, ${v.lines} lines`)
          .join(" | "),
    );
  });
  return null;
}

// ------------------------------------------------------------------------------------------------
// hotspots (exercise getAnchorWorld)
// ------------------------------------------------------------------------------------------------
function Hotspots({ robot }: { robot: { current: ApexRobotHandle | null } }) {
  const refs = useRef<Partial<Record<SubsystemId, THREE.Group | null>>>({});
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const r = robot.current;
    if (!r) return;
    for (const id of SUBSYSTEMS) {
      const g = refs.current[id];
      if (g) g.position.copy(r.getAnchorWorld(id, v));
    }
  });
  const [labels] = useState<LabelItem[]>(() =>
    SUBSYSTEMS.map((id) => ({
      key: id,
      text: SUBSYSTEM_INFO[id].label,
      className:
        "rounded-sm border border-white/15 bg-black/75 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.06em] whitespace-nowrap text-zinc-100 uppercase",
      offset: "translate(-50%, calc(-100% - 8px))",
      at: (o: THREE.Vector3) => (robot.current ? robot.current.getAnchorWorld(id, o) : null),
    })),
  );
  return (
    <>
      {SUBSYSTEMS.map((id) => (
        <group key={id} ref={(g) => void (refs.current[id] = g)}>
          <mesh renderOrder={20}>
            <sphereGeometry args={[0.005, 12, 8]} />
            <meshBasicMaterial color="#F7E326" depthTest={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <DomLabels items={labels} />
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// AIM demo
// ------------------------------------------------------------------------------------------------
export interface Readout {
  sol: Solution;
  rpmNow: number;
  gates: { solution: boolean; turret: boolean; flywheel: boolean; fresh: boolean };
  limit: boolean;
  shots: number;
  robotVelIn: number;
  /** "queued", "firing", or a NO SHOT reason (shown briefly). */
  status: string;
}

const Y = new THREE.Vector3(0, 1, 0);
/** Cycle positions: a ball waiting at the staging point, the next one in the lift. */
const CYCLE_STAGED = 0.72;
const CYCLE_STEP = 0.36;
/** Seconds for the feed: staged ball → flywheel → muzzle (and the next ball up into staging). */
const FIRE_SECONDS = 0.42;

export interface AimDemoHandle {
  /** Request a shot: it fires as soon as the four AimController gates are green (≤ 0.6 s). */
  fire(): void;
  /** The robot reports a cycle ball at the muzzle: launch the real arc. */
  launch(e: LaunchEvent): boolean;
}

function AimDemo({
  ref,
  robot,
  balls,
  onCommand,
  onRobotX,
  drive,
  look,
  tone,
  alliance,
  initialTarget,
  shot,
  onFreeze,
  readout,
}: {
  ref?: Ref<AimDemoHandle>;
  robot: { current: ApexRobotHandle | null };
  balls: { current: BallsHandle | null };
  /** Per-frame robot command (turret, flywheel, wheels, feeder, cycle) for ApexRobot's `command` ref. */
  onCommand: (c: RobotCommand) => void;
  /** Strafe position of the robot (world X, metres). */
  onRobotX: (x: number) => void;
  drive: boolean;
  look: RobotLook;
  tone: RobotTone;
  alliance: "red" | "blue";
  initialTarget: { x: number; y: number };
  shot: number;
  onFreeze: () => void;
  readout: Store<Readout | null>;
}) {
  const hive = useRef<THREE.Group>(null);
  const aimMarker = useRef<THREE.Group>(null);
  const leadMarker = useRef<THREE.Mesh>(null);
  const base = useRef(new THREE.Vector3(initialTarget.y * IN, 0, initialTarget.x * IN));
  const aimOff = useMemo(() => hiveAimOffset(alliance), [alliance]);
  const arc = useRef<ArcSource | null>(null);
  const latest = useRef<{ input: SolveInput; sol: Solution } | null>(null);
  const st = useRef({
    clock: 0,
    atSpeedFor: 0,
    lastReadout: 0,
    shots: 0,
    shotDone: false,
    queuedAt: -1,
    fireAt: -1,
    dipUntil: 0,
    pulseAt: -10,
    status: "",
    statusUntil: 0,
  });

  function fireStraight(startAtFraction: number) {
    const l = latest.current;
    const r = robot.current;
    if (!l || !r || !l.sol.valid) return false;
    const id = balls.current?.fire({
      kind: "POLLEN",
      input: l.input,
      solution: l.sol,
      from: r.getMuzzleWorld(new THREE.Vector3()),
      startAt: startAtFraction * l.sol.flightTimeSec,
      onArrive: () => void (st.current.pulseAt = st.current.clock),
    });
    if (id !== undefined && id >= 0) {
      st.current.shots += 1;
      return true;
    }
    return false;
  }

  useImperativeHandle(ref, () => ({
    fire() {
      const s = st.current;
      if (s.fireAt < 0 && s.queuedAt < 0) s.queuedAt = s.clock;
    },
    launch(e) {
      const l = latest.current;
      if (!l || !l.sol.valid) return false;
      const s = st.current;
      const id = balls.current?.fire({
        kind: "POLLEN",
        input: l.input,
        solution: l.sol,
        from: e.world,
        onArrive: () => void (st.current.pulseAt = st.current.clock),
      });
      if (id === undefined || id < 0) return false;
      s.shots += 1;
      s.dipUntil = s.clock + 0.07; // the ball takes energy out of the flywheel
      return true;
    },
  }));

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const s = st.current;
    s.clock += dt;
    const t = s.clock;
    // shoot-on-the-move demo: strafe left/right (robot +y = world +X)
    const A = 0.32;
    const w = 0.85;
    const x = drive ? A * Math.sin(w * t) : 0;
    const vxWorld = drive ? A * w * Math.cos(w * t) : 0;
    onRobotX(x);
    const vyIn = vxWorld / IN;

    // HIVE sits where the pointer is, turned so its upward CELL leans toward the robot
    const b = base.current;
    const face = Math.atan2(x - b.x, 0 - b.z);
    if (hive.current) {
      hive.current.position.copy(b);
      hive.current.rotation.y = face;
    }
    const aim = aimOff.clone().applyAxisAngle(Y, face).add(b);
    if (aimMarker.current) {
      aimMarker.current.position.copy(aim);
      const since = t - s.pulseAt;
      const k = since < 0.5 ? 1 + 1.4 * Math.sin((since / 0.5) * Math.PI) : 1;
      aimMarker.current.scale.setScalar(k);
    }

    // the team's solver, in its own frame (inches, +x forward, +y left, +z up)
    const muzzle = { x: METRES.muzzle.z / IN, y: (x + METRES.muzzle.x) / IN, z: METRES.muzzle.y / IN };
    const target = { x: aim.z / IN, y: aim.x / IN, z: aim.y / IN };
    const input: SolveInput = { muzzle, target, robotVel: { x: 0, y: vyIn }, robotHeadingRad: 0, ball: "POLLEN" };
    const sol = solve(input);
    latest.current = { input, sol };
    const r = robot.current;

    // AimController-style gates
    const rpmNow = r?.getFlywheelRpm() ?? 0;
    if (sol.valid && Math.abs(rpmNow - sol.flywheelRpm) < 100) s.atSpeedFor += dt;
    else s.atSpeedFor = 0;
    const gates = {
      solution: sol.valid,
      turret: !!r?.isTurretSettled() && !r?.isTurretAtLimit(),
      flywheel: s.atSpeedFor >= 0.15,
      fresh: true,
    };
    const ready = gates.solution && gates.turret && gates.flywheel && gates.fresh;

    // queued request → fire as soon as every gate is green, else NO SHOT after 0.6 s
    if (s.queuedAt >= 0) {
      if (ready) {
        s.queuedAt = -1;
        s.fireAt = t;
      } else if (t - s.queuedAt > 0.6) {
        s.queuedAt = -1;
        s.status = !gates.solution ? `NO SHOT — ${sol.failReason}` : !gates.turret ? "NO SHOT — turret not on target" : "NO SHOT — flywheel not at speed";
        s.statusUntil = t + 1.4;
      }
    }
    // the feed: staged ball → flywheel → muzzle; the next ball climbs into staging
    let cycle = CYCLE_STAGED;
    let feeder = false;
    if (s.fireAt >= 0) {
      const k = (t - s.fireAt) / FIRE_SECONDS;
      if (k >= 1) s.fireAt = -1;
      else {
        cycle = CYCLE_STAGED + CYCLE_STEP * k;
        feeder = k < 0.4;
      }
    }

    onCommand({
      turretYaw: sol.turretAngleRad,
      flywheelRpm: sol.valid ? sol.flywheelRpm * (t < s.dipUntil ? 0.9 : 1) : 1500,
      feederOn: feeder,
      wheelSpeeds: mecanumWheelSpeeds(0, vyIn, 0) as WheelSpeeds,
      cycle,
    });
    arc.current = { input, solution: sol.valid ? sol : null, from: r ? r.getMuzzleWorld(new THREE.Vector3()) : undefined };

    // virtual (lead) target marker when moving
    if (leadMarker.current) {
      const moving = Math.abs(vyIn) > 0.5 && sol.valid;
      leadMarker.current.visible = moving;
      if (moving) leadMarker.current.position.set(aim.x - vxWorld * sol.flightTimeSec, aim.y, aim.z);
    }

    // deterministic screenshot: fire once and freeze mid-flight
    if (Number.isFinite(shot) && !s.shotDone && t > 1.6 && sol.valid) {
      s.shotDone = fireStraight(Math.min(0.98, Math.max(0, shot)));
      if (s.shotDone) onFreeze();
    }

    if (t - s.lastReadout > 0.1) {
      s.lastReadout = t;
      const status = s.fireAt >= 0 ? "FIRING" : s.queuedAt >= 0 ? "QUEUED — waiting for the gates" : t < s.statusUntil ? s.status : "";
      readout.set({ sol, rpmNow, gates, limit: !!r?.isTurretAtLimit(), shots: s.shots, robotVelIn: vyIn, status });
    }
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    base.current.set(e.point.x, 0, e.point.z);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // that was an orbit drag
    const s = st.current;
    if (s.fireAt < 0 && s.queuedAt < 0) s.queuedAt = s.clock;
  };

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0008, 0]} onPointerMove={onMove} onClick={onClick}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <group ref={hive}>
        <Hive look={look} tone={tone} />
      </group>
      <group ref={aimMarker}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.03, 0.036, 40]} />
          <meshBasicMaterial color="#F7E326" toneMapped={false} depthTest={false} transparent opacity={0.9} />
        </mesh>
      </group>
      <mesh ref={leadMarker} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.022, 0.027, 32]} />
        <meshBasicMaterial color="#4C8DFF" toneMapped={false} depthTest={false} transparent opacity={0.9} />
      </mesh>
      <Trajectory source={arc} apex color={look === "blueprint" && tone === "light" ? "#141413" : "#F7E326"} opacity={0.85} />
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// UI bits
// ------------------------------------------------------------------------------------------------
function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex overflow-hidden rounded border border-white/15">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={`flex-1 px-2 py-1 text-[11px] capitalize ${value === o ? "bg-[#F7E326] text-black" : "text-zinc-300 hover:bg-white/10"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  // a <div>, not a <label>: wrapping a button group / select in a label would make every option's
  // text part of the first control's accessible name
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-2">
      <span className="font-mono text-[10px] tracking-[0.08em] text-zinc-400 uppercase">{label}</span>
      {children}
    </div>
  );
}
const deg = (r: number) => (r * 180) / Math.PI;

function ReadoutPanel({ store }: { store: Store<Readout | null> }) {
  const r = useSyncExternalStore(store.subscribe, store.get, () => null);
  if (!r) return null;
  const s = r.sol;
  const ready = r.gates.solution && r.gates.turret && r.gates.flywheel && r.gates.fresh;
  const rows: [string, string][] = [
    ["distance", `${s.actualDistanceIn.toFixed(1)} in (${(s.actualDistanceIn / 12).toFixed(2)} ft)`],
    ["virtual dist", `${s.virtualDistanceIn.toFixed(1)} in`],
    ["flight time", `${s.flightTimeSec.toFixed(3)} s`],
    ["muzzle speed", `${s.muzzleSpeedIn.toFixed(0)} in/s`],
    ["flywheel rpm", `${s.flywheelRpm.toFixed(0)} needed · ${r.rpmNow.toFixed(0)} now`],
    ["lead angle", `${deg(s.leadAngleRad).toFixed(2)}°`],
    ["turret", `${deg(s.turretAngleRad).toFixed(1)}°${r.limit ? " · LIMIT" : ""}`],
    ["robot vel", `${r.robotVelIn.toFixed(1)} in/s (y)`],
    ["iterations", `${s.iterations}`],
  ];
  return (
    <div className="fixed right-4 bottom-10 w-[330px] max-w-[calc(100vw-2rem)] rounded-md border border-white/10 bg-black/70 p-3 font-mono text-[11px] text-zinc-200 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="tracking-[0.1em] text-zinc-400 uppercase">solve() · Ballistics.java</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] ${s.valid ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
          {s.valid ? "VALID" : "NO SHOT"}
        </span>
      </div>
      {!s.valid ? <p className="mb-2 text-red-300">{s.failReason}</p> : null}
      <dl className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-zinc-500">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex flex-wrap gap-1">
        {(Object.entries(r.gates) as [string, boolean][]).map(([k, ok]) => (
          <span key={k} className={`rounded px-1.5 py-0.5 text-[10px] ${ok ? "bg-white/15 text-zinc-100" : "bg-white/5 text-zinc-500"}`}>
            {ok ? "●" : "○"} {k}
          </span>
        ))}
        <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] ${ready ? "bg-[#F7E326] text-black" : "bg-white/5 text-zinc-500"}`}>
          {ready ? "READY TO FIRE" : "NOT READY"}
        </span>
      </div>
      {r.status ? (
        <p className={`mt-2 text-[10px] ${r.status.startsWith("NO SHOT") ? "text-red-300" : "text-[#F7E326]"}`}>{r.status}</p>
      ) : null}
      <p className="mt-2 text-[10px] text-zinc-500">
        Move over the floor to place the HIVE · click / space to fire (fires when the gates are green) · shots {r.shots}
      </p>
    </div>
  );
}

function StatsPanel({ hover }: { hover: SubsystemId | null }) {
  const [stats, setStats] = useState<RenderStats | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => setStats(window.__apexRenderInfo ?? null), 500);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="fixed top-4 right-4 rounded-md border border-white/10 bg-black/65 px-3 py-2 text-right font-mono text-[10px] text-zinc-400 backdrop-blur max-sm:hidden">
      <div>
        draw calls <span className="text-zinc-100">{stats?.calls ?? "–"}</span> · tris{" "}
        <span className="text-zinc-100">{stats ? stats.triangles.toLocaleString() : "–"}</span>
      </div>
      <div>
        lines {stats?.lines ?? "–"} · geos {stats?.geometries ?? "–"} · tex {stats?.textures ?? "–"} · programs {stats?.programs ?? "–"}
      </div>
      <div className="mt-1 text-zinc-500">hover: {hover ? SUBSYSTEM_INFO[hover].label : "—"}</div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// page
// ------------------------------------------------------------------------------------------------
export default function RobotLabScene() {
  const [init] = useState(parseParams);
  const [look, setLook] = useState<RobotLook>(init.look);
  const [tone, setTone] = useState<RobotTone>(init.tone);
  const [explode, setExplode] = useState(init.explode);
  const [highlight, setHighlight] = useState<HighlightTarget>(init.highlight);
  const [turntable, setTurntable] = useState(init.turntable);
  const [aim, setAim] = useState(init.aim);
  const [drive, setDrive] = useState(init.drive);
  const [angle, setAngle] = useState<Angle>(init.angle);
  const [ortho, setOrtho] = useState(init.ortho);
  const [accent, setAccent] = useState(init.accent);
  const [effects, setEffects] = useState(init.effects);
  const [limelight, setLimelight] = useState(init.limelight);
  const [preload, setPreload] = useState(init.preload);
  const [guides, setGuides] = useState(init.guides);
  const [hotspots, setHotspots] = useState(init.hotspots);
  const [intake, setIntake] = useState(init.intake);
  const [spin, setSpin] = useState(init.spin);
  const [yaw, setYaw] = useState(init.yaw);
  const [rpm, setRpm] = useState(init.rpm);
  const [cycle, setCycle] = useState<number | null>(init.cycle);
  const [autoCycle, setAutoCycle] = useState(init.autoCycle);
  const [idle, setIdle] = useState(init.idle);
  const [frozen, setFrozen] = useState(false);
  const [hover, setHover] = useState<SubsystemId | null>(null);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 640);
  const readout = useMemo(() => createStore<Readout | null>(null), []);
  const reduced = usePrefersReducedMotion();

  const robot = useRef<ApexRobotHandle>(null);
  const balls = useRef<BallsHandle>(null);
  const command = useRef<RobotCommand>({});
  const driveGroup = useRef<THREE.Group>(null);
  const aimRef = useRef<AimDemoHandle>(null);
  const setCommand = useCallback((c: RobotCommand) => {
    command.current = c;
  }, []);
  const setRobotX = useCallback((x: number) => {
    if (driveGroup.current) driveGroup.current.position.x = x;
  }, []);
  const onLaunch = useCallback((e: LaunchEvent) => aimRef.current?.launch(e) ?? false, []);
  const onSubsystemClick = useCallback(
    (id: SubsystemId) => setHighlight((h) => (h === id ? null : id)),
    [],
  );

  useEffect(() => {
    if (!aim) {
      command.current = {};
      if (driveGroup.current) driveGroup.current.position.set(0, 0, 0);
    }
  }, [aim]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && aim) {
        e.preventDefault();
        aimRef.current?.fire();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aim]);

  // strafe wheels for the static "spin" preview: 25 in/s to the left
  const wheelSpeeds = useMemo<WheelSpeeds>(() => (spin ? (mecanumWheelSpeeds(0, 25, 0) as WheelSpeeds) : [0, 0, 0, 0]), [spin]);
  const bg = stageBackground(look, tone);
  const ui = init.ui;
  const assembly = Array.isArray(highlight) ? (Object.keys(ASSEMBLIES).find((k) => ASSEMBLIES[k].join() === (highlight as SubsystemId[]).join()) ?? "") : "";

  // Portal to <body>: the root layout's <main> is its own stacking context (z-10), under the header.
  return createPortal(
    <div className="fixed inset-0 z-[60]" style={{ background: bg }}>
      <RobotCanvas key={effects ? "fx" : "plain"} maxDpr={2} postEffects={effects}>
        <Stage look={look} tone={tone} effects={effects} shadowScale={aim ? 3 : 1.6} fog={aim ? [6, 16] : [2.6, 7.5]}>
          <CameraRig
            key={`${angle}-${ortho}`}
            angle={angle}
            ortho={ortho}
            turntable={turntable && !reduced}
            explode={explode}
            cam={angle === init.angle ? init.cam : null}
            at={angle === init.angle ? init.at : null}
            fov={init.fov}
          />
          <group ref={driveGroup}>
            <ApexRobot
              ref={robot}
              command={command}
              look={look}
              tone={tone}
              accent={accent}
              explode={explode}
              highlight={highlight}
              turretYaw={yaw}
              flywheelRpm={rpm}
              wheelSpeeds={wheelSpeeds}
              intakeOn={intake}
              limelight={limelight}
              preload={aim ? 0 : preload}
              alliance={init.alliance}
              cycle={aim ? undefined : cycle}
              cycleBalls={aim ? 2 : init.cycleBalls}
              autoCycle={!aim && autoCycle}
              cycleKind={init.kind}
              idle={idle}
              ambientOcclusion={init.ao}
              onLaunch={onLaunch}
              onSubsystemOver={setHover}
              onSubsystemClick={onSubsystemClick}
            />
          </group>
          <Balls ref={balls} look={look} timeScale={frozen ? 0 : 1} trail={aim} />
          {aim ? (
            <AimDemo
              ref={aimRef}
              robot={robot}
              balls={balls}
              onCommand={setCommand}
              onRobotX={setRobotX}
              drive={drive}
              look={look}
              tone={tone}
              alliance={init.alliance}
              initialTarget={init.target}
              shot={init.shot}
              onFreeze={() => setFrozen(true)}
              readout={readout}
            />
          ) : null}
          {guides ? <Guides robot={robot} /> : null}
          {hotspots ? <Hotspots robot={robot} /> : null}
          {init.debug ? <DebugReport robot={robot} /> : null}
        </Stage>
      </RobotCanvas>

      {ui ? (
        <>
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            aria-expanded={panelOpen}
            className="fixed top-4 left-4 z-10 rounded border border-white/15 bg-black/70 px-2 py-1 font-mono text-[10px] tracking-[0.1em] text-zinc-200 uppercase backdrop-blur sm:hidden"
          >
            {panelOpen ? "Hide controls" : "Controls"}
          </button>
          {panelOpen ? (
            <div
              data-lab-panel
              className="fixed top-4 left-4 flex max-h-[calc(100vh-2rem)] w-[300px] max-w-[calc(100vw-2rem)] flex-col gap-2 overflow-y-auto rounded-md border border-white/10 bg-black/65 p-3 text-[12px] text-zinc-200 backdrop-blur max-sm:top-12"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] tracking-[0.12em] uppercase">APEX-R1 · robot lab</span>
                <span className="font-mono text-[10px] text-zinc-500">FTC 36674</span>
              </div>
              <Row label="look">
                <Seg label="look" value={look} options={["studio", "clay", "blueprint"] as const} onChange={setLook} />
              </Row>
              <Row label="tone">
                <Seg label="tone" value={tone} options={["dark", "light"] as const} onChange={setTone} />
              </Row>
              <Row label={`explode ${explode.toFixed(2)}`}>
                <input aria-label="explode" type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(Number(e.target.value))} />
              </Row>
              <Row label="highlight">
                <select
                  aria-label="highlight subsystem"
                  className="rounded border border-white/15 bg-black/60 px-1 py-1"
                  value={typeof highlight === "string" ? highlight : ""}
                  onChange={(e) => setHighlight((e.target.value || null) as SubsystemId | null)}
                >
                  <option value="">— none —</option>
                  {SUBSYSTEMS.map((s) => (
                    <option key={s} value={s}>
                      {SUBSYSTEM_INFO[s].label}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="assembly">
                <select
                  aria-label="highlight assembly"
                  className="rounded border border-white/15 bg-black/60 px-1 py-1"
                  value={assembly}
                  onChange={(e) => setHighlight(e.target.value ? ASSEMBLIES[e.target.value] : null)}
                >
                  <option value="">— none —</option>
                  {Object.keys(ASSEMBLIES).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Row>
              {!aim ? (
                <>
                  <Row label={`turret ${deg(yaw).toFixed(0)}°`}>
                    <input aria-label="turret yaw" type="range" min={-3.2} max={3.2} step={0.01} value={yaw} onChange={(e) => setYaw(Number(e.target.value))} />
                  </Row>
                  <Row label={`flywheel ${rpm}`}>
                    <input aria-label="flywheel rpm" type="range" min={0} max={5000} step={50} value={rpm} onChange={(e) => setRpm(Number(e.target.value))} />
                  </Row>
                  <Row label={cycle === null ? "cycle off" : `cycle ${cycle.toFixed(2)}`}>
                    <input
                      aria-label="scoring cycle"
                      type="range"
                      min={-0.02}
                      max={1}
                      step={0.005}
                      value={cycle ?? -0.02}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setCycle(v < 0 ? null : v);
                      }}
                    />
                  </Row>
                </>
              ) : null}
              <Row label="accent">
                <input aria-label="accent colour" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-6 w-full bg-transparent" />
              </Row>
              {!aim ? (
                <Row label={`preload ${preload}`}>
                  <input aria-label="preloaded POLLEN" type="range" min={0} max={3} step={1} value={preload} onChange={(e) => setPreload(Number(e.target.value))} />
                </Row>
              ) : null}
              <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[11px]">
                {(
                  [
                    ["turntable", turntable, setTurntable],
                    ["aim demo", aim, setAim],
                    ["drive", drive, setDrive],
                    ["intake", intake, setIntake],
                    ["wheels", spin, setSpin],
                    ["auto cycle", autoCycle, setAutoCycle],
                    ["idle", idle, setIdle],
                    ["limelight", limelight, setLimelight],
                    ["guides", guides, setGuides],
                    ["hotspots", hotspots, setHotspots],
                    ["post fx", effects, setEffects],
                  ] as [string, boolean, (v: boolean) => void][]
                ).map(([k, v, set]) => (
                  <label key={k} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
                    {k}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {ANGLES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAngle(a)}
                    className={`rounded border px-1.5 py-0.5 text-[10px] ${angle === a ? "border-[#F7E326] text-[#F7E326]" : "border-white/15 text-zinc-300"}`}
                  >
                    {a}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setOrtho((o) => !o)}
                  className={`rounded border px-1.5 py-0.5 text-[10px] ${ortho ? "border-[#F7E326] text-[#F7E326]" : "border-white/15 text-zinc-300"}`}
                >
                  ortho
                </button>
              </div>
              {reduced ? <p className="text-[10px] text-zinc-500">prefers-reduced-motion: spins and turntable off</p> : null}
            </div>
          ) : null}

          <StatsPanel hover={hover} />
          {aim ? <ReadoutPanel store={readout} /> : null}

          <p className="fixed right-4 bottom-4 font-mono text-[10px] tracking-[0.08em] text-zinc-500 uppercase max-sm:hidden">
            Concept model · generated from <span className="normal-case">RobotConstants.java</span> · real CAD pending
          </p>
        </>
      ) : null}
    </div>,
    document.body,
  );
}
