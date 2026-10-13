"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { GeoBuilder, tubeAlong, type V3 } from "../geometry";
import type { MaterialRole } from "../materials";
import { RoleMeshes } from "./PartMesh";

export type CableRole = Extract<MaterialRole, "cableRed" | "cableBlack" | "cableSleeve" | "belt">;

export interface CableSpec {
  /** Control points in METRES (local frame). The cable is a Catmull-Rom curve through them. */
  points: V3[];
  /** Radius in mm (18 AWG ≈ 1.2, encoder lead ≈ 1.6, sleeve ≈ 3). */
  radius?: number;
  role?: CableRole;
  /** Zip ties at these curve parameters (0–1). */
  ties?: number[];
  /** Offset a twin conductor (e.g. red/black pair) by this many mm, perpendicular to the run. */
  pairWith?: CableRole;
}

/** Build merged cable geometry per role (+ zip ties as plasticDark), in metres. */
export function harnessGeometries(cables: CableSpec[]) {
  const b = new GeoBuilder();
  const up = new THREE.Vector3(0, 1, 0);
  for (const c of cables) {
    const r = c.radius ?? 1.2;
    const pts: V3[] = c.points.map((p) => [p[0] * 1000, p[1] * 1000, p[2] * 1000]);
    const role = c.role ?? "cableBlack";
    if (c.pairWith) {
      // twin lead: offset the two conductors sideways along the curve
      const { curve } = tubeAlong(pts, r);
      const n = Math.max(12, Math.round(curve.getLength() / 6));
      const a: V3[] = [];
      const bb: V3[] = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);
        const side = new THREE.Vector3().crossVectors(tan, up);
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
        side.normalize().multiplyScalar(r * 1.02);
        a.push([p.x + side.x, p.y + side.y, p.z + side.z]);
        bb.push([p.x - side.x, p.y - side.y, p.z - side.z]);
      }
      b.add(role, tubeAlong(a, r, 0.11, 5).geometry);
      b.add(c.pairWith, tubeAlong(bb, r, 0.11, 5).geometry);
    } else {
      b.add(role, tubeAlong(pts, r, 0.1, role === "cableSleeve" ? 7 : 5).geometry);
    }
    if (c.ties?.length) {
      const { curve } = tubeAlong(pts, r);
      const bundleR = c.pairWith ? r * 2.1 : r;
      for (const t of c.ties) {
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);
        const tie = new THREE.TorusGeometry(bundleR + 0.9, 0.55, 4, 12);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
        const m = new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
        b.add("plasticDark", tie, m);
        const head = new THREE.BoxGeometry(2.6, 2.2, 2.4);
        head.translate(0, bundleR + 1.6, 0);
        b.add("plasticDark", head, m);
      }
    }
  }
  return b.build();
}

export type CableHarnessProps = Omit<ThreeElements["group"], "children"> & { cables: CableSpec[] };

/** Any number of cables rendered as one mesh per colour. */
export function CableHarness({ cables, ...group }: CableHarnessProps) {
  const geos = useMemo(() => harnessGeometries(cables), [cables]);
  return (
    <group {...group}>
      <RoleMeshes geos={geos} edges={false} />
    </group>
  );
}

/** A single cable (TubeGeometry along a Catmull-Rom curve). */
export function Cable({ points, radius, role, ...group }: Omit<ThreeElements["group"], "children"> & CableSpec) {
  const cables = useMemo(() => [{ points, radius, role }], [points, radius, role]);
  return <CableHarness cables={cables} {...group} />;
}
