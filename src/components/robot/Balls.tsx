"use client";

/**
 * Pooled, instanced BIOBUZZ balls flying along the team's solved arc.
 * Positions come from `ballPosition()` in src/lib/ballistics.ts (the TypeScript port of the robot's
 * Ballistics.java), so the website's shot is the robot's shot.
 *
 * On arrival a ball is "captured": it drops into the CELL and shrinks away instead of falling on
 * through the HIVE (opt out per shot with `capture: false`). An optional short trail (`trail`)
 * draws a few fading copies along the arc behind each ball.
 */
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type Ref } from "react";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { ballPosition, BALLS, type BallKind, type Solution, type SolveInput } from "@/lib/ballistics";
import { IN } from "./dimensions";
import { BALL_COLORS } from "./materials";
import { DETAIL_LAYER, type RobotLook } from "./rig";

export interface FireOptions {
  kind?: BallKind;
  /** Exactly what you passed to solve() — field frame, inches. */
  input: SolveInput;
  solution: Solution;
  /**
   * World-space launch point (e.g. robot.getMuzzleWorld()). When given, the arc is translated so
   * it starts here; otherwise field coordinates map straight to world (three axes, metres).
   */
  from?: THREE.Vector3;
  /** Optional field→world transform (applied before `from`), for a robot placed on a field. */
  fieldToWorld?: THREE.Matrix4;
  /** Start part-way through the flight (seconds) — handy for deterministic screenshots. */
  startAt?: number;
  /**
   * What happens at the target: true (default) = drop into the CELL (≈ 0.25 s) and vanish;
   * false = keep flying until the floor (the old behaviour); or tune the drop.
   */
  capture?: boolean | { depthM?: number; seconds?: number };
  /** Called once when the ball reaches the solved flight time (the target). */
  onArrive?: (world: THREE.Vector3) => void;
  /** Called when the ball reaches the floor (only without capture). */
  onLand?: (world: THREE.Vector3) => void;
}

export interface BallsHandle {
  /** Launch a ball; returns its slot or −1 when the pool is full. */
  fire(o: FireOptions): number;
  clear(): void;
  activeCount(): number;
}

interface Slot {
  active: boolean;
  kind: BallKind;
  input: SolveInput;
  sol: Solution;
  t: number;
  offset: THREE.Vector3;
  fieldToWorld?: THREE.Matrix4;
  arrived: boolean;
  landed: boolean;
  fade: number;
  capture: { depth: number; seconds: number } | null;
  /** 0 → 1 drop inside the CELL after arrival. */
  drop: number;
  arrivePos: THREE.Vector3;
  onArrive?: (p: THREE.Vector3) => void;
  onLand?: (p: THREE.Vector3) => void;
}

const KIND_COLOR: Record<BallKind, string> = {
  POLLEN: BALL_COLORS.ballPollen,
  NECTAR_RED: BALL_COLORS.ballNectarRed,
  NECTAR_BLUE: BALL_COLORS.ballNectarBlue,
};

/** Field-frame inches → three.js metres (x fwd → Z, y left → X, z up → Y). */
export function fieldToThree(p: { x: number; y: number; z: number }, out = new THREE.Vector3()) {
  return out.set(p.y * IN, p.z * IN, p.x * IN);
}

const TRAIL = 6;
const TRAIL_DT = 0.018;

export type BallsProps = Omit<ThreeElements["group"], "ref" | "children"> & {
  ref?: Ref<BallsHandle>;
  /** Pool size (default 12). */
  max?: number;
  look?: RobotLook;
  /** 1 = real time, 0 = frozen. */
  timeScale?: number;
  /** Draw a short fading trail behind each ball (default false). */
  trail?: boolean;
};

