"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useRobotLineMaterial, useRobotLook, useRobotMaterial, useRigRef } from "../context";
import { DRIVE } from "../dimensions";
import { AXIS_X, cachedGeo, chamferCyl, extrude, GeoBuilder, lathe, M, merge, ring, transformed } from "../geometry";
import { noRaycast, RoleMeshes } from "./PartMesh";

/**
 * goBILDA GripForce 104 mm mecanum wheel (3625-0202-0104): 11 barrel rollers at 45° (instanced)
 * held between two stamped steel side plates, a plastic centre drum with the Ø14 bore and the
 * 32 mm pattern, 38 mm wide overall. A slim goBILDA hub sits on the INNER (motor) side only, so
 * nothing sticks out past the tyre and the robot stays inside the 18 in cube.
 *
 * Local frame: axle along X, centred. `handedness` +1 / −1 picks the roller helix. For the standard
 * "X when viewed from above" layout, use handedness = sx · sz where sx = +1 on the robot's left
 * (+X) and sz = +1 at the front (+Z): FL +1, FR −1, BL −1, BR +1.
 * `hubSide` is the local X direction (+1 / −1) that faces the robot (where the hub goes).
 */

const R = DRIVE.wheelDiameterMm / 2; // 52
const N = DRIVE.rollerCount; // 11
const HALF_W = DRIVE.wheelWidthMm / 2; // 19
const ROLLER_MAX_R = 10.5;
const RC = R - ROLLER_MAX_R; // roller-axis radius
const ROLLER_L = 40; // along its own axis → ≈ 32 mm across the wheel at 45°
const TILT = Math.PI / 4;
const PLATE_T = 1.6; // stamped steel
const PLATE_IN = HALF_W - 2.4 - PLATE_T; // inner face of each side plate (≈ 15)

/** Barrel profile so the roller envelope is the 104 mm cylinder, with dimpled tread bands. */
function rollerGeometry() {
  return cachedGeo("mecanum-roller-gf", () => {
    const half = ROLLER_L / 2;
    const pts: [number, number][] = [[2.4, -half - 1.0]];
    const steps = 13;
    for (let i = 0; i <= steps; i++) {
      const s = -half + (i / steps) * ROLLER_L;
      let r = R - Math.sqrt(RC * RC + Math.pow(s * Math.sin(TILT), 2));
      // shallow circumferential tread grooves
      const groove = Math.abs(Math.sin((s / ROLLER_L) * Math.PI * 6));
      r -= groove < 0.2 ? 0.45 : 0;
      // round the ends
      const endT = 1 - Math.min(1, (half - Math.abs(s)) / 2.4);
      r -= endT * endT * 2.4;
      pts.push([r, s]);
    }
    pts.push([2.4, half + 1.0]);
    const g = lathe(pts, 10);
    g.computeVertexNormals();
    g.scale(0.001, 0.001, 0.001);
    return g;
  });
}

/** Roller transforms (metres) for one handedness. */
function rollerMatrices(handedness: number) {
  return cachedGeo(`mecanum-roller-mats-gf-${handedness}`, () => {
    const out: THREE.Matrix4[] = [];
    const X = new THREE.Vector3(1, 0, 0);
    for (let k = 0; k < N; k++) {
      const phi = (k / N) * Math.PI * 2;
      const c = new THREE.Vector3(0, RC * Math.cos(phi), RC * Math.sin(phi)).multiplyScalar(0.001);
      const t = new THREE.Vector3(0, -Math.sin(phi), Math.cos(phi));
      const axis = X.clone().multiplyScalar(Math.cos(TILT)).addScaledVector(t, handedness * Math.sin(TILT)).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
      out.push(new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 1)));
    }
    return out;
  });
}

/** Angle (around the axle) of a roller's end on one side of the wheel. */
const endShift = (handedness: number, side: number) => Math.atan(((ROLLER_L / 2) * Math.sin(TILT)) / RC) * handedness * side;

/** Stamped side plate: a ring with a tab under each roller end, plus lightening windows. */
function plateShape(handedness: number, side: number) {
  const s = new THREE.Shape();
  const delta = endShift(handedness, side);
  const samples = 48;
  for (let i = 0; i <= samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    let r = 27;
    for (let k = 0; k < N; k++) {
      const c = (k / N) * Math.PI * 2 + delta;
      let d = Math.abs(a - c);
      d = Math.min(d, Math.PI * 2 - d);
      const lobe = 46 - (d * 180) / Math.PI / 0.9;
      r = Math.max(r, Math.min(46, lobe));
    }
    // shape x → wheel Y, shape y → wheel Z (see the basis in hubGeometries)
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  // six lightening windows + the 14 mm bore
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.26;
    const h = new THREE.Path();
    h.absarc(21 * Math.cos(a), 21 * Math.sin(a), 4.2, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  const bore = new THREE.Path();
  bore.absarc(0, 0, 7.2, 0, Math.PI * 2, true);
  s.holes.push(bore);
  return s;
}

function hubGeometries(handedness: number) {
  return cachedGeo(`mecanum-hub-gf-${handedness}`, () => {
    const b = new GeoBuilder();
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
    const rr = Math.hypot(RC, (ROLLER_L / 2) * Math.sin(TILT));
    for (const side of [-1, 1]) {
      // steel side plate
      const plate = extrude(plateShape(handedness, side), PLATE_T, 0, 3);
      const m = basis.clone().setPosition(side * (PLATE_IN + PLATE_T / 2), 0, 0);
      b.add("gearbox", plate, m);
      // bent roller-axle tabs (the plate is formed inward to meet each roller end)
      const delta = endShift(handedness, side);
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2 + delta;
        b.add("gearbox", chamferCyl(3.6, 3.2, 0.5, 6), M([side * (PLATE_IN - 1.2), rr * Math.cos(a), rr * Math.sin(a)], AXIS_X));
      }
      // 32 mm pattern screws on the plate face
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        b.add("fastener", chamferCyl(2.9, 1.4, 0.35, 6), M([side * (PLATE_IN + PLATE_T + 0.6), 16 * Math.cos(a), 16 * Math.sin(a)], AXIS_X));
      }
    }
    // plastic centre drum between the plates
    b.add("plasticDark", ring(7.2, 18.5, PLATE_IN * 2, 32, 0.8), M([0, 0, 0], AXIS_X));
    return b.build();
  });
}

