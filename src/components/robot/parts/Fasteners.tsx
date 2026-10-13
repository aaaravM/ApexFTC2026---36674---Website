"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useRobotLook, useRobotMaterial } from "../context";
import { cachedGeo, GeoBuilder, lathe, type V3 } from "../geometry";
import { DETAIL_LAYER } from "../rig";
import { RoleMeshes } from "./PartMesh";

export type FastenerKind = "shcs" | "bhcs" | "nut";

/** M4 hardware head geometry in METRES, axis +Y, sitting on y = 0. */
export function fastenerHead(kind: FastenerKind = "shcs") {
  return headGeometry(kind);
}

function headGeometry(kind: FastenerKind) {
  return cachedGeo(`fastener-${kind}`, () => {
    let g: THREE.BufferGeometry;
    if (kind === "shcs") {
      // socket head cap screw: Ø7 × 4 mm with a hex-socket recess
      g = lathe(
        [
          [0, 2.1],
          [1.9, 2.1],
          [1.9, 4.0],
          [3.1, 4.0],
          [3.5, 3.6],
          [3.5, 0],
          [0, 0],
        ].reverse() as [number, number][],
        12,
      );
    } else if (kind === "bhcs") {
      // button head: low dome Ø7.6
      const pts: [number, number][] = [[0, 0], [3.8, 0]];
      for (let i = 1; i <= 6; i++) {
        const a = (i / 6) * (Math.PI / 2);
        pts.push([3.8 * Math.cos(a), 2.2 * Math.sin(a)]);
      }
      pts[pts.length - 1] = [0, 2.2];
      g = lathe(pts, 10);
    } else {
      // nylock nut: hex 7 mm AF
      g = lathe(
        [
          [2, 0],
          [4, 0],
          [4, 3.2],
          [3.4, 4.6],
          [2, 4.6],
        ],
        6,
      );
    }
    g.computeVertexNormals();
    g.scale(0.001, 0.001, 0.001);
    return g;
  });
}

export interface FastenerItem {
  /** Position in metres (local frame). */
  p: V3;
  /** Direction the head faces (default +Y). */
  n?: V3;
}

export type FastenersProps = Omit<ThreeElements["group"], "children"> & {
  items: FastenerItem[];
  kind?: FastenerKind;
};

/** Instanced M4 hardware: one draw call for every screw head in `items`. */
export function Fasteners({ items, kind = "shcs", ...group }: FastenersProps) {
  const geo = useMemo(() => headGeometry(kind), [kind]);
  const material = useRobotMaterial("fastener");
  const look = useRobotLook();
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    const n = new THREE.Vector3();
    const mat = new THREE.Matrix4();
    items.forEach((it, i) => {
      n.set(...(it.n ?? [0, 1, 0])).normalize();
      q.setFromUnitVectors(up, n);
      mat.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(1, 1, 1));
      m.setMatrixAt(i, mat);
    });
    m.count = items.length;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.layers.set(DETAIL_LAYER);
  }, [items, geo, look]);
  if (!items.length || look === "blueprint") return null;
  return (
    <group {...group}>
      <instancedMesh ref={ref} args={[geo, undefined, items.length]} material={material} castShadow />
    </group>
  );
}

export interface StandoffSpec {
  /** Start and end points in metres. */
  a: V3;
  b: V3;
  /** Across-corners radius in mm (goBILDA 8 mm hex ≈ 4.6). */
  r?: number;
}

/** goBILDA-style hex standoffs between point pairs, merged into one mesh. */
export function standoffGeometries(specs: StandoffSpec[]) {
  const bld = new GeoBuilder();
  for (const s of specs) {
    const a = new THREE.Vector3(...s.a).multiplyScalar(1000);
    const b = new THREE.Vector3(...s.b).multiplyScalar(1000);
    const d = b.clone().sub(a);
    const len = d.length();
    const g = new THREE.CylinderGeometry(s.r ?? 4.6, s.r ?? 4.6, len, 6, 1, false);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    bld.add("aluminium", g, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  }
  return bld.build();
}

export function Standoffs({ specs, ...group }: Omit<ThreeElements["group"], "children"> & { specs: StandoffSpec[] }) {
  const geos = useMemo(() => standoffGeometries(specs), [specs]);
  return (
    <group {...group}>
      <RoleMeshes geos={geos} edgeThreshold={50} />
    </group>
  );
}

/** Small helper so subsystem files can describe a bolt pattern compactly (mm → m). */
export function boltGrid(center: V3, axisA: V3, axisB: V3, a: number[], b: number[], n: V3): FastenerItem[] {
  const out: FastenerItem[] = [];
  for (const i of a)
    for (const j of b)
      out.push({
        p: [
          (center[0] + axisA[0] * i + axisB[0] * j) / 1000,
          (center[1] + axisA[1] * i + axisB[1] * j) / 1000,
          (center[2] + axisA[2] * i + axisB[2] * j) / 1000,
        ],
        n,
      });
  return out;
}
