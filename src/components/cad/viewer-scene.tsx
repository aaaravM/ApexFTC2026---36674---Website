"use client";

// VIEW 1 — the R3F side of the CAD viewer. Rendered inside <SceneShell> (frameloop "demand": a frame
// is drawn only while something moves — orbit damping, a camera move, explode, a ghost fade).
//
//   orthographic camera (a drawing view) + OrbitControls, standard views ISO / FRONT / RIGHT / TOP
//   APEX-R1 in the engine's "blueprint" look on drafting paper (tone "light")
//   explode (smoothed here, fed to the robot through its `command` ref)
//   assembly focus via Ghoster (several subsystems at once — the engine's `highlight` takes one)
//   SECTION A–A via SectionRig (clipping plane + stencil-capped hatched cut faces)
//   drafting annotations via AnnotationLayer (screen-space SVG, re-projected per frame)
//
// The robot itself is the engine's <ApexRobot>; this file never edits it, it only reads its handle
// and adds helper children / per-material state at runtime.

import { Grid, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useImperativeHandle, useMemo, useRef, type Ref, type RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  ApexRobot,
  ENVELOPE,
  IN,
  METRES,
  Stage,
  SUBSYSTEMS,
  smoothDamp,
  type ApexRobotHandle,
  type RobotCommand,
  type SubsystemId,
} from "@/components/robot";
import type { AssemblyId } from "./content";
import type { AnnGroup, AnnSpec, AnnotationLayer, Pt } from "./three/annotations";
import { Ghoster } from "./three/ghost";
import { SectionRig } from "./three/section";

export type ViewName = "iso" | "front" | "right" | "top";

export interface SceneInputs {
  assembly: AssemblyId;
  /** Subsystems shown at full strength (empty = all). */
  focus: SubsystemId[];
  /** Temporary emphasis from the parts list (overrides focus while set). */
  hover: SubsystemId | null;
  explode: number;
  /** World X (m) of the SECTION A–A plane, or null when the section is off. */
  sectionX: number | null;
  dims: boolean;
  reduced: boolean;
}

export interface ViewerApi {
  setView(v: ViewName): void;
  fit(): void;
  zoomBy(factor: number): void;
  orbitBy(dAzimuth: number, dPolar: number): void;
}

/** Item numbers for the exploded-view balloons = the Robot page's subsystem index. */
export const BALLOON_NUMBER: Record<SubsystemId, string> = {
  drivetrain: "1",
  odometry: "2",
  intake: "3",
  hopper: "4",
  turret: "5",
  shooter: "6",
  vision: "7",
  electronics: "8",
};

const E = ENVELOPE;
const CAM_DISTANCE = 3;
const UP = new THREE.Vector3(0, 1, 0);
const VIEW_DIRS: Record<ViewName, THREE.Vector3> = {
  iso: new THREE.Vector3(1, 1, 1).normalize(),
  front: new THREE.Vector3(0, 0, 1),
  right: new THREE.Vector3(-1, 0, 0),
  top: new THREE.Vector3(0, 1, 0.0006).normalize(),
};
/** Pixels kept clear of the HUD around the viewport edges when fitting. */
const PAD = { x: 28, top: 64, bottom: 64 };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth01 = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const approach = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

interface Tween {
  t: number;
  dur: number;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  fromSph: THREE.Spherical;
  toSph: THREE.Spherical;
  fromZoom: number;
  toZoom: number;
}

function fitFor(dir: THREE.Vector3, box: THREE.Box3, width: number, height: number) {
  const right = new THREE.Vector3().crossVectors(UP, dir).normalize();
  const up = new THREE.Vector3().crossVectors(dir, right).normalize();
  const c = box.getCenter(new THREE.Vector3());
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const p = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    p.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(c);
    const x = p.dot(right);
    const y = p.dot(up);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  // narrow views: keep room for the dimension text that hangs outside the model
  const padX = width < 560 ? 40 : PAD.x;
  const availW = Math.max(80, width - padX * 2);
  const availH = Math.max(80, height - PAD.top - PAD.bottom);
  const zoom = Math.min(availW / Math.max(1e-3, maxX - minX), availH / Math.max(1e-3, maxY - minY));
  const target = c
    .clone()
    .addScaledVector(right, (minX + maxX) / 2)
    .addScaledVector(up, (minY + maxY) / 2)
    // the HUD is taller at the bottom than the top on small screens — keep the model optically centred
    .addScaledVector(up, (PAD.bottom - PAD.top) / 2 / zoom);
  return { target, zoom };
}

