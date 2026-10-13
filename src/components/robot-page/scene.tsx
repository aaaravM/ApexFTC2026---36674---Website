"use client";
/* eslint-disable react-hooks/immutability --
   R3F's per-frame pattern: useFrame mutates three.js objects (materials, cameras, rig commands)
   and the page store's frame state directly instead of setting React state 60×/s. Nothing here is
   read during render; the React Compiler is not enabled for this project. */

// The /robot 3D stage (lazy-loaded chunk). One WebGL context for the whole page, mounted through
// the foundation's SceneShell (browser-only, pauses when the route is hidden or offscreen).
//
// Robot engine: src/components/robot (ApexRobot, Stage, Hive, Balls, Trajectory) — used through
// its public API only. If the team drops a real CAD export at public/models/apex-r1.glb, the
// engine's model component is the one import to swap (see <Robot/> below).
//
// Frame order (R3F runs useFrame subscribers in mount order):
//   Director  → scroll pose → chassis yaw, camera, robot command (turret / flywheel / wheels)
//   ApexRobot → the engine animates turret, flywheel, explode, ghosting
//   LateRig   → partial explode of the active subsystem, overlay DOM (brackets, telemetry,
//               labels), the AIM gates + FIRE, click-to-identify

import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { SceneShell } from "@/components/three";
import {
  ApexRobot,
  Balls,
  ENVELOPE,
  Hive,
  IN,
  Stage,
  Trajectory,
  hiveAimOffset,
  mecanumWheelSpeeds,
  type ApexRobotHandle,
  type ArcSource,
  type BallsHandle,
  type RobotCommand,
  type RobotTone,
  type SubsystemId,
  type WheelSpeeds,
} from "@/components/robot";
import {
  AIM_STOP,
  CAMERA_AZIMUTH_DEG,
  CAMERA_HFOV_DEG,
  LOCK_BEARING_DEG,
  RC,
  STOPS,
  VIEWS,
  aimGeometry,
  presentationYaws,
  readinessText,
  type AimGeometry,
} from "./data";
import { scrollPose } from "./pose";
import type { AimReadout, RobotPageStore, ViewMode } from "./store";

const DEG = Math.PI / 180;
/** Render layer the engine keeps out of the contact-shadow pass (rig.ts DETAIL_LAYER). */
const OVERLAY_LAYER = 4;
const SUBS: SubsystemId[] = ["drivetrain", "odometry", "electronics", "intake", "hopper", "turret", "shooter", "vision"];
/** How far the active subsystem slides out of the assembly in ASSEMBLED mode (metres, robot axes). */
const PARTIAL: Record<SubsystemId, [number, number, number]> = {
  drivetrain: [0, 0, 0],
  odometry: [0, -0.045, 0],
  electronics: [0, 0.085, -0.06],
  intake: [0, 0.012, 0.085],
  hopper: [0, 0.03, 0.015],
  turret: [0, 0.085, 0],
  shooter: [0, 0.075, 0],
  vision: [0, 0.05, 0.065],
};
/** Wheel ids + which side they sit on (engine Drivetrain WHEELS: sx +1 = left). */
const WHEEL_SIDES: [string, number][] = [
  ["fl", 1],
  ["fr", -1],
  ["bl", 1],
  ["br", -1],
];
/** The engine turret lags a ramp by ≈ its smoothing time; leading the command by the chassis
 *  rate × that time is the website twin of Turret.java's heading-velocity feedforward (kV). */
const TURRET_LEAD_SEC = 0.12;
const LOCK_RAD = LOCK_BEARING_DEG * DEG;
const CAM_AZ = CAMERA_AZIMUTH_DEG * DEG;
const HALF_HFOV_RAD = (CAMERA_HFOV_DEG / 2) * DEG;
const RING_R = 0.4;

const damp = THREE.MathUtils.damp;
const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
const signedDeg = (d: number, pad = 3) => {
  const v = Math.round(d * 10) / 10;
  const sign = v < 0 ? "−" : "+";
  const [int, dec] = Math.abs(v).toFixed(1).split(".");
  return `${sign}${int.padStart(pad, "0")}.${dec}°`;
};

export interface SceneColors {
  text: string;
  muted: string;
  line: string;
  pollen: string;
}

interface FrameState {
  init: boolean;
  clock: number;
  yaw: number;
  yawVel: number;
  lift: number;
  ex: number;
  partial: Record<SubsystemId, number>;
  cube: number;
  aim: number;
  nearest: number;
  camPos: THREE.Vector3;
  camTarget: THREE.Vector3;
  fov: number;
  geo: AimGeometry;
  rpmCmd: number;
  atSpeedFor: number;
  lastSeen: number;
  feederUntil: number;
  inFlight: boolean;
  firedAt: number;
  shots: number;
  lastShot: AimReadout["lastShot"];
  shotSeq: number;
  lastFireSeq: number;
  lastPickSeq: number;
  publishAt: number;
  hitAt: number;
  bracket: { x0: number; y0: number; x1: number; y1: number; on: number; init: boolean };
  text: Record<string, string>;
}

