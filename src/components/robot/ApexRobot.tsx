"use client";

/**
 * APEX-R1 — procedural concept model of Apex Robotics' (FTC #36674) BIOBUZZ turret shooter,
 * generated from the numbers in the team's RobotConstants.java. Units: metres, robot faces +Z.
 */
import {
  memo,
  Suspense,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type Ref,
} from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree, type RootState, type ThreeElements, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { modelSrc } from "@/content/robot";
import { AO_UNIFORMS, AoBaker, cachedAo } from "./ao";
import { RigRegistry, RobotProvider, SubsystemScope, useRigRef, type MaterialScope } from "./context";
import { GlbRobot, DRACO_DECODER_PATH } from "./GlbRobot";
import { CYCLE_PHASES, CYCLE_SECONDS, CYCLE_SPACING, ballRadiusMm, cyclePoint, cycleUses, type CycleBallKind } from "./cycle";
import { DERIVED, TURRET } from "./dimensions";
import { BALL_COLORS, DEFAULT_ACCENT, MaterialLibrary } from "./materials";
import {
  approach,
  clamp,
  clampTurret,
  DETAIL_LAYER,
  EXPLODE_LIFT,
  explodePose,
  explodeProgress,
  FLYWHEEL_VISUAL_SCALE,
  launchDirection,
  maxSpinStep,
  mecanumTwist,
  smoothDamp,
  smoothstep,
  SUBSYSTEMS,
  TURRET_MAX_SLEW,
  WHEEL_EXPLODE,
  WHEEL_VISUAL_SCALE,
  type ApexRobotHandle,
  type ApexRobotProps,
  type HighlightTarget,
  type RobotCommand,
  type SubsystemId,
} from "./rig";
import { Drivetrain, WHEELS } from "./subsystems/Drivetrain";
import { Electronics, ElectronicsHarness } from "./subsystems/Electronics";
import { Hopper } from "./subsystems/Hopper";
import { Intake } from "./subsystems/Intake";
import { Odometry, X_POD, Y_POD } from "./subsystems/Odometry";
import { Shooter } from "./subsystems/Shooter";
import { TurretFixed, TurretRotating } from "./subsystems/Turret";
import { Vision } from "./subsystems/Vision";
import { rmm } from "./subsystems/util";
import { POD_WHEEL_R } from "./parts/OdoPod";

// Subsystems never take changing props from ApexRobot (except a few), so memo keeps per-frame
// prop updates (e.g. turret aim from the mouse) from re-rendering the whole tree.
const DrivetrainM = memo(Drivetrain);
const OdometryM = memo(Odometry);
const ElectronicsM = memo(Electronics);
const HarnessM = memo(ElectronicsHarness);
const IntakeM = memo(Intake);
const HopperM = memo(Hopper);
const TurretFixedM = memo(TurretFixed);
const TurretRotatingM = memo(TurretRotating);
const ShooterM = memo(Shooter);
const VisionM = memo(Vision);

