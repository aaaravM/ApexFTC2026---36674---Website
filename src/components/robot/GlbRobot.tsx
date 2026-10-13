"use client";

/**
 * The team's REAL CAD export (public/models/apex-r1.glb), driven like the procedural model.
 * USER-REQUIREMENTS #1: when the file exists, `modelSrc` (src/content/robot.ts, set by next.config.ts at
 * build time) is non-null and <ApexRobot> renders this instead — home, Meet the Robot and CAD, no code
 * changes. Same props and imperative handle as the procedural model.
 *
 * Groups are found by name (docs/ROBOT-MODEL.md, `npm run model:check`): drivetrain, odometry, intake,
 * hopper, turret, shooter, vision, electronics (+ optional flywheel, wheel_fl/fr/bl/br). Matching is
 * case-insensitive and accepts suffixes (`turret_ring`, `turret.001` → three sanitises it to `turret001`).
 * Missing names degrade gracefully: that part simply doesn't aim / spin / explode / highlight, and the
 * whole model still renders and spins with the scroll.
 *
 * The model keeps its own materials (look / tone / accent props don't restyle a CAD export). Decoders
 * are self-hosted (DESIGN_SPEC §10 ERRATA #9): Draco from /draco/gltf/, Meshopt bundled by three.
 */
import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ApexRobotComponentProps } from "./ApexRobot";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { DERIVED, TURRET } from "./dimensions";
import {
  approach,
  clamp,
  clampTurret,
  EXPLODE_LIFT,
  explodeProgress,
  FLYWHEEL_VISUAL_SCALE,
  launchDirection,
  smoothDamp,
  smoothstep,
  SUBSYSTEM_INFO,
  SUBSYSTEMS,
  TURRET_MAX_SLEW,
  WHEEL_VISUAL_SCALE,
  type ApexRobotHandle,
  type SubsystemId,
} from "./rig";

export const DRACO_DECODER_PATH = "/draco/gltf/";
const WHEEL_IDS = ["wheel_fl", "wheel_fr", "wheel_bl", "wheel_br"] as const;
const GHOST_OPACITY = 0.16;

/** Same rule as scripts/model-check.mjs, plus three's name sanitising (dots are stripped). */
function matches(name: string, id: string) {
  const n = name.toLowerCase();
  return n === id || n.startsWith(`${id}_`) || n.startsWith(`${id}.`) || n.startsWith(`${id}-`) || new RegExp(`^${id}\\d+$`).test(n);
}

interface Rigged {
  scene: THREE.Group;
  groups: Partial<Record<SubsystemId, THREE.Object3D>>;
  flywheel?: THREE.Object3D;
  wheels: (THREE.Object3D | undefined)[];
  /** Rest transforms, so explode / aim are applied on top of the exported pose. */
  rest: Map<THREE.Object3D, { p: THREE.Vector3; q: THREE.Quaternion }>;
  /** Local-space centre of each subsystem (annotation anchors). */
  centres: Partial<Record<SubsystemId, THREE.Vector3>>;
  /** Per-mesh cloned materials + the subsystem that owns the mesh (highlight ghosting). */
  meshes: { owner: SubsystemId | null; mats: THREE.Material[]; base: { opacity: number; transparent: boolean; depthWrite: boolean }[] }[];
}

function rig(source: THREE.Group): Rigged {
  const scene = source.clone(true);
  const find = (id: string) => {
    let hit: THREE.Object3D | undefined;
    scene.traverse((o) => {
      if (!hit && o !== scene && matches(o.name, id)) hit = o;
    });
    return hit;
  };
  const groups: Rigged["groups"] = {};
  for (const id of SUBSYSTEMS) {
    const g = find(id);
    if (g) {
      groups[id] = g;
      g.userData.subsystem = id;
    }
  }
  const flywheel = find("flywheel");
  const wheels = WHEEL_IDS.map((w) => find(w));
  const rest: Rigged["rest"] = new Map();
  for (const o of [...Object.values(groups), flywheel, ...wheels]) if (o) rest.set(o, { p: o.position.clone(), q: o.quaternion.clone() });

  scene.updateMatrixWorld(true);
  const centres: Rigged["centres"] = {};
  for (const id of SUBSYSTEMS) {
    const g = groups[id];
    if (!g) continue;
    const box = new THREE.Box3().setFromObject(g);
    if (!box.isEmpty()) centres[id] = g.worldToLocal(box.getCenter(new THREE.Vector3()));
  }

  const meshes: Rigged["meshes"] = [];
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const list = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => m.clone());
    mesh.material = Array.isArray(mesh.material) ? list : list[0];
    // innermost named subsystem wins (shooter inside turret → shooter)
    let owner: SubsystemId | null = null;
    for (let p: THREE.Object3D | null = mesh; p && !owner; p = p.parent) owner = (p.userData.subsystem as SubsystemId | undefined) ?? null;
    meshes.push({ owner, mats: list, base: list.map((m) => ({ opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite })) });
  });
  return { scene, groups, flywheel, wheels, rest, centres, meshes };
}