function makeFrameState(): FrameState {
  return {
    init: false,
    clock: 0,
    yaw: 0,
    yawVel: 0,
    lift: 0,
    ex: 0,
    partial: Object.fromEntries(SUBS.map((s) => [s, 0])) as Record<SubsystemId, number>,
    cube: 0,
    aim: 0,
    nearest: 0,
    camPos: new THREE.Vector3(1, 0.6, 1.2),
    camTarget: new THREE.Vector3(0, 0.2, 0),
    fov: 30,
    geo: aimGeometry(96, 0),
    rpmCmd: 0,
    atSpeedFor: 0,
    lastSeen: 0,
    feederUntil: 0,
    inFlight: false,
    firedAt: 0,
    shots: 0,
    lastShot: null,
    shotSeq: 0,
    lastFireSeq: -1,
    lastPickSeq: -1,
    publishAt: 0,
    hitAt: -10,
    bracket: { x0: 0, y0: 0, x1: 0, y1: 0, on: 0, init: false },
    text: {},
  };
}

/** World position of the HIVE CELL aim point for a range (inches, from the robot's tracking point). */
function cellWorld(rangeIn: number, aimOff: THREE.Vector3, out: THREE.Vector3) {
  return out.set(Math.sin(LOCK_RAD) * rangeIn * IN, aimOff.y, Math.cos(LOCK_RAD) * rangeIn * IN);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

export interface RobotSceneProps {
  store: RobotPageStore;
  tone: RobotTone;
  reduced: boolean;
  colors: SceneColors;
  poster: React.ReactNode;
  label: string;
}

export default function RobotScene({ store, tone, reduced, colors, poster, label }: RobotSceneProps) {
  return (
    <SceneShell
      className="absolute inset-0"
      poster={poster}
      label={label}
      camera={{ fov: 30, near: 0.02, far: 60, position: [0.95, 0.5, 1.2] }}
      gl={{ toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.05 }}
      maxDpr={1.75}
    >
      <AdaptiveQuality />
      <Stage look="clay" tone={tone} background={null} stats={false} shadowScale={1.9} lightIntensity={tone === "light" ? 1 : 1.05}>
        <SceneContent store={store} tone={tone} reduced={reduced} colors={colors} />
      </Stage>
    </SceneShell>
  );
}

/** Drop to DPR 1 when the GPU can't hold the frame rate (SceneShell starts at up to 1.75). */
function AdaptiveQuality() {
  const setDpr = useThree((s) => s.setDpr);
  return (
    <PerformanceMonitor
      flipflops={3}
      onDecline={() => setDpr(1)}
      onIncline={() => setDpr(Math.min(1.75, window.devicePixelRatio || 1))}
      onFallback={() => setDpr(1)}
    />
  );
}

function SceneContent({ store, tone, reduced, colors }: { store: RobotPageStore; tone: RobotTone; reduced: boolean; colors: SceneColors }) {
  const fs = useRef<FrameState>(null as unknown as FrameState);
  if (fs.current === null) fs.current = makeFrameState();
  const robot = useRef<ApexRobotHandle>(null);
  const chassis = useRef<THREE.Group>(null);
  const balls = useRef<BallsHandle>(null);
  const command = useRef<RobotCommand>({});
  const arc = useRef<ArcSource | null>(null);
  const aimOff = useMemo(() => hiveAimOffset("blue"), []);

  return (
    <>
      <Director store={store} fs={fs} robot={robot} chassis={chassis} command={command} aimOff={aimOff} />
      <group ref={chassis}>
        {/* Swap point for the real CAD: replace ApexRobot with the engine's GLB model component
            (same props + handle) once it exists — see docs/ROBOT-MODEL.md. */}
        <ApexRobot
          ref={robot}
          command={command}
          look="clay"
          tone={tone}
          preload={2}
          alliance="blue"
          reducedMotion={reduced}
          explodeSmoothing={0.4}
        />
        <SizeCube fs={fs} color={colors.text} />
        <HeadingTick color={colors.text} />
        <FovWedge fs={fs} color={colors.muted} />
      </group>
      <LateRig store={store} fs={fs} robot={robot} chassis={chassis} balls={balls} arc={arc} aimOff={aimOff} />
      <TurntableRing color={colors.line} pollen={colors.pollen} />
      <LockLine fs={fs} robot={robot} color={colors.text} />
      <HiveRig store={store} fs={fs} aimOff={aimOff} tone={tone} />
      <RangeDimension store={store} fs={fs} aimOff={aimOff} color={colors.muted} />
      <Trajectory source={arc} color={colors.text} opacity={0.8} extendToFloor={false} />
      <Balls ref={balls} look="clay" max={4} timeScale={reduced ? 1 : 0.5} />
    </>
  );
}

// ─── Director: scroll → yaw, camera, robot command ──────────────────────────────────────────

interface Frame {
  target: THREE.Vector3;
  radius: number;
  elev: number;
  azim: number;
  fov: number;
}
const newFrame = (): Frame => ({ target: new THREE.Vector3(), radius: 0.5, elev: 0, azim: 0, fov: 30 });

function Director({
  store,
  fs,
  robot,
  chassis,
  command,
  aimOff,
}: {
  store: RobotPageStore;
  fs: MutableRefObject<FrameState>;
  robot: MutableRefObject<ApexRobotHandle | null>;
  chassis: MutableRefObject<THREE.Group | null>;
  command: MutableRefObject<RobotCommand>;
  aimOff: THREE.Vector3;
}) {
  const yaws = useMemo(() => presentationYaws(), []);
  const aimBase = useMemo(() => {
    const last = yaws[yaws.length - 1] / DEG;
    let v = LOCK_BEARING_DEG;
    while (v < last + 40) v += 360;
    return v * DEG;
  }, [yaws]);
  const scratch = useMemo(
    () => ({
      ys: [] as number[],
      box: new THREE.Box3(),
      a: newFrame(),
      b: newFrame(),
      c: new THREE.Vector3(),
      d: new THREE.Vector3(),
      t: new THREE.Vector3(),
      pos: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const f = fs.current;
    const st = store;
    const r = robot.current;
    const ch = chassis.current;
    if (!ch) return;
    f.clock += dt;
    const snap = st.reduced || !f.init;

    // ── where are we in the walkthrough?
    const ys = scratch.ys;
    ys.length = 0;
    for (const s of st.stops) ys.push(s.y);
    const measured = ys.length === STOPS.length;
    const pose = scrollPose(ys, window.scrollY);
    const nearest = st.reduced || !measured ? st.active : pose.nearest;
    f.nearest = nearest;
    const isAim = nearest === AIM_STOP;
    const def = STOPS[nearest];
    const mode: ViewMode = isAim ? "assembled" : st.mode;

    // ── chassis yaw: a pure function of scroll (turntable with detents); the dial in AIM
    const aimYaw = aimBase - st.aim.turretDeg * DEG;
    const stopYaw = (i: number) => (i >= AIM_STOP ? aimYaw : yaws[Math.max(0, Math.min(i, yaws.length - 1))]);
    let yawTarget: number;
    if (st.reduced || !measured) yawTarget = stopYaw(nearest);
    else if (pose.i >= AIM_STOP) yawTarget = aimYaw;
    else yawTarget = stopYaw(pose.i) + (stopYaw(pose.i + 1) - stopYaw(pose.i)) * pose.g;
    const prevYaw = f.yaw;
    f.yaw = snap ? yawTarget : damp(f.yaw, yawTarget, 5.5, dt);
    const rawVel = snap ? 0 : (f.yaw - prevYaw) / Math.max(dt, 1e-4);
    f.yawVel = st.reduced ? 0 : damp(f.yawVel, rawVel, 14, dt);

    // ── per-mode targets
    for (const id of SUBS) {
      const want = mode === "assembled" && def.sub === id ? 1 : 0;
      f.partial[id] = snap ? want : damp(f.partial[id], want, 5, dt);
    }
    f.lift = 0.055 * f.partial.odometry;
    const exWant = mode === "exploded" ? 1 : 0;
    f.ex = snap ? exWant : damp(f.ex, exWant, 3, dt);
    const cubeWant = nearest === 0 && mode !== "exploded" ? 1 : 0;
    f.cube = snap ? cubeWant : damp(f.cube, cubeWant, 6, dt);
    const aimWant = st.reduced || !measured ? (isAim ? 1 : 0) : pose.i >= AIM_STOP ? 1 : pose.i === AIM_STOP - 1 ? pose.g : 0;
    f.aim = snap ? aimWant : damp(f.aim, aimWant, 9, dt);

    ch.rotation.y = f.yaw;
    ch.position.y = f.lift;

    // ── the team's solver, every frame: turret angle + flywheel RPM for the HIVE we hold
    f.geo = aimGeometry(st.aim.rangeIn, f.yaw);
    const sol = f.geo.solution;
    if (sol.valid || f.rpmCmd === 0) f.rpmCmd = sol.valid ? sol.flywheelRpm : aimGeometry(96, f.yaw).solution.flywheelRpm;
    const turretCmd = sol.turretAngleRad - f.yawVel * TURRET_LEAD_SEC;
    const c = command.current;
    c.turretYaw = turretCmd;
    c.flywheelRpm = f.rpmCmd;
    c.wheelSpeeds = mecanumWheelSpeeds(0, 0, f.yawVel) as WheelSpeeds;
    c.intakeOn = def.sub === "intake" || def.sub === "hopper";
    c.feederOn = f.clock < f.feederUntil;
    c.explode = mode === "exploded" ? 1 : 0;
    c.highlight = mode === "xray" ? (def.sub ?? "hopper") : null;

    // ── camera: frame the stop(s) we're between, blended by the same eased progress
    const cam = state.camera as THREE.PerspectiveCamera;
    const aspect = state.size.width / Math.max(1, state.size.height);
    const robotCenter = scratch.c.set(0, 0.2 + 0.12 * f.ex + f.lift, 0);
    const frameOf = (i: number, out: Frame) => {
      const s = STOPS[Math.max(0, Math.min(i, STOPS.length - 1))];
      const v = VIEWS[s.key];
      out.elev = v.elev * DEG;
      out.azim = CAM_AZ;
      out.fov = 30;
      if (s.kind === "aim") {
        // robot, arc and the whole HIVE (its far CELL leans past the aim point) in one shot
        const T = cellWorld(st.aim.rangeIn, aimOff, scratch.t);
        out.target.set(T.x * 0.56, 0.56, T.z * 0.56);
        out.radius = 0.56 * Math.hypot(T.x, T.z) + 0.74;
        out.azim = CAM_AZ - 26 * DEG;
        out.fov = 34;
        return out;
      }
      if (s.kind === "overview" || !s.sub || !r) {
        out.target.copy(robotCenter);
        out.radius = (0.47 + 0.17 * f.ex) * v.pad;
        return out;
      }
      const g = r.getObject(`explode.${s.sub}`);
      if (g) {
        scratch.box.setFromObject(g);
        if (!scratch.box.isEmpty()) {
          const center = scratch.box.getCenter(scratch.d);
          const size = scratch.box.getSize(scratch.pos).length() / 2;
          out.target.copy(robotCenter).lerp(center, v.mix);
          out.radius = THREE.MathUtils.clamp(size * 0.95, 0.25, 0.36) * v.pad + 0.07 * f.ex;
          return out;
        }
      }
      out.target.copy(robotCenter);
      out.radius = 0.4;
      return out;
    };
    const A = scratch.a;
    const B = scratch.b;
    if (st.reduced || !measured) {
      frameOf(nearest, A);
      frameOf(nearest, B);
    } else {
      frameOf(pose.i, A);
      frameOf(Math.min(pose.i + 1, STOPS.length - 1), B);
    }
    const k = st.reduced || !measured ? 0 : pose.i >= STOPS.length - 1 ? 0 : pose.g;
    const target = A.target.lerp(B.target, k);
    // phones: a touch wider, so the robot clears the telemetry (top) and mode switch (bottom)
    const radius = THREE.MathUtils.lerp(A.radius, B.radius, k) * (st.stacked ? 1.1 : 1);
    const elev = THREE.MathUtils.lerp(A.elev, B.elev, k);
    const azim = THREE.MathUtils.lerp(A.azim, B.azim, k);
    const fov = THREE.MathUtils.lerp(A.fov, B.fov, k);
    const vHalf = (fov * DEG) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const dist = radius / Math.sin(Math.min(vHalf, hHalf));
    const pos = scratch.pos.set(Math.sin(azim) * Math.cos(elev), Math.sin(elev), Math.cos(azim) * Math.cos(elev)).multiplyScalar(dist).add(target);
    // lift the subject a little above centre on desktop (the parts list sits bottom-left)
    const bias = st.stacked ? 0.02 : 0.07;
    const drop = bias * dist * Math.tan(vHalf) * 2;
    pos.y -= drop;
    target.y -= drop;
    if (snap) {
      f.camPos.copy(pos);
      f.camTarget.copy(target);
      f.fov = fov;
    } else {
      const lam = 4.2;
      f.camPos.x = damp(f.camPos.x, pos.x, lam, dt);
      f.camPos.y = damp(f.camPos.y, pos.y, lam, dt);
      f.camPos.z = damp(f.camPos.z, pos.z, lam, dt);
      f.camTarget.x = damp(f.camTarget.x, target.x, lam, dt);
      f.camTarget.y = damp(f.camTarget.y, target.y, lam, dt);
      f.camTarget.z = damp(f.camTarget.z, target.z, lam, dt);
      f.fov = damp(f.fov, fov, lam, dt);
    }
    cam.position.copy(f.camPos);
    cam.lookAt(f.camTarget);
    if (Math.abs(cam.fov - f.fov) > 1e-3) {
      cam.fov = f.fov;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld();
    if (!f.init) {
      f.init = true;
      f.lastFireSeq = st.fireSeq;
      f.lastPickSeq = st.pick?.seq ?? -1;
      f.lastSeen = f.clock;
      f.rpmCmd = sol.valid ? sol.flywheelRpm : f.rpmCmd;
    }
  }, -1); // before the engine (priority 0), whatever the mount order
  return null;
}

// ─── LateRig: after the engine's frame ──────────────────────────────────────────────────────

function LateRig({
  store,
  fs,
  robot,
  chassis,
  balls,
  arc,
  aimOff,
}: {
  store: RobotPageStore;
  fs: MutableRefObject<FrameState>;
  robot: MutableRefObject<ApexRobotHandle | null>;
  chassis: MutableRefObject<THREE.Group | null>;
  balls: MutableRefObject<BallsHandle | null>;
  arc: MutableRefObject<ArcSource | null>;
  aimOff: THREE.Vector3;
}) {
  const scratch = useMemo(
    () => ({
      box: new THREE.Box3(),
      corners: Array.from({ length: 8 }, () => new THREE.Vector3()),
      v: new THREE.Vector3(),
      w: new THREE.Vector3(),
      T: new THREE.Vector3(),
      muzzle: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
      ray: new THREE.Raycaster(),
    }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const f = fs.current;
    const st = store;
    const r = robot.current;
    const ch = chassis.current;
    if (!r || !ch || !f.init) return;
    const dom = st.dom;
    const cam = state.camera as THREE.PerspectiveCamera;
    const { width: W, height: H } = state.size;
    const isAim = f.nearest === AIM_STOP;
    const def = STOPS[f.nearest];

    // 1 ── ASSEMBLED: slide the active subsystem part-way out (added to the engine's offsets)
    for (const id of SUBS) {
      const k = f.partial[id];
      if (k < 0.0005) continue;
      if (id === "drivetrain") {
        for (const [w, sx] of WHEEL_SIDES) {
          const g = r.getObject(`wheelExplode.${w}`);
          if (g) g.position.x += sx * 0.045 * k;
        }
        continue;
      }
      const g = r.getObject(`explode.${id}`);
      if (!g) continue;
      const o = PARTIAL[id];
      g.position.x += o[0] * k;
      g.position.y += o[1] * k;
      g.position.z += o[2] * k;
    }
    ch.updateMatrixWorld(true);

    const project = (p: THREE.Vector3) => {
      scratch.v.copy(p).project(cam);
      return { x: (scratch.v.x * 0.5 + 0.5) * W, y: (-scratch.v.y * 0.5 + 0.5) * H, front: scratch.v.z < 1 };
    };
    const put = (el: HTMLElement | null | undefined, x: number, y: number, opacity: number, key: string) => {
      if (!el) return;
      const o = Math.round(opacity * 100) / 100;
      const tr = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (f.text[`${key}:t`] !== tr) {
        el.style.transform = tr;
        f.text[`${key}:t`] = tr;
      }
      const os = String(o);
      if (f.text[`${key}:o`] !== os) {
        el.style.opacity = os;
        el.style.visibility = o < 0.01 ? "hidden" : "visible";
        f.text[`${key}:o`] = os;
      }
    };
    const setText = (el: HTMLElement | null | undefined, text: string, key: string) => {
      if (!el || f.text[key] === text) return;
      el.textContent = text;
      f.text[key] = text;
    };

    // 2 ── selection brackets: active subsystem (walkthrough) or the CELL (AIM)
    let want = 0;
    let rect: { x0: number; y0: number; x1: number; y1: number } | null = null;
    const T = cellWorld(st.aim.rangeIn, aimOff, scratch.T);
    if (isAim) {
      scratch.box.setFromCenterAndSize(T, scratch.w.set(0.52, 0.36, 0.52));
    } else if (def.sub) {
      const g = r.getObject(`explode.${def.sub}`);
      if (g) scratch.box.setFromObject(g);
      else scratch.box.makeEmpty();
    } else scratch.box.makeEmpty();
    if (!scratch.box.isEmpty() && (isAim || def.sub)) {
      const { min, max } = scratch.box;
      let i = 0;
      for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) scratch.corners[i++].set(x, y, z);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const c of scratch.corners) {
        const p = project(c);
        x0 = Math.min(x0, p.x);
        y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x);
        y1 = Math.max(y1, p.y);
      }
      const pad = 10;
      rect = { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
      want = isAim ? f.aim : 1 - f.aim;
    }
    const b = f.bracket;
    if (rect) {
      if (!b.init || st.reduced || b.on < 0.02) {
        Object.assign(b, rect);
        b.init = true;
      } else {
        const lam = 16;
        b.x0 = damp(b.x0, rect.x0, lam, dt);
        b.y0 = damp(b.y0, rect.y0, lam, dt);
        b.x1 = damp(b.x1, rect.x1, lam, dt);
        b.y1 = damp(b.y1, rect.y1, lam, dt);
      }
    }
    b.on = st.reduced ? want : damp(b.on, want, 10, dt);
    const brk = dom.bracket;
    if (brk) {
      const corners = brk.children;
      const size = 14;
      const bx0 = Math.max(2, b.x0);
      const by0 = Math.max(2, b.y0);
      const bx1 = Math.min(W - 2, b.x1);
      const by1 = Math.min(H - 2, b.y1);
      put(corners[0] as HTMLElement, bx0, by0, b.on, "c0");
      put(corners[1] as HTMLElement, bx1 - size, by0, b.on, "c1");
      put(corners[2] as HTMLElement, bx0, by1 - size, b.on, "c2");
      put(corners[3] as HTMLElement, bx1 - size, by1 - size, b.on, "c3");
      // keep the tag below the stage's top chrome (desktop: the view-mode switch row)
      put(dom.bracketTag, bx0, Math.max(st.stacked ? 6 : 68, by0 - 26), b.on, "tag");
    }

    // 3 ── telemetry: heading, turret, lock — the turret holds a world bearing while the chassis spins
    const sol = f.geo.solution;
    const turretRad = r.getTurretYaw();
    const headingDeg = wrapDeg(f.yaw / DEG);
    const turretDeg = turretRad / DEG;
    const errDeg = wrapDeg((sol.turretAngleRad - turretRad) / DEG);
    const atLimit = r.isTurretAtLimit();
    const locked = !atLimit && Math.abs(errDeg) < RC.turretToleranceDeg;
    setText(dom.heading, signedDeg(headingDeg), "heading");
    setText(dom.turret, signedDeg(turretDeg), "turret");
    const lockText = atLimit ? "LIMIT ±170°" : locked ? "LOCKED ON HIVE" : "SLEWING";
    setText(dom.lock, lockText, "lock");
    if (dom.lockDot && f.text.lockDot !== String(locked)) {
      dom.lockDot.dataset.state = atLimit ? "limit" : locked ? "lock" : "slew";
      f.text.lockDot = String(locked);
    }
    // radar: top-down, "up" = away from the camera, so it reads like the 3D view
    const setRot = (el: SVGGElement | null | undefined, deg: number, key: string) => {
      if (!el) return;
      const tr = `rotate(${deg.toFixed(1)} 32 32)`;
      if (f.text[key] === tr) return;
      el.setAttribute("transform", tr);
      f.text[key] = tr;
    };
    setRot(dom.radarChassis, CAMERA_AZIMUTH_DEG + 180 - f.yaw / DEG, "rc");
    setRot(dom.radarTurret, CAMERA_AZIMUTH_DEG + 180 - f.yaw / DEG - turretDeg, "rt");

    // 4 ── labels: the 18 in cube (overview), and the AIM annotations
    {
      const top = scratch.w.set(0, ENVELOPE + 0.012, 0).applyMatrix4(ch.matrixWorld);
      const p = project(top);
      put(dom.cubeLabel, p.x, p.y, f.cube, "cube");
    }
    const geo = f.geo;
    const muzzle = r.getMuzzleWorld(scratch.muzzle);
    if (f.aim > 0.01 && sol.valid) {
      if (geo.apexZIn !== null) {
        // apex = highest point; x/z from the solver's own ballPosition at the apex time
        const t = geo.apexTimeSec;
        const vH = sol.muzzleSpeedIn * Math.cos(40 * DEG);
        const px = geo.input.muzzle.x + vH * Math.cos(sol.fieldAzimuthRad) * t;
        const py = geo.input.muzzle.y + vH * Math.sin(sol.fieldAzimuthRad) * t;
        const p = project(scratch.w.set(py * IN, geo.apexZIn * IN, px * IN));
        setText(dom.apexLabel, `APEX · ${geo.apexZIn.toFixed(1)} in`, "apexText");
        put(dom.apexLabel, p.x, p.y, f.aim, "apex");
      } else {
        const p = project(scratch.w.copy(T).setY(T.y + 0.3));
        setText(dom.apexLabel, "RISING AT TARGET", "apexText");
        put(dom.apexLabel, p.x, p.y, f.aim, "apex");
      }
    } else put(dom.apexLabel, 0, 0, 0, "apex");
    {
      const mid = project(scratch.w.set(T.x * 0.5, 0.004, T.z * 0.5));
      setText(dom.rangeLabel, `${Math.round(st.aim.rangeIn)} in`, "rangeText");
      put(dom.rangeLabel, mid.x, mid.y, f.aim, "range");
      const hit = project(T);
      const since = f.clock - f.hitAt;
      const hitO = since < 1.4 ? Math.max(0, 1 - Math.max(0, since - 0.6) / 0.8) * f.aim : 0;
      put(dom.hitLabel, hit.x, hit.y, hitO, "hit");
    }

    // 5 ── AIM: the four gates, exactly as AimController.isReadyToFire()
    const rpmNow = r.getFlywheelRpm();
    if (Math.abs(rpmNow - f.rpmCmd) <= RC.rpmTolerance) f.atSpeedFor += dt;
    else f.atSpeedFor = 0;
    const seen = Math.abs(sol.turretAngleRad) <= HALF_HFOV_RAD; // Webcam 1 is fixed to the chassis
    if (seen) f.lastSeen = f.clock;
    const estimateAge = f.clock - f.lastSeen;
    const gates = {
      solution: sol.valid,
      onTarget: locked,
      atSpeed: f.atSpeedFor >= RC.readyStableSec,
      fresh: estimateAge <= RC.maxEstimateAgeSec,
    };
    const ready = gates.solution && gates.onTarget && gates.atSpeed && gates.fresh;
    const readiness = readinessText(gates, sol, errDeg, f.rpmCmd - rpmNow);

    // trajectory preview (AIM only)
    arc.current = f.aim > 0.5 ? { input: geo.input, solution: sol.valid ? sol : null, from: muzzle.clone() } : null;

    // FIRE: the feeder is gated on the four gates, never on a timer
    if (st.fireSeq !== f.lastFireSeq) {
      f.lastFireSeq = st.fireSeq;
      f.shotSeq += 1;
      if (!ready) f.lastShot = { ok: false, text: `HELD — ${readiness}`, seq: f.shotSeq };
      else if (f.inFlight) f.lastShot = { ok: false, text: "HELD — BALL IN FLIGHT", seq: f.shotSeq };
      else {
        f.shots += 1;
        f.feederUntil = f.clock + 0.25;
        const tof = sol.flightTimeSec;
        if (st.reduced || !balls.current) {
          f.hitAt = f.clock;
          f.lastShot = { ok: true, text: `IN · TOF ${tof.toFixed(2)} s`, seq: f.shotSeq };
        } else {
          f.inFlight = true;
          f.firedAt = f.clock;
          f.lastShot = { ok: true, text: "FEEDING · POLLEN IN FLIGHT", seq: f.shotSeq };
          const seq = f.shotSeq;
          balls.current.fire({
            kind: "POLLEN",
            input: geo.input,
            solution: sol,
            from: muzzle.clone(),
            onArrive: () => {
              balls.current?.clear();
              const ff = fs.current;
              ff.inFlight = false;
              ff.hitAt = ff.clock;
              ff.lastShot = { ok: true, text: `IN · TOF ${tof.toFixed(2)} s`, seq };
              ff.publishAt = 0;
            },
          });
        }
      }
      f.publishAt = 0;
    }
    if (f.inFlight && f.clock - f.firedAt > 4) f.inFlight = false;

    if (f.nearest >= AIM_STOP - 1 && f.clock >= f.publishAt) {
      f.publishAt = f.clock + 0.1;
      st.publish({
        live: true,
        rpmNow,
        rpmTarget: f.rpmCmd,
        gates,
        ready,
        readiness,
        estimateAge,
        seen,
        inFlight: f.inFlight,
        shots: f.shots,
        lastShot: f.lastShot,
      });
    }

    // 6 ── click a part to read about it
    const pick = st.pick;
    if (pick && pick.seq !== f.lastPickSeq) {
      f.lastPickSeq = pick.seq;
      if (!isAim && r.root) {
        scratch.ndc.set((pick.x / W) * 2 - 1, -(pick.y / H) * 2 + 1);
        scratch.ray.layers.enableAll();
        scratch.ray.setFromCamera(scratch.ndc, cam);
        const hits = scratch.ray.intersectObject(r.root, true);
        for (const h of hits) {
          let o: THREE.Object3D | null = h.object;
          let found: SubsystemId | null = null;
          while (o) {
            const s = o.userData?.subsystem as SubsystemId | undefined;
            if (s) {
              found = s;
              break;
            }
            o = o.parent;
          }
          if (found) {
            const idx = STOPS.findIndex((x) => x.sub === found);
            if (idx >= 0) st.onPick?.(idx);
            break;
          }
        }
      }
    }
  });
  return null;
}

// ─── Small scene pieces ─────────────────────────────────────────────────────────────────────

function overlay(o: THREE.Object3D | null) {
  if (o) o.layers.set(OVERLAY_LAYER);
}

/** The 18 in sizing cube (Competition Manual R102), shown while the overview is on screen. */
function SizeCube({ fs, color }: { fs: MutableRefObject<FrameState>; color: string }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(ENVELOPE, ENVELOPE, ENVELOPE)), []);
  const mat = useMemo(() => new THREE.LineDashedMaterial({ color, transparent: true, opacity: 0, dashSize: 0.02, gapSize: 0.012, depthWrite: false }), [color]);
  const line = useRef<THREE.LineSegments>(null);
  useLayoutEffect(() => {
    line.current?.computeLineDistances();
  }, [geo]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useFrame(() => {
    const o = fs.current.cube * 0.55;
    mat.opacity = o;
    if (line.current) line.current.visible = o > 0.005;
  });
  return (
    <lineSegments
      ref={(l) => {
        line.current = l;
        overlay(l);
      }}
      geometry={geo}
      material={mat}
      position={[0, ENVELOPE / 2, 0]}
      frustumCulled={false}
    />
  );
}