export function Balls({ ref, max = 12, look = "studio", timeScale = 1, trail = false, ...group }: BallsProps) {
  // flying balls render on DETAIL_LAYER: out of the contact-shadow pass (they are far above it),
  // so a shot in flight never forces the shadows to re-render
  const camera = useThree((s) => s.camera);
  useEffect(() => camera.layers.enable(DETAIL_LAYER), [camera]);
  const onLayer = useCallback((m: THREE.InstancedMesh | null) => {
    if (m) m.layers.set(DETAIL_LAYER);
  }, []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const trailMesh = useRef<THREE.InstancedMesh>(null);
  const slots = useRef<Slot[]>([]);
  const ts = useRef(timeScale);
  useLayoutEffect(() => {
    ts.current = timeScale;
  });

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 20), []);
  const trailGeometry = useMemo(() => new THREE.SphereGeometry(1, 12, 8), []);
  const material = useMemo(() => {
    if (look === "blueprint") return new THREE.MeshBasicMaterial({ color: "#ffffff" });
    if (look === "clay") return new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6 });
    return new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  }, [look]);
  const trailMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false }), []);
  useLayoutEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => () => trailMaterial.dispose(), [trailMaterial]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => () => trailGeometry.dispose(), [trailGeometry]);

  // hide every instance initially
  useLayoutEffect(() => {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const c = new THREE.Color("#ffffff");
    for (const [m, n] of [
      [mesh.current, max],
      [trailMesh.current, max * TRAIL],
    ] as [THREE.InstancedMesh | null, number][]) {
      if (!m) continue;
      for (let i = 0; i < n; i++) {
        m.setMatrixAt(i, zero);
        m.setColorAt(i, c);
      }
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    slots.current = Array.from({ length: max }, () => ({
      active: false,
      kind: "POLLEN" as BallKind,
      input: { muzzle: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
      sol: {} as Solution,
      t: 0,
      offset: new THREE.Vector3(),
      arrived: false,
      landed: false,
      fade: 1,
      capture: null,
      drop: 0,
      arrivePos: new THREE.Vector3(),
    }));
  }, [max, trail]);

  const tmp = useMemo(
    () => ({ p: new THREE.Vector3(), q: new THREE.Vector3(), m: new THREE.Matrix4(), quat: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color() }),
    [],
  );

  const worldAt = (slot: Slot, t: number, out: THREE.Vector3) => {
    fieldToThree(ballPosition(slot.input, slot.sol, t), out);
    if (slot.fieldToWorld) out.applyMatrix4(slot.fieldToWorld);
    return out.add(slot.offset);
  };

  useImperativeHandle(
    ref,
    () => ({
      fire(o) {
        const m = mesh.current;
        const free = slots.current.findIndex((s) => !s.active);
        if (!m || free < 0 || !o.solution || !(o.solution.muzzleSpeedIn > 0)) return -1;
        const s = slots.current[free];
        s.active = true;
        s.kind = o.kind ?? "POLLEN";
        s.input = { ...o.input, ball: o.input.ball ?? s.kind };
        s.sol = o.solution;
        s.t = Math.max(0, o.startAt ?? 0);
        s.fieldToWorld = o.fieldToWorld;
        s.arrived = false;
        s.landed = false;
        s.fade = 1;
        s.drop = 0;
        const cap = o.capture ?? true;
        s.capture = cap === false ? null : { depth: (cap === true ? undefined : cap.depthM) ?? 0.13, seconds: (cap === true ? undefined : cap.seconds) ?? 0.24 };
        s.onArrive = o.onArrive;
        s.onLand = o.onLand;
        s.offset.set(0, 0, 0);
        if (o.from) {
          const p0 = worldAt(s, 0, new THREE.Vector3());
          s.offset.copy(o.from).sub(p0);
        }
        m.setColorAt(free, tmp.c.set(KIND_COLOR[s.kind]));
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        const tm = trailMesh.current;
        if (tm) {
          for (let k = 0; k < TRAIL; k++) tm.setColorAt(free * TRAIL + k, tmp.c.set(KIND_COLOR[s.kind]));
          if (tm.instanceColor) tm.instanceColor.needsUpdate = true;
        }
        return free;
      },
      clear() {
        for (const s of slots.current) s.active = false;
      },
      activeCount: () => slots.current.filter((s) => s.active).length,
    }),
    // worldAt/tmp are stable for the component's life
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state, rawDt) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(rawDt, 1 / 20) * ts.current;
    const tm = trailMesh.current;
    let changed = false;
    let anyActive = false;
    const zero = tmp.m.makeScale(0, 0, 0).clone();
    slots.current.forEach((s, i) => {
      if (!s.active) return;
      changed = true;
      const hide = () => {
        m.setMatrixAt(i, zero);
        if (tm) for (let k = 0; k < TRAIL; k++) tm.setMatrixAt(i * TRAIL + k, zero);
      };
      const r = (BALLS[s.kind].diameterIn / 2) * IN;
      let scale = r;
      if (!s.arrived || !s.capture) {
        if (!s.landed) {
          s.t += dt;
          worldAt(s, s.t, tmp.p);
          if (!s.arrived && s.t >= s.sol.flightTimeSec) {
            s.arrived = true;
            worldAt(s, s.sol.flightTimeSec, s.arrivePos);
            s.onArrive?.(s.arrivePos.clone());
            if (s.capture) tmp.p.copy(s.arrivePos);
          }
          if (!s.capture && tmp.p.y <= r && s.t > 0.05) {
            tmp.p.y = r;
            s.landed = true;
            s.onLand?.(tmp.p.clone());
          }
        } else {
          worldAt(s, s.t, tmp.p);
          tmp.p.y = r;
          s.fade -= dt / 0.35;
          scale = r * Math.max(0, s.fade);
        }
      } else {
        // captured: ease down into the CELL and shrink away
        s.drop = Math.min(1, s.drop + dt / s.capture.seconds);
        const k = s.drop * s.drop * (3 - 2 * s.drop);
        tmp.p.copy(s.arrivePos);
        tmp.p.y -= s.capture.depth * k;
        scale = r * (1 - Math.max(0, (s.drop - 0.45) / 0.55));
        if (s.drop >= 1) s.fade = 0;
      }
      if (!s.active || s.fade <= 0 || scale <= 0) {
        s.active = false;
        hide();
        return;
      }
      anyActive = true;
      m.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.quat.identity(), tmp.s.set(scale, scale, scale)));
      if (tm) {
        if (trail && !s.arrived && !s.landed) {
          for (let k = 0; k < TRAIL; k++) {
            const tk = s.t - (k + 1) * TRAIL_DT;
            if (tk <= 0) {
              tm.setMatrixAt(i * TRAIL + k, zero);
              continue;
            }
            worldAt(s, tk, tmp.q);
            const sk = r * (0.82 - k * 0.11);
            tm.setMatrixAt(i * TRAIL + k, tmp.m.compose(tmp.q, tmp.quat.identity(), tmp.s.set(sk, sk, sk)));
          }
        } else for (let k = 0; k < TRAIL; k++) tm.setMatrixAt(i * TRAIL + k, zero);
      }
    });
    // upload (and bump the shadow signature) only when something actually moved
    if (changed) {
      m.instanceMatrix.needsUpdate = true;
      if (tm) tm.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
    if (anyActive) state.invalidate();
  });

  return (
    <group {...group}>
      <instancedMesh
        ref={(m) => {
          mesh.current = m;
          onLayer(m);
        }}
        args={[geometry, undefined, max]}
        material={material}
        castShadow
        frustumCulled={false}
        raycast={() => null}
      />
      <instancedMesh
        ref={(m) => {
          trailMesh.current = m;
          onLayer(m);
        }}
        args={[trailGeometry, undefined, max * TRAIL]}
        material={trailMaterial}
        frustumCulled={false}
        visible={trail}
        raycast={() => null}
      />
    </group>
  );
}