function subscribeReducedMotion(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
/** `prefers-reduced-motion: reduce`, live. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false),
    () => false,
  );
}

/** A subsystem group: explode offset is driven by the rig; userData tags it for pointer events. */
function Sub({ id, children }: { id: SubsystemId; children: ReactNode }) {
  const ref = useRigRef<THREE.Group>(`explode.${id}`);
  return (
    <group ref={ref} name={id} userData={{ subsystem: id }}>
      <SubsystemScope id={id}>{children}</SubsystemScope>
    </group>
  );
}

function TurretYaw({ children }: { children: ReactNode }) {
  const ref = useRigRef<THREE.Group>("turretYaw");
  return (
    <group ref={ref} position={rmm(TURRET.axisXmm, 0, 0)}>
      {children}
    </group>
  );
}

function subsystemOf(obj: THREE.Object3D | null): SubsystemId | null {
  let o: THREE.Object3D | null = obj;
  while (o) {
    const s = o.userData?.subsystem as SubsystemId | undefined;
    if (s) return s;
    o = o.parent;
  }
  return null;
}

export type ApexRobotComponentProps = ApexRobotProps &
  Omit<ThreeElements["group"], "ref" | "children"> & { ref?: Ref<ApexRobotHandle> };

const ZERO4: [number, number, number, number] = [0, 0, 0, 0];

/**
 * The robot every scene renders. Uses the team's real CAD export when public/models/apex-r1.glb
 * exists (`modelSrc`, decided at build time — USER-REQUIREMENTS #1), else the procedural concept model.
 */
export function ApexRobot(props: ApexRobotComponentProps) {
  if (modelSrc)
    return (
      <Suspense fallback={null}>
        <GlbRobot src={modelSrc} {...props} />
      </Suspense>
    );
  return <ProceduralApexRobot {...props} />;
}
if (modelSrc) useGLTF.preload(modelSrc, DRACO_DECODER_PATH);

// ------------------------------------------------------------------------------------------------
// procedural robot
// ------------------------------------------------------------------------------------------------
const SCOPES: MaterialScope[] = [...SUBSYSTEMS, "harness"];
const CYCLE_MAX = 3;
const KIND_COLOR: Record<CycleBallKind, string> = {
  POLLEN: BALL_COLORS.ballPollen,
  NECTAR_RED: BALL_COLORS.ballNectarRed,
  NECTAR_BLUE: BALL_COLORS.ballNectarBlue,
};
const AXIS_X = TURRET.axisXmm;
const IDLE_SCAN = (12 * Math.PI) / 180;
const WHEEL_STEP = maxSpinStep(11);
const FLYWHEEL_STEP = maxSpinStep(6);
const POD_STEP = maxSpinStep(3);
const ROLLER_STEP = maxSpinStep(8);
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _rot = new THREE.Euler();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

/**
 * Dev check (R102): the assembled robot's extents in its own frame, in mm (x fwd, y left, z up).
 * Visible meshes only (hit proxies and hidden helpers are skipped); vertices are sampled.
 */
function measureRobotMm(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const m = new THREE.Matrix4();
  const mi = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const visit = (o: THREE.Object3D) => {
    if (!o.visible || o.userData?.hitProxy) return;
    const mesh = o as THREE.Mesh;
    const pos = mesh.isMesh ? (mesh.geometry?.getAttribute("position") as THREE.BufferAttribute | undefined) : undefined;
    if (pos) {
      const inst = o as THREE.InstancedMesh;
      const count = inst.isInstancedMesh ? inst.count : 1;
      const step = Math.max(1, Math.floor(pos.count / 3000));
      for (let k = 0; k < count; k++) {
        m.multiplyMatrices(inv, o.matrixWorld);
        if (inst.isInstancedMesh) {
          inst.getMatrixAt(k, mi);
          m.multiply(mi);
        }
        for (let i = 0; i < pos.count; i += step) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m);
          min.min(v);
          max.max(v);
        }
      }
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
  return { x: [min.z * 1000, max.z * 1000], y: [min.x * 1000, max.x * 1000], z: [min.y * 1000, max.y * 1000] };
}

function wantsDim(id: SubsystemId, h: HighlightTarget | undefined, ghost: Partial<Record<SubsystemId, number>> | undefined) {
  const g = ghost?.[id];
  if (g !== undefined) return clamp(g, 0, 1);
  if (!h) return 0;
  if (typeof h === "string") return h === id ? 0 : 1;
  return h.length === 0 || h.includes(id) ? 0 : 1;
}

/** Instanced balls for the scoring cycle (rendered in the robot root frame). */
function CycleBalls({ look, meshRef }: { look: ApexRobotProps["look"]; meshRef: { current: THREE.InstancedMesh | null } }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 28, 18), []);
  const material = useMemo(() => {
    if (look === "blueprint") return new THREE.MeshBasicMaterial({ color: "#ffffff" });
    if (look === "clay") return new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6 });
    return new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  }, [look]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < CYCLE_MAX; i++) {
      m.setMatrixAt(i, zero);
      m.setColorAt(i, _color.set(KIND_COLOR.POLLEN));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [meshRef, material]);
  return (
    <instancedMesh
      ref={(m) => void (meshRef.current = m)}
      args={[geometry, material, CYCLE_MAX]}
      frustumCulled={false}
      castShadow
      visible={false}
      raycast={() => null}
      name="cycleBalls"
    />
  );
}

interface FrameParams {
  turretYaw: number;
  flywheelRpm: number;
  wheelSpeeds: readonly number[];
  intakeOn: boolean;
  feederOn: boolean;
  explode: number;
  highlight: HighlightTarget | undefined;
  ghost: Partial<Record<SubsystemId, number>> | undefined;
  offset: RobotCommand["offset"];
  wheelOffset: number;
  cycle: number | null | undefined;
}

