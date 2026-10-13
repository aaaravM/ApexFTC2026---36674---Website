"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { DERIVED, SHOOTER_GEOM } from "../dimensions";
import { arcPlate, cachedGeo, deg, GeoBuilder } from "../geometry";
import { RoleMeshes } from "./PartMesh";

/**
 * Fixed curved hood (printed shell + foam lining), concentric with the flywheel.
 * It wraps the BACK of the flywheel from the feed point (200°) up to the exit (130°), where the arc's
 * tangent is 40° above horizontal — so the ball leaves at the team's LAUNCH_PITCH_DEG.
 *
 * Local frame: origin on the flywheel axis; +Z = turret forward, +Y = up, width along X.
 * Angles are measured in the side view from +Z (forward) toward +Y (up).
 */

/** Matrix mapping a shape drawn in the side view (x = forward, y = up) and extruded along Z to the
 * part frame (forward = +Z, up = +Y, extrusion across = X). Proper rotation (det +1). */
export function sideViewBasis(x = 0, y = 0, z = 0) {
  const m = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(-1, 0, 0),
  );
  m.setPosition(x, y, z);
  return m;
}

export function hoodGeometries(width: number) {
  return cachedGeo(`hood-${width}`, () => {
    const b = new GeoBuilder();
    const rIn = DERIVED.hoodInnerRadiusMm;
    const t = SHOOTER_GEOM.hoodThicknessMm;
    const foam = SHOOTER_GEOM.hoodFoamMm;
    const a0 = deg(SHOOTER_GEOM.hoodExitDeg);
    const a1 = deg(SHOOTER_GEOM.hoodStartDeg);
    // shell
    b.add("plasticAccent", arcPlate(rIn, rIn + t, a0, a1, width, 0.6, 40), sideViewBasis());
    // rolled exit lip
    b.add("plasticAccent", arcPlate(rIn - 1, rIn + t + 4, a0 - deg(1.5), a0 + deg(3), width, 0.8, 8), sideViewBasis());
    // stiffening ribs on the back
    for (const x of [-width / 2 + 2, -width / 6, width / 6, width / 2 - 2]) {
      b.add("plasticAccent", arcPlate(rIn + t, rIn + t + 7, a0 + deg(4), a1 - deg(2), 3, 0, 24), sideViewBasis(x, 0, 0));
    }
    // foam lining on the inside
    b.add("rubber", arcPlate(rIn - foam, rIn, a0 + deg(2), a1 - deg(1), width - 6, 0.3, 40), sideViewBasis());
    return b.build();
  });
}

export type HoodProps = Omit<ThreeElements["group"], "children"> & { width?: number };

export function Hood({ width = 2 * SHOOTER_GEOM.sidePlateInnerMm - 2, ...group }: HoodProps) {
  const geos = useMemo(() => hoodGeometries(width), [width]);
  return (
    <group {...group}>
      <RoleMeshes geos={geos} edgeThreshold={35} />
    </group>
  );
}
