"use client";

/**
 * Static assemblies: every part of a subsystem that does not move relative to it is merged into one
 * mesh per material role. A subsystem with forty parts then costs ~6 draw calls instead of ~120.
 * Moving parts (wheels, rollers, flywheel, turret…) stay separate components.
 */
import { useMemo } from "react";
import * as THREE from "three";
import { merge, normalize, type RoleGeometries, type V3 } from "./geometry";
import type { MaterialRole } from "./materials";
import { RoleMeshes } from "./parts/PartMesh";

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();

/** Matrix from a position in METRES, Euler rotation and optional uniform scale. */
export function Mm(position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], scale: number | V3 = 1) {
  _q.setFromEuler(_e.set(rotation[0], rotation[1], rotation[2]));
  const s = typeof scale === "number" ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(...scale);
  return new THREE.Matrix4().compose(new THREE.Vector3(...position), _q, s);
}

const mmToM = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
/** A metres copy of a millimetre geometry (cached). */
export function inMetres(g: THREE.BufferGeometry) {
  let out = mmToM.get(g);
  if (!out) {
    out = normalize(g.clone());
    out.scale(0.001, 0.001, 0.001);
    mmToM.set(g, out);
  }
  return out;
}

export class AssemblyBuilder {
  private parts = new Map<MaterialRole, THREE.BufferGeometry[]>();

  /** Add a geometry already in metres. */
  add(role: MaterialRole, geo: THREE.BufferGeometry, matrix?: THREE.Matrix4) {
    const g = normalize(geo.clone());
    if (matrix) {
      g.applyMatrix4(matrix);
      if (matrix.determinant() < 0) {
        const idx = g.getIndex();
        if (idx) {
          const a = idx.array as Uint16Array | Uint32Array;
          for (let i = 0; i < a.length; i += 3) {
            const t = a[i + 1];
            a[i + 1] = a[i + 2];
            a[i + 2] = t;
          }
        }
      }
    }
    const list = this.parts.get(role) ?? [];
    list.push(g);
    this.parts.set(role, list);
    return this;
  }

  /** Add every role of a built part (metres). */
  addPart(geos: RoleGeometries, matrix?: THREE.Matrix4) {
    for (const role of Object.keys(geos) as MaterialRole[]) this.add(role, geos[role]!, matrix);
    return this;
  }

  build(): RoleGeometries {
    const out: RoleGeometries = {};
    for (const [role, list] of this.parts) {
      const g = merge(list);
      g.computeBoundingSphere();
      g.computeBoundingBox();
      out[role] = g;
    }
    return out;
  }
}

/** Render a static assembly built once by `build`. */
export function StaticAssembly({
  build,
  skipEdges,
  edgeThreshold,
}: {
  build: () => RoleGeometries;
  skipEdges?: MaterialRole[];
  edgeThreshold?: number;
}) {
  // `build` is expected to be a stable, cached function (module-level) — compute once.
  const geos = useMemo(() => build(), [build]);
  return <RoleMeshes geos={geos} skipEdges={skipEdges} edgeThreshold={edgeThreshold} />;
}

/** Simple memo helper for module-level assemblies keyed by a string. */
const assemblyCache = new Map<string, RoleGeometries>();
export function cachedAssembly(key: string, build: () => RoleGeometries) {
  return () => {
    let g = assemblyCache.get(key);
    if (!g) {
      g = build();
      assemblyCache.set(key, g);
    }
    return g;
  };
}