function ProceduralApexRobot({
  ref,
  command,
  turretYaw = 0,
  flywheelRpm = 0,
  wheelSpeeds = ZERO4,
  intakeOn = false,
  feederOn = false,
  explode = 0,
  highlight = null,
  ghost,
  look = "studio",
  tone = "dark",
  accent = DEFAULT_ACCENT,
  alliance = "blue",
  limelight = false,
  preload = 0,
  reducedMotion,
  explodeSmoothing = 0.35,
  cycle = null,
  cycleBalls = 1,
  autoCycle = false,
  cycleKind = "POLLEN",
  idle = false,
  ambientOcclusion = true,
  onLaunch,
  onReady,
  onSubsystemOver,
  onSubsystemClick,
  ...group
}: ApexRobotComponentProps) {
  const prefersReduced = usePrefersReducedMotion();
  const reduced = reducedMotion ?? prefersReduced;
  const registry = useMemo(() => new RigRegistry(), []);
  const root = useRef<THREE.Group>(null);
  const cycleMesh = useRef<THREE.InstancedMesh | null>(null);

  // small detail meshes live on DETAIL_LAYER (skipped by the contact-shadow camera): make sure the
  // camera that actually renders the scene, and the pointer raycaster, see that layer
  const camera = useThree((s) => s.camera);
  const raycaster = useThree((s) => s.raycaster);
  useEffect(() => {
    camera.layers.enable(DETAIL_LAYER);
    raycaster.layers.enable(DETAIL_LAYER);
  }, [camera, raycaster]);

  // one material library per subsystem (ghosting + per-look materials) and one for the harness
  const libraries = useMemo(() => {
    const out = {} as Record<MaterialScope, MaterialLibrary>;
    for (const id of SCOPES) out[id] = new MaterialLibrary(look, accent, alliance, tone);
    return out;
    // accent is applied in place below; only look/tone/alliance rebuild materials
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look, tone, alliance]);
  useEffect(() => () => Object.values(libraries).forEach((l) => l.dispose()), [libraries]);
  useEffect(() => {
    for (const id of SCOPES) libraries[id].setAccent(accent);
  }, [libraries, accent]);

  const ctx = useMemo(() => ({ look, libraries, registry }), [look, libraries, registry]);

  // latest props for the frame loop
  const latest = {
    turretYaw,
    flywheelRpm,
    wheelSpeeds,
    intakeOn,
    feederOn,
    explode,
    highlight,
    ghost,
    reduced,
    explodeSmoothing,
    cycle,
    cycleBalls,
    autoCycle,
    cycleKind,
    idle,
    look,
    ambientOcclusion,
    onLaunch,
    onReady,
  };
  const live = useRef(latest);
  useLayoutEffect(() => {
    live.current = latest;
  });

  /** The turret target actually used last frame (prop or command, before idle scan). */
  const lastTarget = useRef(turretYaw);
  // animation state
  const st = useRef({
    time: 0,
    frames: 0,
    yaw: { x: clampTurret(turretYaw), v: 0 },
    rpm: 0,
    wheelVel: [0, 0, 0, 0],
    intake: 0,
    feeder: 0,
    explode: { x: clamp(explode, 0, 1), v: 0 },
    kdPrev: 0,
    dim: Object.fromEntries(SUBSYSTEMS.map((s) => [s, 0])) as Record<SubsystemId, number>,
    cycleClock: 0,
    cycleShown: 0,
    cycleSig: NaN,
    cyclePrev: null as number | null,
    launched: -1,
    handedOff: new Set<number>(),
    settled: false,
    ready: false,
    checked: false,
    ao: 0,
    aoBaker: null as AoBaker | null,
    readyAt: 0,
    programs: [] as { isReady?: () => boolean }[],
    p: {} as FrameParams,
  });

  /** Compile every shader variant the robot can switch to (ghosted / faded), once, off the critical path. */
  function prewarm(state: RootState) {
    const s = st.current;
    const libs = Object.values(libraries);
    const saved = libs.map((l) => l.getDim());
    for (const l of libs) {
      l.setDim(1);
      l.setFade(0.5);
    }
    try {
      state.gl.compile(state.scene, state.camera);
      const props = (state.gl as unknown as { properties: { get(o: object): { currentProgram?: { isReady?: () => boolean } } } }).properties;
      s.programs = libs.flatMap((l) => l.materials()).map((m) => props.get(m).currentProgram ?? {});
    } catch {
      s.programs = [];
    }
    libs.forEach((l, i) => {
      l.setDim(saved[i]);
      l.setFade(1);
    });
    s.readyAt = s.time + 3;
  }

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const s = st.current;
    s.time += dt;
    s.frames += 1;
    const t = s.time;
    const L = live.current;
    const c = command?.current;
    const p = s.p;
    p.turretYaw = c?.turretYaw ?? L.turretYaw;
    p.flywheelRpm = c?.flywheelRpm ?? L.flywheelRpm;
    p.wheelSpeeds = c?.wheelSpeeds ?? L.wheelSpeeds;
    p.intakeOn = c?.intakeOn ?? L.intakeOn;
    p.feederOn = c?.feederOn ?? L.feederOn;
    p.explode = c?.explode ?? L.explode;
    p.highlight = c && c.highlight !== undefined ? c.highlight : L.highlight;
    p.ghost = c?.ghost ?? L.ghost;
    p.offset = c?.offset;
    p.wheelOffset = c?.wheelOffset ?? 0;
    p.cycle = c && c.cycle !== undefined ? c.cycle : L.cycle;
    lastTarget.current = p.turretYaw;
    const get = (n: string) => registry.get(n);
    const reducedNow = L.reduced;
    let moving = false;

    // ---- shader prewarm (third frame: the environment, fog and lights are in place by then)
    if (s.frames === 3) prewarm(state);
    if (!s.ready && s.frames > 3 && (s.time > s.readyAt || s.programs.every((pg) => !pg.isReady || pg.isReady()))) {
      s.ready = true;
      L.onReady?.();
    }

    // ---- scoring cycle: which balls are in flight, and what they are using
    const e0 = s.explode.x;
    const cycleOn = (L.autoCycle !== false && L.autoCycle !== 0) || (p.cycle !== null && p.cycle !== undefined);
    let useIntake = false;
    let useFeeder = false;
    let useSensor = false;
    let useFlywheel = false;
    const balls: { id: number; c: number }[] = [];
    if (cycleOn && e0 < 0.02) {
      if (p.cycle !== null && p.cycle !== undefined) {
        const n = Math.max(1, Math.min(CYCLE_MAX, Math.round(L.cycleBalls)));
        for (let j = 0; j < n; j++) balls.push({ id: j, c: p.cycle - j * CYCLE_SPACING });
        // launch events when scrubbing forward through the muzzle
        const prev = s.cyclePrev;
        if (prev !== null)
          for (let j = 0; j < n; j++) {
            const a = prev - j * CYCLE_SPACING;
            const b = p.cycle - j * CYCLE_SPACING;
            if (a < CYCLE_PHASES.exit[0] && b >= CYCLE_PHASES.exit[0]) fireLaunch(j);
            if (b < CYCLE_PHASES.exit[0]) s.handedOff.delete(j);
          }
        s.cyclePrev = p.cycle;
      } else {
        const rate = typeof L.autoCycle === "number" ? Math.max(0.05, L.autoCycle) : 0.4;
        if (!reducedNow) s.cycleClock += dt;
        const period = 1 / rate;
        const newest = Math.floor(s.cycleClock / period);
        for (let n = newest; n >= 0 && balls.length < CYCLE_MAX; n--) {
          const cc = (s.cycleClock - n * period) / CYCLE_SECONDS;
          if (cc > 1.0001) break;
          balls.push({ id: n, c: cc });
          if (cc >= CYCLE_PHASES.exit[0] && s.launched < n) {
            s.launched = n;
            fireLaunch(n);
          }
        }
        for (const id of s.handedOff) if (id < newest - 4) s.handedOff.delete(id);
        s.cyclePrev = null;
      }
      for (const b of balls) {
        if (b.c < 0 || b.c > 1) continue;
        const u = cycleUses(b.c);
        useIntake ||= u.intake;
        useFeeder ||= u.feeder;
        useSensor ||= u.sensor;
        useFlywheel ||= u.flywheel;
      }
      moving = true;
    } else {
      s.cyclePrev = null;
    }

    function fireLaunch(id: number) {
      const muzzle = registry.get("muzzle");
      if (!muzzle || !root.current) return;
      const world = muzzle.getWorldPosition(new THREE.Vector3());
      const direction = launchDirection(s.yaw.x, new THREE.Vector3()).applyQuaternion(root.current.getWorldQuaternion(_q)).normalize();
      const took = L.onLaunch?.({ world, direction, yaw: s.yaw.x, rpm: s.rpm, kind: L.cycleKind });
      if (took) s.handedOff.add(id);
    }

    // ---- turret: critically damped toward the clamped target, limited to the real slew rate
    const scan = L.idle && !reducedNow ? IDLE_SCAN * Math.sin(Math.PI * 2 * 0.15 * t) : 0;
    const yawTarget = clampTurret(p.turretYaw + scan);
    smoothDamp(s.yaw, yawTarget, 0.12, dt, TURRET_MAX_SLEW);
    if (Math.abs(s.yaw.x - yawTarget) < 1e-5 && Math.abs(s.yaw.v) < 1e-4) {
      s.yaw.x = yawTarget;
      s.yaw.v = 0;
    } else moving = true;
    const yawObj = get("turretYaw");
    if (yawObj) yawObj.rotation.y = s.yaw.x;
    const pinion = get("pinion");
    if (pinion) pinion.rotation.y = -s.yaw.x * TURRET.gearRatio;
    const loop = get("serviceLoop");
    if (loop?.userData.setYaw) (loop.userData.setYaw as (y: number) => void)(s.yaw.x);

    // ---- flywheel: ramp like the robot (RPM_RAMP_PER_SEC = 4000); visual step capped, blur at speed
    // the cycle spins the flywheel up only if the page isn't commanding a speed itself
    const target = clamp(Math.max(p.flywheelRpm, L.idle ? 600 : 0, useFlywheel && p.flywheelRpm <= 0 ? 3200 : 0), 0, 6000);
    const maxStep = 4000 * dt;
    s.rpm += clamp(target - s.rpm, -maxStep * 1.5, maxStep);
    if (Math.abs(s.rpm - target) > 0.5 || s.rpm > 0.5) moving = true;
    const spin = reducedNow ? 0 : Math.min(FLYWHEEL_STEP, ((s.rpm * Math.PI * 2) / 60) * FLYWHEEL_VISUAL_SCALE * dt);
    const fw = get("flywheel");
    if (fw) fw.rotation.x += spin;
    const mp = get("motorPulley");
    if (mp) mp.rotation.x += spin;
    const blur = get("flywheelBlur") as THREE.Mesh | undefined;
    if (blur) {
      const k = 0.92 * smoothstep(clamp((s.rpm - 900) / 2400, 0, 1));
      const m = blur.userData.material as THREE.Material | undefined;
      if (m) m.opacity = k;
      blur.visible = k > 0.01;
    }

    // ---- wheels (rad/s, + rolls forward), capped so the 11 rollers never strobe
    const kd = explodeProgress(s.explode.x, "drivetrain");
    const spinOff = reducedNow ? 0 : (kd - s.kdPrev) * Math.PI;
    s.kdPrev = kd;
    WHEELS.forEach((w, i) => {
      const goal = p.wheelSpeeds[i] ?? 0;
      s.wheelVel[i] = approach(s.wheelVel[i], goal, 8, dt);
      if (Math.abs(s.wheelVel[i] - goal) < 1e-3) s.wheelVel[i] = goal;
      if (s.wheelVel[i] !== 0) moving = true;
      const o = get(`wheel.${w.id}`);
      if (!o) return;
      const step = reducedNow ? 0 : clamp(s.wheelVel[i] * WHEEL_VISUAL_SCALE * dt, -WHEEL_STEP, WHEEL_STEP);
      o.rotation.x += step + spinOff * w.sx;
    });

    // ---- odometry pods roll with the chassis (forward kinematics of the wheel speeds)
    if (!reducedNow) {
      const tw = mecanumTwist(s.wheelVel);
      const vxPod = tw.vx - tw.omega * (X_POD[1] / 1000);
      const vyPod = tw.vy + tw.omega * (Y_POD[0] / 1000);
      const r = POD_WHEEL_R / 1000;
      const px = get("odoWheel.x");
      if (px) px.rotation.z += clamp((vxPod / r) * WHEEL_VISUAL_SCALE * dt, -POD_STEP, POD_STEP);
      const py = get("odoWheel.y");
      if (py) py.rotation.z += clamp((vyPod / r) * WHEEL_VISUAL_SCALE * dt, -POD_STEP, POD_STEP);
    }

    // ---- intake + feeder (the cycle runs them as its balls pass)
    s.intake = approach(s.intake, p.intakeOn || useIntake ? 1 : 0, 5, dt);
    s.feeder = approach(s.feeder, p.feederOn || useFeeder ? 1 : 0, 9, dt);
    if (s.intake < 1e-3) s.intake = 0;
    if (s.feeder < 1e-3) s.feeder = 0;
    if (s.intake > 0 || s.feeder > 0) moving = true;
    if (!reducedNow) {
      // +x about robot +y: the bottom of the roller moves backward (pulls balls in under it)
      const step = Math.min(ROLLER_STEP, s.intake * 14 * dt);
      const ir = get("intakeRoller");
      if (ir) ir.rotation.x += step;
      // the belt pulleys are flipped (hubs outward), so their local +x is world −x
      const ip = get("intakePulley");
      if (ip) ip.rotation.x -= step;
      const imp = get("intakeMotorPulley");
      if (imp) imp.rotation.x -= step;
      // the feeder only runs to fire (TeleOpMain: feeder power 0 while intaking)
      const fd = get("feeder");
      if (fd) fd.rotation.x -= s.feeder * 12 * dt;
    }

    // ---- explode (smoothed), staggered and choreographed per subsystem
    const eTarget = clamp(p.explode, 0, 1);
    if (reducedNow || L.explodeSmoothing <= 0) {
      s.explode.x = eTarget;
      s.explode.v = 0;
    } else {
      smoothDamp(s.explode, eTarget, L.explodeSmoothing, dt);
      if (Math.abs(s.explode.x - eTarget) < 1e-4 && Math.abs(s.explode.v) < 1e-3) {
        s.explode.x = eTarget;
        s.explode.v = 0;
      } else moving = true;
    }
    const e = s.explode.x;
    for (const id of SUBSYSTEMS) {
      const g = get(`explode.${id}`);
      if (!g) continue;
      explodePose(id, explodeProgress(e, id), _pos, _rot);
      const o = p.offset?.[id];
      if (o) _pos.set(_pos.x + o[0], _pos.y + o[1], _pos.z + o[2]);
      g.position.copy(_pos);
      g.rotation.copy(_rot);
    }
    WHEELS.forEach((w) => {
      const g = get(`wheelExplode.${w.id}`);
      if (g) g.position.x = w.sx * (WHEEL_EXPLODE * kd + p.wheelOffset);
    });
    if (root.current) root.current.position.y = EXPLODE_LIFT * smoothstep(clamp(e * 1.6, 0, 1));
    // the wiring fades out over the first 10 % of the explode instead of popping
    const fade = 1 - smoothstep(clamp(e / 0.1, 0, 1));
    libraries.harness.setFade(fade);
    const harness = get("harness");
    if (harness) harness.visible = fade > 0.002;

    // ---- baked ambient occlusion: bake once (time-sliced) when first assembled, then fade it in;
    //      fade out while exploding (the bake is of the assembled robot)
    if (L.look !== "blueprint" && L.ambientOcclusion && root.current) {
      const done = cachedAo();
      if (!done && !s.aoBaker && s.ready && e === 0) {
        const yawGroup = registry.get("turretYaw");
        s.aoBaker = new AoBaker(root.current, (o) => o === yawGroup || o.name === "cycleBalls");
      }
      if (s.aoBaker) {
        const baker = s.aoBaker;
        if (baker.step(4)) {
          s.aoBaker = null;
          if (process.env.NODE_ENV !== "production") {
            const st = baker.stats;
            console.info(`[robot] ambient occlusion baked: ${st.cells} cells, ${st.busyMs.toFixed(0)} ms over ${st.frames} frames (longest slice ${st.longestMs.toFixed(1)} ms)`);
          }
        }
        moving = true;
      }
      if (done && AO_UNIFORMS.uApexAoTex.value !== done) AO_UNIFORMS.uApexAoTex.value = done;
      root.current.updateWorldMatrix(true, false);
      AO_UNIFORMS.uApexAoInv.value.copy(root.current.matrixWorld).invert();
    }
    const aoTarget = L.look !== "blueprint" && L.ambientOcclusion && cachedAo() ? 1 - smoothstep(clamp(e / 0.08, 0, 1)) : 0;
    s.ao = reducedNow ? aoTarget : approach(s.ao, aoTarget, 4, dt);
    if (Math.abs(s.ao - aoTarget) < 0.002) s.ao = aoTarget;
    else moving = true;
    AO_UNIFORMS.uApexAoStrength.value = s.ao;

    // ---- highlight / ghosting
    for (const id of SUBSYSTEMS) {
      const want = wantsDim(id, p.highlight, p.ghost);
      s.dim[id] = reducedNow ? want : approach(s.dim[id], want, 7, dt);
      if (Math.abs(s.dim[id] - want) < 0.002) s.dim[id] = want;
      else moving = true;
      libraries[id].setDim(s.dim[id]);
    }
    libraries.harness.setDim(s.dim.electronics);

    // ---- LEDs: idle breathing / blinking, colour-sensor flash when a ball is staged
    if (L.idle && !reducedNow) {
      libraries.electronics.setEmissiveScale("led", 0.55 + 0.45 * Math.sin(t * Math.PI * 2 * 0.45));
      libraries.vision.setEmissiveScale("led", (t % 1.4) < 0.12 ? 1.6 : 0.15);
      libraries.odometry.setEmissiveScale("led", 0.7 + 0.3 * Math.sin(t * Math.PI * 2 * 0.8));
      moving = true;
    } else {
      libraries.electronics.setEmissiveScale("led", 1);
      libraries.vision.setEmissiveScale("led", 1);
      libraries.odometry.setEmissiveScale("led", 1);
    }
    libraries.shooter.setEmissiveScale("led", useSensor ? 2.2 + 0.8 * Math.sin(t * 40) : 1);

    // ---- cycle balls
    const mesh = cycleMesh.current;
    // signature of what the balls look like this frame: skip the upload when nothing moved
    let ballSig = balls.length * 7.77 + s.yaw.x * 3.1;
    for (const b of balls) ballSig += b.c * (b.id + 1.3) * 11.3 + (s.handedOff.has(b.id) ? 5 : 0);
    const ballsChanged = ballSig !== s.cycleSig;
    s.cycleSig = ballSig;
    if (mesh && (ballsChanged || s.cycleShown > 0 !== balls.length > 0)) {
      let shown = 0;
      if (balls.length) {
        const kind = L.cycleKind;
        const R = ballRadiusMm(kind) / 1000;
        const cos = Math.cos(s.yaw.x);
        const sin = Math.sin(s.yaw.x);
        for (const b of balls) {
          if (b.c < 0 || b.c > 1 || shown >= CYCLE_MAX) continue;
          if (b.c >= CYCLE_PHASES.exit[0] && s.handedOff.has(b.id)) continue;
          const pt = cyclePoint(b.c, kind);
          let x = pt.x;
          let y = pt.y;
          if (pt.frame === "turret") {
            x = AXIS_X + pt.x * cos - pt.y * sin;
            y = pt.x * sin + pt.y * cos;
          }
          const fadeOut = b.c > CYCLE_PHASES.exit[0] ? 1 - (b.c - CYCLE_PHASES.exit[0]) / (1 - CYCLE_PHASES.exit[0]) : 1;
          const fadeIn = clamp(b.c / 0.03, 0, 1);
          const k = R * Math.min(fadeIn, fadeOut);
          const tp = rmm(x, y, pt.z);
          _m.compose(_v.set(tp[0], tp[1], tp[2]), _q.identity(), _scale.set(k, k, k));
          mesh.setMatrixAt(shown, _m);
          mesh.setColorAt(shown, _color.set(KIND_COLOR[kind]));
          shown++;
        }
      }
      // write (and bump the shadow signature) only while balls are shown or just disappeared
      if (shown > 0 || s.cycleShown > 0) {
        for (let i = shown; i < CYCLE_MAX; i++) mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
        mesh.visible = shown > 0;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
      s.cycleShown = shown;
    }

    // ---- dev: R102 sizing-cube check once the robot first sits assembled with the turret centred
    if (process.env.NODE_ENV !== "production" && !s.checked && s.ready && s.explode.x === 0 && Math.abs(s.yaw.x) < 1e-3 && root.current) {
      s.checked = true;
      const b = measureRobotMm(root.current);
      const half = 228.6;
      const ok = b.x[0] >= -half && b.x[1] <= half && b.y[0] >= -half && b.y[1] <= half && b.z[0] >= -0.5 && b.z[1] <= 457.2;
      const fmt = (a: number[]) => `${a[0].toFixed(1)} … ${a[1].toFixed(1)}`;
      const msg = `[robot check] R102 18 in cube: x ${fmt(b.x)} · y ${fmt(b.y)} · z ${fmt(b.z)} mm`;
      if (ok) console.info(msg + " — fits");
      else console.error(msg + " — OUTSIDE the sizing cube (±228.6 mm, 0–457.2 mm)");
    }

    // ---- demand-mode friendliness: keep frames coming until everything has settled
    s.settled = !moving && s.ready;
    if (moving || !s.ready) state.invalidate();
  });

  useImperativeHandle(
    ref,
    (): ApexRobotHandle => ({
      get root() {
        return root.current;
      },
      getMuzzleWorld(out = new THREE.Vector3()) {
        const m = registry.get("muzzle");
        return m ? m.getWorldPosition(out) : out.set(0, DERIVED.muzzleZmm / 1000, TURRET.axisXmm / 1000);
      },
      getLaunchDirectionWorld(out = new THREE.Vector3()) {
        launchDirection(st.current.yaw.x, out);
        if (root.current) {
          const q = root.current.getWorldQuaternion(new THREE.Quaternion());
          out.applyQuaternion(q);
        }
        return out.normalize();
      },
      getTurretPivotWorld(out = new THREE.Vector3()) {
        const m = registry.get("turretPivot");
        return m ? m.getWorldPosition(out) : out.set(0, 0, 0);
      },
      getCameraMountWorld(out = new THREE.Vector3()) {
        const m = registry.get("cameraMount");
        return m ? m.getWorldPosition(out) : out.set(0, 0, 0);
      },
      getAnchorWorld(id, out = new THREE.Vector3()) {
        const m = registry.get(`anchor.${id}`);
        return m ? m.getWorldPosition(out) : out.set(0, 0, 0);
      },
      getTurretYaw: () => st.current.yaw.x,
      getFlywheelRpm: () => st.current.rpm,
      isTurretSettled(tol = (1.5 * Math.PI) / 180) {
        const s = st.current;
        return Math.abs(s.yaw.x - clampTurret(lastTarget.current)) < tol && Math.abs(s.yaw.v) < 0.35;
      },
      isTurretAtLimit() {
        const t = lastTarget.current;
        return Math.abs(clampTurret(t) - t) > 1e-6;
      },
      getObject: (name) => registry.get(name),
      isSettled: () => st.current.settled,
      isReady: () => st.current.ready,
    }),
    [registry],
  );

  const handlers =
    onSubsystemOver || onSubsystemClick
      ? {
          onPointerOver: (ev: ThreeEvent<PointerEvent>) => {
            ev.stopPropagation();
            onSubsystemOver?.(subsystemOf(ev.object));
          },
          onPointerOut: () => onSubsystemOver?.(null),
          onClick: (ev: ThreeEvent<MouseEvent>) => {
            ev.stopPropagation();
            const id = subsystemOf(ev.object);
            if (id) onSubsystemClick?.(id);
          },
        }
      : {};

  return (
    <group {...group}>
      <group ref={root} name="APEX-R1" {...handlers}>
        <RobotProvider value={ctx}>
          <Sub id="drivetrain">
            <DrivetrainM />
          </Sub>
          <Sub id="odometry">
            <OdometryM />
          </Sub>
          <Sub id="electronics">
            <ElectronicsM />
          </Sub>
          <Sub id="intake">
            <IntakeM />
          </Sub>
          <Sub id="hopper">
            <HopperM preload={Math.min(2, preload)} />
          </Sub>
          <Sub id="vision">
            <VisionM />
          </Sub>
          <Sub id="turret">
            <TurretFixedM />
            <TurretYaw>
              <TurretRotatingM />
              <Sub id="shooter">
                <ShooterM limelight={limelight} staged={preload >= 3} />
              </Sub>
            </TurretYaw>
          </Sub>
          <SubsystemScope id="harness">
            <HarnessM />
          </SubsystemScope>
          <CycleBalls look={look} meshRef={cycleMesh} />
        </RobotProvider>
      </group>
    </group>
  );
}