/** Chevron on the ring at the chassis' forward direction (rotates with the robot). */
function HeadingTick({ color }: { color: string }) {
  const geo = useMemo(() => {
    const y = 0.0016;
    const r0 = RING_R + 0.012;
    const r1 = RING_R + 0.04;
    const w = 0.016;
    const pts = [0, y, r0, -w, y, r1, 0, y, r0, w, y, r1, -w, y, r1, w, y, r1];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return (
    <lineSegments ref={overlay} geometry={geo} frustumCulled={false}>
      <lineBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
    </lineSegments>
  );
}

/** Engraved turntable ring: 5° ticks, longer every 15° / 45°, plus the HIVE bearing mark. */
function TurntableRing({ color, pollen }: { color: string; pollen: string }) {
  const geo = useMemo(() => {
    const y = 0.0015;
    const pts: number[] = [];
    const N = 144;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      pts.push(Math.sin(a0) * RING_R, y, Math.cos(a0) * RING_R, Math.sin(a1) * RING_R, y, Math.cos(a1) * RING_R);
    }
    for (let d = 0; d < 360; d += 5) {
      const a = d * DEG;
      const len = d % 45 === 0 ? 0.034 : d % 15 === 0 ? 0.02 : 0.011;
      const r0 = RING_R - len;
      pts.push(Math.sin(a) * r0, y, Math.cos(a) * r0, Math.sin(a) * RING_R, y, Math.cos(a) * RING_R);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const mark = useMemo(() => {
    const y = 0.0017;
    const a = LOCK_RAD;
    const s = Math.sin(a);
    const c = Math.cos(a);
    const r0 = RING_R - 0.05;
    const r1 = RING_R + 0.06;
    // radial tick + a small diamond just outside the ring
    const rd = RING_R + 0.075;
    const d = 0.012;
    const px = (r: number, t: number) => [s * r + c * t, y, c * r - s * t];
    const pts = [...px(r0, 0), ...px(r1, 0), ...px(rd - d, 0), ...px(rd, d), ...px(rd, d), ...px(rd + d, 0), ...px(rd + d, 0), ...px(rd, -d), ...px(rd, -d), ...px(rd - d, 0)];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => () => mark.dispose(), [mark]);
  return (
    <>
      <lineSegments ref={overlay} geometry={geo} frustumCulled={false}>
        <lineBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
      </lineSegments>
      <lineSegments ref={overlay} geometry={mark} frustumCulled={false}>
        <lineBasicMaterial color={pollen} transparent opacity={0.95} depthWrite={false} />
      </lineSegments>
    </>
  );
}

/** The turret's line of sight: from the muzzle toward the HIVE bearing, fixed in the world. */
function LockLine({ fs, robot, color }: { fs: MutableRefObject<FrameState>; robot: MutableRefObject<ApexRobotHandle | null>; color: string }) {
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    const m = new THREE.LineDashedMaterial({ color, transparent: true, opacity: 0.5, dashSize: 0.03, gapSize: 0.02, depthWrite: false });
    const l = new THREE.LineSegments(g, m);
    l.frustumCulled = false;
    l.layers.set(OVERLAY_LAYER);
    return l;
  }, [color]);
  useLayoutEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const r = robot.current;
    if (!r) return;
    const f = fs.current;
    const o = 0.5 * (1 - f.aim);
    (line.material as THREE.LineDashedMaterial).opacity = o;
    line.visible = o > 0.01;
    if (!line.visible) return;
    r.getMuzzleWorld(v);
    const pos = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    const L = 1.7;
    pos.setXYZ(0, v.x, v.y, v.z);
    pos.setXYZ(1, v.x + Math.sin(LOCK_RAD) * L, v.y, v.z + Math.cos(LOCK_RAD) * L);
    pos.needsUpdate = true;
    line.computeLineDistances();
  });
  return <primitive object={line} />;
}

/** Webcam 1's horizontal field of view on the floor (it is fixed to the chassis), AIM only. */
function FovWedge({ fs, color }: { fs: MutableRefObject<FrameState>; color: string }) {
  const geo = useMemo(() => {
    const y = 0.0018;
    const z0 = 5 * IN; // Camera.X_IN = 5 in forward of the tracking point
    const R = 1.6;
    const h = HALF_HFOV_RAD;
    const pts: number[] = [0, y, z0, Math.sin(h) * R, y, z0 + Math.cos(h) * R, 0, y, z0, -Math.sin(h) * R, y, z0 + Math.cos(h) * R];
    const N = 24;
    for (let i = 0; i < N; i++) {
      const a0 = -h + (2 * h * i) / N;
      const a1 = -h + (2 * h * (i + 1)) / N;
      pts.push(Math.sin(a0) * R, y, z0 + Math.cos(a0) * R, Math.sin(a1) * R, y, z0 + Math.cos(a1) * R);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }), [color]);
  const ref = useRef<THREE.LineSegments>(null);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useFrame(() => {
    const o = 0.7 * fs.current.aim;
    mat.opacity = o;
    if (ref.current) ref.current.visible = o > 0.01;
  });
  return (
    <lineSegments
      ref={(l) => {
        ref.current = l;
        overlay(l);
      }}
      geometry={geo}
      material={mat}
      frustumCulled={false}
    />
  );
}

/** The HIVE, placed so its upward CELL opening sits RANGE inches away along the lock bearing. */
function HiveRig({ store, fs, aimOff, tone }: { store: RobotPageStore; fs: MutableRefObject<FrameState>; aimOff: THREE.Vector3; tone: RobotTone }) {
  const ref = useRef<THREE.Group>(null);
  const T = useMemo(() => new THREE.Vector3(), []);
  const off = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const f = fs.current;
    g.visible = f.aim > 0.02;
    if (!g.visible) return;
    cellWorld(store.aim.rangeIn, aimOff, T);
    const face = LOCK_RAD + Math.PI; // the upward CELL leans toward the robot
    off.set(aimOff.x, 0, aimOff.z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, face);
    g.position.set(T.x - off.x, 0, T.z - off.z);
    g.rotation.y = face;
  });
  return (
    <group ref={ref} visible={false}>
      <Hive look="clay" tone={tone} />
    </group>
  );
}