const ZERO4: [number, number, number, number] = [0, 0, 0, 0];
const PROCEDURAL_ONLY = ["intakeOn", "feederOn", "look", "tone", "accent", "alliance", "limelight", "preload"] as const;
function omitProcedural<T extends object>(props: T) {
  const out = { ...props } as Record<string, unknown>;
  for (const k of PROCEDURAL_ONLY) delete out[k];
  return out as Omit<T, (typeof PROCEDURAL_ONLY)[number]>;
}
const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

export function GlbRobot({
  src,
  ref,
  command,
  turretYaw = 0,
  flywheelRpm = 0,
  wheelSpeeds = ZERO4,
  explode = 0,
  highlight = null,
  reducedMotion,
  explodeSmoothing = 0.35,
  onSubsystemOver,
  onSubsystemClick,
  ...rest
}: ApexRobotComponentProps & { src: string }) {
  // procedural-only props (a CAD export keeps its own materials and parts) are not passed to <group>
  const group = omitProcedural(rest);
  const gltf = useGLTF(src, DRACO_DECODER_PATH);
  const r = useMemo(() => rig(gltf.scene), [gltf.scene]);
  useLayoutEffect(() => () => r.meshes.forEach((m) => m.mats.forEach((mat) => mat.dispose())), [r]);

  const prefersReduced = usePrefersReducedMotion();
  const reduced = reducedMotion ?? prefersReduced;
  const root = useRef<THREE.Group>(null);
  const live = useRef({ turretYaw, flywheelRpm, wheelSpeeds, explode, highlight, reduced, explodeSmoothing });
  useLayoutEffect(() => {
    live.current = { turretYaw, flywheelRpm, wheelSpeeds, explode, highlight, reduced, explodeSmoothing };
  });
  const lastTarget = useRef(turretYaw);
  const st = useRef({
    yaw: { x: clampTurret(turretYaw), v: 0 },
    rpm: 0,
    spin: 0,
    wheelVel: [0, 0, 0, 0],
    wheelRot: [0, 0, 0, 0],
    explode: { x: clamp(explode, 0, 1), v: 0 },
    dim: Object.fromEntries(SUBSYSTEMS.map((s) => [s, 0])) as Record<SubsystemId, number>,
  });
  const q = useMemo(() => new THREE.Quaternion(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const c = command?.current;
    const p = c
      ? {
          ...live.current,
          turretYaw: c.turretYaw ?? live.current.turretYaw,
          flywheelRpm: c.flywheelRpm ?? live.current.flywheelRpm,
          wheelSpeeds: c.wheelSpeeds ?? live.current.wheelSpeeds,
          explode: c.explode ?? live.current.explode,
          highlight: c.highlight !== undefined ? c.highlight : live.current.highlight,
        }
      : live.current;
    lastTarget.current = p.turretYaw;
    const s = st.current;

    // turret: same damping + slew limit as the procedural model
    smoothDamp(s.yaw, clampTurret(p.turretYaw), 0.12, dt, TURRET_MAX_SLEW);
    const turret = r.groups.turret;
    if (turret) {
      const rest = r.rest.get(turret)!;
      turret.quaternion.copy(rest.q).multiply(q.setFromAxisAngle(Y, s.yaw.x));
    }

    // flywheel ramp (RPM_RAMP_PER_SEC = 4000) and spin
    const target = clamp(p.flywheelRpm, 0, 6000);
    const maxStep = 4000 * dt;
    s.rpm += clamp(target - s.rpm, -maxStep * 1.5, maxStep);
    if (r.flywheel && !p.reduced) {
      s.spin += ((s.rpm * Math.PI * 2) / 60) * FLYWHEEL_VISUAL_SCALE * dt;
      r.flywheel.quaternion.copy(r.rest.get(r.flywheel)!.q).multiply(q.setFromAxisAngle(X, s.spin));
    }

    // wheels
    r.wheels.forEach((w, i) => {
      s.wheelVel[i] = approach(s.wheelVel[i], p.wheelSpeeds[i] ?? 0, 8, dt);
      if (!w || p.reduced) return;
      s.wheelRot[i] += s.wheelVel[i] * WHEEL_VISUAL_SCALE * dt;
      w.quaternion.copy(r.rest.get(w)!.q).multiply(q.setFromAxisAngle(X, s.wheelRot[i]));
    });

    // explode, staggered per subsystem, on top of the exported positions
    const eTarget = clamp(p.explode, 0, 1);
    if (p.reduced || p.explodeSmoothing <= 0) {
      s.explode.x = eTarget;
      s.explode.v = 0;
    } else smoothDamp(s.explode, eTarget, p.explodeSmoothing, dt);
    for (const id of SUBSYSTEMS) {
      const g = r.groups[id];
      if (!g) continue;
      const k = explodeProgress(s.explode.x, id);
      const off = SUBSYSTEM_INFO[id].explode;
      const rest = r.rest.get(g)!;
      g.position.set(rest.p.x + off[0] * k, rest.p.y + off[1] * k, rest.p.z + off[2] * k);
    }
    if (root.current) root.current.position.y = EXPLODE_LIFT * smoothstep(clamp(s.explode.x * 1.6, 0, 1));

    // highlight: everything outside the highlighted subsystem ghosts
    for (const id of SUBSYSTEMS) {
      const want = p.highlight && p.highlight !== id ? 1 : 0;
      s.dim[id] = p.reduced ? want : approach(s.dim[id], want, 7, dt);
    }
    // parts outside every named group ghost with the rest when something is highlighted
    let other = 0;
    for (const id of SUBSYSTEMS) if (id !== p.highlight) other = Math.max(other, s.dim[id]);
    for (const m of r.meshes) {
      const d = m.owner ? s.dim[m.owner] : other;
      m.mats.forEach((mat, i) => {
        const b = m.base[i];
        const opacity = b.opacity * (1 - d * (1 - GHOST_OPACITY));
        if (mat.opacity === opacity) return;
        mat.opacity = opacity;
        const ghost = d > 1e-3;
        const transparent = ghost || b.transparent;
        if (mat.transparent !== transparent) {
          mat.transparent = transparent;
          mat.depthWrite = ghost ? false : b.depthWrite;
          mat.needsUpdate = true;
        }
      });
    }
  });

  useImperativeHandle(
    ref,
    (): ApexRobotHandle => {
      const worldOf = (o: THREE.Object3D | undefined, local: THREE.Vector3 | undefined, out: THREE.Vector3, fallback: () => THREE.Vector3) =>
        o ? o.localToWorld(out.copy(local ?? new THREE.Vector3())) : fallback();
      const rootWorld = (out: THREE.Vector3, x: number, y: number, z: number) =>
        root.current ? root.current.localToWorld(out.set(x, y, z)) : out.set(x, y, z);
      return {
        get root() {
          return root.current;
        },
        getMuzzleWorld(out = new THREE.Vector3()) {
          return worldOf(r.groups.shooter, r.centres.shooter, out, () => rootWorld(out, 0, DERIVED.muzzleZmm / 1000, TURRET.axisXmm / 1000));
        },
        getLaunchDirectionWorld(out = new THREE.Vector3()) {
          launchDirection(st.current.yaw.x, out);
          if (root.current) out.applyQuaternion(root.current.getWorldQuaternion(new THREE.Quaternion()));
          return out.normalize();
        },
        getTurretPivotWorld(out = new THREE.Vector3()) {
          return worldOf(r.groups.turret, undefined, out, () => rootWorld(out, 0, 0, TURRET.axisXmm / 1000));
        },
        getCameraMountWorld(out = new THREE.Vector3()) {
          return worldOf(r.groups.vision, r.centres.vision, out, () => rootWorld(out, 0, 0, 0));
        },
        getAnchorWorld(id, out = new THREE.Vector3()) {
          return worldOf(r.groups[id], r.centres[id], out, () => rootWorld(out, 0, 0, 0));
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
        getObject: (name) => r.scene.getObjectByName(name),
      };
    },
    [r],
  );

  const subsystemOf = (obj: THREE.Object3D | null) => {
    for (let o = obj; o; o = o.parent) if (o.userData?.subsystem) return o.userData.subsystem as SubsystemId;
    return null;
  };
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
        <primitive object={r.scene} />
      </group>
    </group>
  );
}