export interface ArcSource {
  input: SolveInput;
  solution: Solution | null;
  from?: THREE.Vector3;
}

const ARC_POINTS = 96;

/**
 * Fill a LineSegments buffer (pairs p0-p1, p1-p2, …) with the solved arc. Returns false when there
 * is no solution. Optionally writes the APEX (highest point) to `apexOut`.
 */
function writeArc(line: THREE.LineSegments, { input, solution, from }: ArcSource, extendToFloor: boolean, apexOut?: THREE.Vector3) {
  const pos = line.geometry.getAttribute("position") as THREE.BufferAttribute;
  if (!solution || !(solution.muzzleSpeedIn > 0)) return false;
  const p0 = fieldToThree(ballPosition(input, solution, 0));
  const off = from ? from.clone().sub(p0) : new THREE.Vector3();
  const theta = ((input.launchPitchDeg ?? 40) * Math.PI) / 180;
  const vz = solution.muzzleSpeedIn * Math.sin(theta);
  const g = 386.0886;
  const tFloor = (vz + Math.sqrt(vz * vz + 2 * g * Math.max(0, input.muzzle.z))) / g;
  const tEnd = extendToFloor ? tFloor : solution.flightTimeSec;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  fieldToThree(ballPosition(input, solution, 0), a).add(off);
  for (let i = 1; i < ARC_POINTS; i++) {
    fieldToThree(ballPosition(input, solution, (i / (ARC_POINTS - 1)) * tEnd), b).add(off);
    pos.setXYZ((i - 1) * 2, a.x, a.y, a.z);
    pos.setXYZ((i - 1) * 2 + 1, b.x, b.y, b.z);
    a.copy(b);
  }
  pos.needsUpdate = true;
  line.geometry.computeBoundingSphere();
  line.computeLineDistances();
  if (apexOut) {
    // the APEX: highest point of the arc (vz = 0); clamp to the drawn part of the flight
    const tApex = Math.min(Math.max(0, vz / g), tEnd);
    fieldToThree(ballPosition(input, solution, tApex), apexOut).add(off);
  }
  return true;
}

