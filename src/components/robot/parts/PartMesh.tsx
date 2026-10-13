"use client";

import { useCallback, useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useRobotLineMaterial, useRobotLook, useRobotMaterial } from "../context";
import { rmm } from "../dimensions";
import { cachedGeo, edgesOf, type RoleGeometries } from "../geometry";
import type { MaterialRole } from "../materials";
import { DETAIL_LAYER } from "../rig";

/** Raycast that never hits: part meshes leave pointer picking to the per-subsystem HitProxy boxes. */
export const noRaycast = () => null;

/** Small parts that don't need to appear in the contact-shadow pass (see DETAIL_LAYER). */
export const DETAIL_ROLES: ReadonlySet<MaterialRole> = new Set<MaterialRole>([
  "fastener",
  "nylonWhite",
  "nylonYellow",
  "led",
  "lens",
  "pcb",
  "cableRed",
  "cableBlack",
  "cableSleeve",
  "belt",
  "hubLabelControl",
  "hubLabelExpansion",
  "numberPlate",
  "batteryWrap",
  "motorAccent",
  "steel",
  "urethane",
]);

export type PartMeshProps = Omit<ThreeElements["mesh"], "geometry" | "material"> & {
  geometry: THREE.BufferGeometry;
  role: MaterialRole;
  /** Draw blueprint edge lines for this mesh (default true). */
  edges?: boolean;
  /** Feature-edge threshold in degrees. */
  edgeThreshold?: number;
  /** Let the pointer raycaster hit this mesh's triangles (default false: HitProxy boxes do it). */
  pickable?: boolean;
};

/** A mesh whose material comes from the current look + subsystem; adds edge lines in blueprint. */
export function PartMesh({ geometry, role, edges = true, edgeThreshold = 30, pickable = false, children, ...rest }: PartMeshProps) {
  const material = useRobotMaterial(role);
  const look = useRobotLook();
  const detail = DETAIL_ROLES.has(role);
  const setLayer = useCallback(
    (m: THREE.Mesh | null) => {
      if (m && detail) m.layers.set(DETAIL_LAYER);
    },
    [detail],
  );
  return (
    <mesh
      ref={setLayer}
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
      raycast={pickable ? undefined : noRaycast}
      {...rest}
    >
      {look === "blueprint" && edges ? <EdgeLines geometry={geometry} role={role} threshold={edgeThreshold} /> : null}
      {children}
    </mesh>
  );
}

export function EdgeLines({
  geometry,
  role,
  threshold = 30,
}: {
  geometry: THREE.BufferGeometry;
  role: MaterialRole;
  threshold?: number;
}) {
  const material = useRobotLineMaterial(role);
  const edges = useMemo(() => edgesOf(geometry, threshold), [geometry, threshold]);
  return <lineSegments geometry={edges} material={material} raycast={noRaycast} />;
}

/** Render every role of a built part. */
export function RoleMeshes({
  geos,
  edges = true,
  edgeThreshold,
  skipEdges,
}: {
  geos: RoleGeometries;
  edges?: boolean;
  edgeThreshold?: number;
  /** Roles that never get blueprint lines (tiny detail). */
  skipEdges?: MaterialRole[];
}) {
  return (
    <>
      {(Object.keys(geos) as MaterialRole[]).map((role) => (
        <PartMesh
          key={role}
          role={role}
          geometry={geos[role]!}
          edges={edges && !(skipEdges && skipEdges.includes(role))}
          edgeThreshold={edgeThreshold}
        />
      ))}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// Pointer hit proxies
// ------------------------------------------------------------------------------------------------

/** Axis-aligned box in robot-frame millimetres: [x0, x1, y0, y1, z0, z1]. */
export type ProxyBox = readonly [number, number, number, number, number, number];

const PROXY_MATERIAL = new THREE.MeshBasicMaterial({ color: "#ff00ff", wireframe: true });
PROXY_MATERIAL.name = "hitProxy";

/**
 * A few invisible boxes that stand in for a subsystem when the pointer raycasts the robot (~12
 * triangles per box instead of tens of thousands). They sit inside the subsystem's group, so they
 * follow explode and turret yaw, and `userData.subsystem` on the group resolves the hit.
 */
export function HitProxy({ boxes }: { boxes: readonly ProxyBox[] }) {
  const geometry = useMemo(
    () =>
      cachedGeo(`proxy-${JSON.stringify(boxes)}`, () => {
        const parts = boxes.map(([x0, x1, y0, y1, z0, z1]) => {
          const g = new THREE.BoxGeometry(Math.abs(y1 - y0) * 0.001, Math.abs(z1 - z0) * 0.001, Math.abs(x1 - x0) * 0.001);
          const c = rmm((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
          g.translate(c[0], c[1], c[2]);
          return g;
        });
        const positions: number[] = [];
        for (const p of parts) {
          const ng = p.toNonIndexed();
          positions.push(...(ng.getAttribute("position").array as Float32Array));
        }
        const out = new THREE.BufferGeometry();
        out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        out.computeBoundingSphere();
        out.computeBoundingBox();
        return out;
      }),
    [boxes],
  );
  return <mesh geometry={geometry} material={PROXY_MATERIAL} visible={false} name="hitProxy" userData={{ hitProxy: true }} />;
}