/** Bounding box of the subsystems in focus (or the whole envelope plus room for the dimensions). */
function boxFor(focus: SubsystemId[], root: THREE.Object3D | null) {
  if (!root || focus.length === 0) {
    return new THREE.Box3(new THREE.Vector3(-E / 2 - 0.06, 0, -E / 2 - 0.05), new THREE.Vector3(E / 2 + 0.08, E + 0.06, E / 2 + 0.16));
  }
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  for (const id of focus) {
    const g = root.getObjectByName(id);
    if (g) box.union(new THREE.Box3().setFromObject(g));
  }
  if (box.isEmpty()) return boxFor([], null);
  return box.expandByScalar(0.035);
}

export function ViewerScene({
  inputs,
  apiRef,
  layerRef,
  onViewChange,
}: {
  inputs: SceneInputs;
  apiRef: Ref<ViewerApi>;
  layerRef: RefObject<AnnotationLayer | null>;
  /** Called with null when the user orbits away from a standard view. */
  onViewChange: (v: ViewName | null) => void;
}) {
  const robot = useRef<ApexRobotHandle>(null);
  const command = useRef<RobotCommand>({ explode: 0 });
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const scene = useThree((s) => s.scene);

  const live = useRef(inputs);
  useEffect(() => {
    live.current = inputs;
    invalidate();
  });

  // ---- runtime helpers (created once, disposed on unmount)
  const ghoster = useMemo(() => new Ghoster(), []);
  const section = useMemo(() => new SectionRig(1), []);
  const state = useRef({
    explode: { x: 0, v: 0 },
    ghost: Object.fromEntries(SUBSYSTEMS.map((s) => [s, 0])) as Record<SubsystemId, number>,
    fade: { dims: 0, balloons: 0, section: 0 } as Record<AnnGroup, number>,
    view: "iso" as ViewName | null,
    tween: null as Tween | null,
    fitted: false,
    lastMin: 0,
    suppressChange: 0,
    indexed: false,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- three.js renderer flag
    gl.localClippingEnabled = true;
    section.setPixelRatio(gl.getPixelRatio());
    scene.add(section.cap);
    return () => {
      scene.remove(section.cap);
      section.dispose();
      ghoster.restoreAll();
    };
  }, [gl, scene, section, ghoster]);

  // ---- camera moves --------------------------------------------------------------------------
  const startTween = (dir: THREE.Vector3, focus: SubsystemId[], immediate: boolean) => {
    const ctl = controls.current;
    const root = robot.current?.root ?? null;
    const fit = fitFor(dir, boxFor(focus, root), size.width, size.height);
    const s = state.current;
    const fromTarget = ctl ? ctl.target.clone() : new THREE.Vector3(0, 0.2, 0);
    const fromSph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(fromTarget));
    const toSph = new THREE.Spherical().setFromVector3(dir.clone().multiplyScalar(CAM_DISTANCE));
    // shortest way round
    let dTheta = toSph.theta - fromSph.theta;
    dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
    toSph.theta = fromSph.theta + dTheta;
    s.tween = {
      t: 0,
      dur: immediate ? 0 : 0.75,
      fromTarget,
      toTarget: fit.target,
      fromSph,
      toSph,
      fromZoom: camera.zoom,
      toZoom: fit.zoom,
    };
    if (ctl) ctl.enabled = false;
    invalidate();
  };

  const currentDir = () => {
    const ctl = controls.current;
    const t = ctl ? ctl.target : new THREE.Vector3(0, 0.2, 0);
    return camera.position.clone().sub(t).normalize();
  };

  useImperativeHandle(
    apiRef,
    () => ({
      setView(v) {
        state.current.view = v;
        startTween(VIEW_DIRS[v], live.current.focus, live.current.reduced);
      },
      fit() {
        const s = state.current;
        startTween(s.view ? VIEW_DIRS[s.view] : currentDir(), live.current.focus, live.current.reduced);
      },
      zoomBy(f) {
        const ctl = controls.current;
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * f, ctl?.minZoom ?? 50, ctl?.maxZoom ?? 20000);
        camera.updateProjectionMatrix();
        invalidate();
      },
      orbitBy(dAz, dPolar) {
        const ctl = controls.current;
        const t = ctl ? ctl.target : new THREE.Vector3(0, 0.2, 0);
        const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(t));
        sph.theta += dAz;
        sph.phi = THREE.MathUtils.clamp(sph.phi + dPolar, 0.001, Math.PI / 2);
        const dir = new THREE.Vector3().setFromSpherical(sph).normalize();
        state.current.view = null;
        onViewChange(null);
        // keep target + zoom, just turn
        const s = state.current;
        s.tween = {
          t: 0,
          dur: live.current.reduced ? 0 : 0.35,
          fromTarget: t.clone(),
          toTarget: t.clone(),
          fromSph: new THREE.Spherical().setFromVector3(camera.position.clone().sub(t)),
          toSph: new THREE.Spherical().setFromVector3(dir.multiplyScalar(CAM_DISTANCE)),
          fromZoom: camera.zoom,
          toZoom: camera.zoom,
        };
        s.tween.toSph.theta = s.tween.fromSph.theta + dAz;
        if (ctl) ctl.enabled = false;
        invalidate();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [camera, size.width, size.height],
  );

  // assembly change → re-frame (keep the direction)
  const lastAssembly = useRef(inputs.assembly);
  useEffect(() => {
    if (lastAssembly.current === inputs.assembly) return;
    lastAssembly.current = inputs.assembly;
    const s = state.current;
    startTween(s.view ? VIEW_DIRS[s.view] : currentDir(), inputs.focus, inputs.reduced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.assembly]);

  // controls: mark the view as custom when the user orbits
  useEffect(() => {
    const ctl = controls.current;
    if (!ctl) return;
    ctl.target.set(0, 0.2, 0);
    const onChange = () => {
      const s = state.current;
      if (s.suppressChange > 0 || s.tween) return;
      if (s.view !== null) {
        s.view = null;
        onViewChange(null);
      }
    };
    const onStart = () => {
      // the user grabbed the view mid-move: stop the tween where it is
      const s = state.current;
      if (s.tween) {
        s.tween = null;
        ctl.enabled = true;
      }
    };
    ctl.addEventListener("change", onChange);
    ctl.addEventListener("start", onStart);
    return () => {
      ctl.removeEventListener("change", onChange);
      ctl.removeEventListener("start", onStart);
    };
  }, [onViewChange]);

  // OrbitControls sets touch-action:none on its element, which would trap page scrolling on
  // phones. pan-y keeps vertical swipes for the page and gives horizontal swipes to the orbit.
  useEffect(() => {
    const el = controls.current?.domElement as HTMLElement | undefined;
    if (!el) return;
    const prev = el.style.touchAction;
    const id = requestAnimationFrame(() => (el.style.touchAction = "pan-y"));
    return () => {
      cancelAnimationFrame(id);
      el.style.touchAction = prev;
    };
  });

  // ---- annotation specs ----------------------------------------------------------------------
  const specs = useMemo<AnnSpec[]>(() => {
    const r = robot;
    const muzzle: Pt = (o) => (r.current ? r.current.getMuzzleWorld(o) : null);
    const floorUnderMuzzle: Pt = (o) => (r.current ? r.current.getMuzzleWorld(o).setY(0) : null);
    const forward: Pt = (o) => {
      if (!r.current) return null;
      const d = r.current.getLaunchDirectionWorld(o);
      return d.setY(0).normalize();
    };
    const launch: Pt = (o) => (r.current ? r.current.getLaunchDirectionWorld(o) : null);
    const flywheelRim: Pt = (o) => {
      const fw = r.current?.getObject("flywheel");
      if (!fw) return null;
      return fw.getWorldPosition(o).add(new THREE.Vector3(0, (2 * IN) * 0.98, 0));
    };
    const wheelRim: Pt = (o) => {
      const w = r.current?.getObject("wheel.fl");
      if (!w) return null;
      return w.getWorldPosition(o).add(new THREE.Vector3(0, METRES.wheelRadius, 0));
    };
    const inGroup =
      (id: SubsystemId, x: number, y: number, z: number): Pt =>
      (o) => {
        // eslint-disable-next-line react-hooks/refs -- read when the overlay projects a frame, never during render
        const g = r.current?.root?.getObjectByName(id);
        return g ? g.localToWorld(o.set(x, y, z)) : null;
      };
    const pivot: Pt = (o) => (r.current ? r.current.getTurretPivotWorld(o) : null);
    const fixed =
      (x: number, y: number, z: number): Pt =>
      (o) =>
        o.set(x, y, z);

    const envelope: AnnSpec = {
      kind: "box",
      id: "env",
      group: "dims",
      min: new THREE.Vector3(-E / 2, 0, -E / 2),
      max: new THREE.Vector3(E / 2, E, E / 2),
      text: "R102 · START CUBE 18 × 18 × 18 in",
    };
    const envWidth: AnnSpec = {
      kind: "linear",
      id: "env-w",
      group: "dims",
      a: fixed(E / 2, E, E / 2),
      b: fixed(-E / 2, E, E / 2),
      off: new THREE.Vector3(0, 0.05, 0.0),
      text: "18.00",
      sub: "[457.2]",
    };
    const envHeight: AnnSpec = {
      kind: "linear",
      id: "env-h",
      group: "dims",
      a: fixed(E / 2, 0, -E / 2),
      b: fixed(E / 2, E, -E / 2),
      off: new THREE.Vector3(0.055, 0, 0),
      text: "18.00",
      sub: "[457.2]",
    };
    const muzzleHeight: AnnSpec = {
      kind: "linear",
      id: "muzzle-h",
      group: "dims",
      a: floorUnderMuzzle,
      b: muzzle,
      off: new THREE.Vector3(0, 0, E / 2 + 0.12 - METRES.muzzle.z),
      text: "14.00",
      sub: "[355.6] MUZZLE",
    };
    const hood: AnnSpec = { kind: "angle", id: "hood", group: "dims", c: muzzle, u: forward, v: launch, r: 0.085, text: "40°", sub: "HOOD" };
    const flywheel: AnnSpec = { kind: "leader", id: "flywheel", group: "dims", at: flywheelRim, dx: 54, dy: -46, text: "⌀4.00", sub: "[101.6] FLYWHEEL" };
    const wheel: AnnSpec = { kind: "leader", id: "wheel", group: "dims", at: wheelRim, dx: 46, dy: -40, text: "⌀104 mm", sub: "[4.09] MECANUM ×4" };
    const podX: AnnSpec = {
      kind: "linear",
      id: "pod-x",
      group: "dims",
      a: fixed(0, 0.001, 0),
      b: fixed(-0.084, 0.001, 0),
      off: new THREE.Vector3(0, 0, E / 2 + 0.07),
      text: "84 mm",
      sub: "X POD",
    };
    const podY: AnnSpec = {
      kind: "linear",
      id: "pod-y",
      group: "dims",
      a: fixed(0, 0.001, 0),
      b: fixed(0, 0.001, -0.168),
      off: new THREE.Vector3(-(E / 2 + 0.08), 0, 0),
      text: "168 mm",
      sub: "Y POD",
    };
    const tracking: AnnSpec = { kind: "leader", id: "tracking", group: "dims", at: fixed(0, 0.001, 0), dx: 70, dy: 44, text: "TRACKING POINT", sub: "+X FWD · +Y LEFT" };
    const sensor: AnnSpec = {
      kind: "leader",
      id: "sensor",
      group: "dims",
      at: inGroup("hopper", -0.05, 0.122, 0.098),
      dx: -70,
      dy: -58,
      text: "REV COLOR SENSOR V3",
      sub: "BALL < 25 mm",
    };
    const roller: AnnSpec = {
      kind: "leader",
      id: "roller",
      group: "dims",
      at: inGroup("intake", 0, 0.148, 0.186),
      dx: -64,
      dy: -40,
      text: "INTAKE ROLLER",
      sub: "“intakemain”",
    };
    const travel: AnnSpec = {
      kind: "travel",
      id: "travel",
      group: "dims",
      c: pivot,
      r: 0.125,
      from: (-170 * Math.PI) / 180,
      to: (170 * Math.PI) / 180,
      text: "±170° · 5 : 1",
      deadText: "20° DEAD ZONE",
    };
    const cut: AnnSpec = {
      kind: "cut",
      id: "cut",
      group: "section",
      x: () => (live.current.sectionX ?? 10),
      z0: -E / 2,
      z1: E / 2,
      height: E,
      letter: "A",
    };

    const byAssembly: Record<AssemblyId, AnnSpec[]> = {
      full: [envelope, envWidth, envHeight, muzzleHeight, hood, flywheel],
      drive: [envelope, wheel, podX, podY, tracking],
      intake: [envelope, roller, sensor],
      turret: [travel, muzzleHeight, hood, flywheel],
    };
    const focus = inputs.focus.length ? inputs.focus : (SUBSYSTEMS as readonly SubsystemId[]);
    const balloons: AnnSpec[] = focus.map((id) => ({
      kind: "balloon" as const,
      id: `balloon-${id}`,
      group: "balloons" as const,
      at: (o: THREE.Vector3) => (r.current ? r.current.getAnchorWorld(id, o) : null),
      text: BALLOON_NUMBER[id],
      active: inputs.hover === id,
    }));
    return [...byAssembly[inputs.assembly], ...balloons, cut];
  }, [inputs.assembly, inputs.focus, inputs.hover]);

  useEffect(() => {
    layerRef.current?.set(specs);
    invalidate();
  }, [specs, layerRef, invalidate]);

  // ---- the per-frame rig (runs before OrbitControls.update at -1 and the robot at 0) ---------
  const centre = useMemo(() => new THREE.Vector3(), []);
  // eslint-disable-next-line react-hooks/immutability -- R3F frame loop mutates three.js objects by design
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const s = state.current;
    const inp = live.current;
    const root = robot.current?.root;
    let moving = false;

    // index the robot once its meshes exist
    if (root && !s.indexed) {
      ghoster.index(root);
      section.attach(root);
      s.indexed = true;
    }

    // first frame with a size: frame the robot without animating
    if (!s.fitted && size.width > 0) {
      s.fitted = true;
      const fit = fitFor(VIEW_DIRS.iso, boxFor([], null), size.width, size.height);
      camera.position.copy(fit.target).addScaledVector(VIEW_DIRS.iso, CAM_DISTANCE);
      // eslint-disable-next-line react-hooks/immutability -- R3F: the camera is three.js state, mutated per frame by design
      camera.zoom = fit.zoom;
      camera.updateProjectionMatrix();
      camera.lookAt(fit.target);
      if (controls.current) {
        controls.current.target.copy(fit.target);
        controls.current.minZoom = fit.zoom * 0.35;
        controls.current.maxZoom = fit.zoom * 7;
        s.suppressChange++;
        controls.current.update();
        s.suppressChange--;
      }
      s.lastMin = Math.min(size.width, size.height);
    }

    // keep the framing when the viewport resizes
    const m = Math.min(size.width, size.height);
    if (s.lastMin > 0 && Math.abs(m - s.lastMin) > 0.5) {
      const k = m / s.lastMin;
      camera.zoom *= k;
      camera.updateProjectionMatrix();
      if (controls.current) {
        controls.current.minZoom *= k;
        controls.current.maxZoom *= k;
      }
      s.lastMin = m;
    }

    // camera tween
    const tw = s.tween;
    if (tw) {
      tw.t = tw.dur > 0 ? Math.min(1, tw.t + dt / tw.dur) : 1;
      const k = ease(tw.t);
      const target = new THREE.Vector3().lerpVectors(tw.fromTarget, tw.toTarget, k);
      const sph = new THREE.Spherical(
        CAM_DISTANCE,
        THREE.MathUtils.lerp(tw.fromSph.phi, tw.toSph.phi, k),
        THREE.MathUtils.lerp(tw.fromSph.theta, tw.toSph.theta, k),
      );
      camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(sph));
      camera.zoom = Math.exp(THREE.MathUtils.lerp(Math.log(tw.fromZoom), Math.log(tw.toZoom), k));
      camera.updateProjectionMatrix();
      camera.lookAt(target);
      const ctl = controls.current;
      if (ctl) ctl.target.copy(target);
      if (tw.t >= 1) {
        s.tween = null;
        if (ctl) {
          ctl.enabled = true;
          s.suppressChange++;
          ctl.update();
          s.suppressChange--;
        }
      } else moving = true;
    }

    // explode (critically damped; reduced motion jumps)
    const e = s.explode;
    if (inp.reduced) {
      e.x = inp.explode;
      e.v = 0;
    } else {
      smoothDamp(e, inp.explode, 0.22, dt);
      if (Math.abs(e.x - inp.explode) < 1e-4 && Math.abs(e.v) < 1e-3) {
        e.x = inp.explode;
        e.v = 0;
      } else moving = true;
    }
    command.current.explode = e.x;

    // assembly focus / parts-list hover → ghost levels
    for (const id of SUBSYSTEMS) {
      const want = inp.hover ? (inp.hover === id ? 0 : 1) : inp.focus.length && !inp.focus.includes(id) ? 1 : 0;
      let g = s.ghost[id];
      g = inp.reduced ? want : approach(g, want, 9, dt);
      if (Math.abs(g - want) < 0.003) g = want;
      else moving = true;
      s.ghost[id] = g;
      ghoster.set(id, g);
    }

    // section plane
    if (inp.sectionX === null) section.setEnabled(false);
    else {
      section.setEnabled(true);
      section.setX(inp.sectionX);
    }

    // annotation fades
    const wantDims = inp.dims ? 1 - smooth01(0.015, 0.09, e.x) : 0;
    const wantBalloons = smooth01(0.12, 0.42, e.x);
    const wantSection = inp.sectionX === null ? 0 : 1;
    for (const [k, want] of [
      ["dims", wantDims],
      ["balloons", wantBalloons],
      ["section", wantSection],
    ] as [AnnGroup, number][]) {
      let f = s.fade[k];
      f = inp.reduced ? want : approach(f, want, 14, dt);
      if (Math.abs(f - want) < 0.004) f = want;
      else moving = true;
      s.fade[k] = f;
    }

    if (moving) invalidate();
  }, -2);

  // annotations, after the robot has applied this frame's explode / turret (priority 0, later sibling)
  return (
    <>
      <OrthographicCamera makeDefault position={[1.73, 1.93, 1.73]} zoom={900} near={0.01} far={40} />
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        enableZoom={false}
        screenSpacePanning
        rotateSpeed={0.75}
        maxPolarAngle={Math.PI / 2}
      />
      <Stage look="blueprint" tone="light" background={null} shadows={false} floor={false} grid={false} fog={null} stats={false}>
        <Grid
          position={[0, 0, 0]}
          args={[2.4, 2.4]}
          cellSize={0.024}
          cellThickness={0.6}
          cellColor="#d3d0c6"
          sectionSize={0.12}
          sectionThickness={0.9}
          sectionColor="#bcb8ab"
          fadeDistance={0.95}
          fadeStrength={1.4}
          fadeFrom={0}
        />
        <ApexRobot ref={robot} look="blueprint" tone="light" command={command} explodeSmoothing={0} preload={2} reducedMotion={inputs.reduced} />
      </Stage>
      <AnnotationDriver layerRef={layerRef} fade={state} centre={centre} robot={robot} />
    </>
  );
}

function AnnotationDriver({
  layerRef,
  fade,
  centre,
  robot,
}: {
  layerRef: RefObject<AnnotationLayer | null>;
  fade: RefObject<{ fade: Record<AnnGroup, number> }>;
  centre: THREE.Vector3;
  robot: RefObject<ApexRobotHandle | null>;
}) {
  useFrame(({ camera, size }) => {
    const layer = layerRef.current;
    if (!layer || !fade.current) return;
    camera.updateMatrixWorld();
    const root = robot.current?.root;
    centre.set(0, 0.2 + (root ? root.position.y : 0), 0).project(camera);
    layer.update({
      camera,
      width: size.width,
      height: size.height,
      fade: fade.current.fade,
      centre: { x: (centre.x * 0.5 + 0.5) * size.width, y: (-centre.y * 0.5 + 0.5) * size.height },
    });
  });
  return null;
}