/**
 * Dashed preview of the solved arc, from the muzzle to the target (or on to the floor with
 * `extendToFloor`). Pass `input` + `solution` as props, or a `source` ref re-read every frame.
 */
export function Trajectory({
  input,
  solution,
  from,
  source,
  color = "#ffffff",
  opacity = 0.7,
  extendToFloor = false,
  apex = false,
}: {
  input?: SolveInput;
  solution?: Solution | null;
  from?: THREE.Vector3;
  source?: { current: ArcSource | null };
  color?: string;
  opacity?: number;
  /** Continue the dashes past the target down to the floor (default false: it reads as a miss). */
  extendToFloor?: boolean;
  /** Mark the apex (highest point) of the arc with a small dot. */
  apex?: boolean;
}) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const apexRef = useRef<THREE.Mesh>(null);
  const positions = useMemo(() => new Float32Array((ARC_POINTS - 1) * 2 * 3), []);

  const update = (s: ArcSource | null) => {
    const line = lineRef.current;
    if (!line) return;
    const apexPos = new THREE.Vector3();
    line.visible = s ? writeArc(line, s, extendToFloor, apexPos) : false;
    const dot = apexRef.current;
    if (dot) {
      dot.visible = line.visible;
      dot.position.copy(apexPos);
    }
  };

  useLayoutEffect(() => {
    if (source || !input) return;
    update({ input, solution: solution ?? null, from });
  });

  useFrame(() => {
    if (source) update(source.current);
  });

  return (
    <>
      <lineSegments ref={lineRef} frustumCulled={false} visible={false} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineDashedMaterial color={color} dashSize={0.035} gapSize={0.022} transparent opacity={opacity} depthWrite={false} />
      </lineSegments>
      {apex ? (
        <mesh ref={apexRef} visible={false} raycast={() => null}>
          <sphereGeometry args={[0.009, 16, 12]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ) : null}
    </>
  );
}