/** Dimension line on the floor from the robot to the CELL (AIM only). */
function RangeDimension({ store, fs, aimOff, color }: { store: RobotPageStore; fs: MutableRefObject<FrameState>; aimOff: THREE.Vector3; color: string }) {
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(18), 3));
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    const l = new THREE.LineSegments(g, m);
    l.frustumCulled = false;
    l.layers.set(OVERLAY_LAYER);
    return l;
  }, [color]);
  useLayoutEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );
  const T = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const f = fs.current;
    const o = 0.75 * f.aim;
    (line.material as THREE.LineBasicMaterial).opacity = o;
    line.visible = o > 0.01;
    if (!line.visible) return;
    cellWorld(store.aim.rangeIn, aimOff, T);
    const y = 0.003;
    const s = Math.sin(LOCK_RAD);
    const c = Math.cos(LOCK_RAD);
    const n = 0.05; // tick half-length, perpendicular to the line
    const r0 = RING_R + 0.1; // start just outside the turntable ring
    const pos = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    pos.setXYZ(0, s * r0, y, c * r0);
    pos.setXYZ(1, T.x, y, T.z);
    pos.setXYZ(2, s * r0 + c * n, y, c * r0 - s * n);
    pos.setXYZ(3, s * r0 - c * n, y, c * r0 + s * n);
    pos.setXYZ(4, T.x + c * n, y, T.z - s * n);
    pos.setXYZ(5, T.x - c * n, y, T.z + s * n);
    pos.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  });
  return <primitive object={line} />;
}