/**
 * goBILDA 14 mm-bore hub on the inner face (mirrored with `hubSide`): it sits in the 7.9 mm gap
 * between the wheel and the rail, so it never adds width.
 */
function innerHubGeometries() {
  return cachedGeo("mecanum-inner-hub", () => {
    const b = new GeoBuilder();
    const x0 = -HALF_W; // inner face of the wheel
    b.add("aluminium", ring(4.1, 12, 5.6, 32, 0.5), M([x0 - 2.8, 0, 0], AXIS_X));
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      b.add("fastener", chamferCyl(2.6, 1.1, 0.3, 10), M([x0 - 5.6 - 0.5, 8 * Math.cos(a), 8 * Math.sin(a)], AXIS_X));
    }
    return b.build();
  });
}

function rollerEdges(handedness: number) {
  return cachedGeo(`mecanum-roller-edges-gf-${handedness}`, () => {
    const edges = new THREE.EdgesGeometry(rollerGeometry(), 35);
    const list = rollerMatrices(handedness).map((m) => transformed(edges as THREE.BufferGeometry, m));
    // EdgesGeometry has only positions; merge as plain line segments
    const total = list.reduce((n, g) => n + g.getAttribute("position").count, 0);
    const arr = new Float32Array(total * 3);
    let o = 0;
    for (const g of list) {
      const p = g.getAttribute("position").array as Float32Array;
      arr.set(p, o);
      o += p.length;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return out;
  });
}

export type MecanumWheelProps = Omit<ThreeElements["group"], "children"> & {
  /** +1 / −1 roller helix. */
  handedness?: 1 | -1;
  /** Register the spinning group under this name for the rig. */
  rigName?: string;
  /** Local X direction (+1 / −1) facing the robot: the hub goes on that side. */
  hubSide?: 1 | -1;
  /** @deprecated use hubSide (kept for older call sites; the outer insert no longer exists). */
  insertSide?: 1 | -1;
};

export function MecanumWheel({ handedness = 1, rigName, hubSide, insertSide, ...group }: MecanumWheelProps) {
  const look = useRobotLook();
  const rubber = useRobotMaterial("rubber");
  const lineMat = useRobotLineMaterial("rubber");
  const hub = useMemo(() => hubGeometries(handedness), [handedness]);
  const inner = useMemo(() => innerHubGeometries(), []);
  const roller = useMemo(() => rollerGeometry(), []);
  const mats = useMemo(() => rollerMatrices(handedness), [handedness]);
  const inst = useRef<THREE.InstancedMesh>(null);
  const spinRef = useRigRef<THREE.Group>(rigName ?? "__unused");
  const side = hubSide ?? (insertSide ? (-insertSide as 1 | -1) : -1);

  useLayoutEffect(() => {
    const m = inst.current;
    if (!m) return;
    mats.forEach((mat, i) => m.setMatrixAt(i, mat));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [mats, roller]);

  return (
    <group {...group}>
      <group ref={rigName ? spinRef : undefined} userData={{ spinner: true }}>
        <RoleMeshes geos={hub} skipEdges={["fastener"]} />
        <group scale={[-side, 1, 1]}>
          <RoleMeshes geos={inner} skipEdges={["fastener"]} />
        </group>
        <instancedMesh ref={inst} args={[roller, undefined, N]} material={rubber} castShadow receiveShadow raycast={noRaycast} />
        {look === "blueprint" ? <lineSegments geometry={rollerEdges(handedness)} material={lineMat} raycast={noRaycast} /> : null}
      </group>
    </group>
  );
}

/** Merged, static wheel geometry for previews or LOD (all roles). */
export function mecanumWheelStatic(handedness: 1 | -1) {
  return cachedGeo(`mecanum-static-gf-${handedness}`, () => {
    const rollers = merge(rollerMatrices(handedness).map((m) => transformed(rollerGeometry(), m)));
    return { ...hubGeometries(handedness), rubber: rollers };
  });
}
