"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useRigRef } from "../context";
import { AXIS_X, beltLoop, cachedGeo, GeoBuilder, lathe, M } from "../geometry";
import { RoleMeshes } from "./PartMesh";

/** GT2-style timing pulley with flanges. Local frame: axle along X, centred. */
export function pulleyGeometries(pitchR: number, width: number) {
  return cachedGeo(`pulley-${pitchR}-${width}`, () => {
    const b = new GeoBuilder();
    const fl = pitchR + 2.2;
    const h = width / 2;
    const teeth: [number, number][] = [
      [pitchR - 0.6, -h],
      [pitchR - 0.6, h],
    ];
    b.add(
      "aluminium",
      lathe(
        [
          [4.1, -h - 1.4],
          [fl, -h - 1.4],
          [fl, -h],
          ...teeth,
          [fl, h],
          [fl, h + 1.4],
          [9, h + 1.4],
          [9, h + 7],
          [4.1, h + 7],
        ],
        36,
      ),
      M([0, 0, 0], AXIS_X),
    );
    return b.build();
  });
}

export function Pulley({
  pitchR,
  width = 9,
  rigName,
  ...group
}: Omit<ThreeElements["group"], "children"> & { pitchR: number; width?: number; rigName?: string }) {
  const geos = useMemo(() => pulleyGeometries(pitchR, width), [pitchR, width]);
  const ref = useRigRef<THREE.Group>(rigName ?? "__unused");
  return (
    <group {...group}>
      <group ref={rigName ? ref : undefined} userData={{ spinner: true }}>
        <RoleMeshes geos={geos} edgeThreshold={45} />
      </group>
    </group>
  );
}

/**
 * Closed belt around two pulleys whose centres are given in the side view (y = forward, z = up, mm),
 * lying in the plane x = 0 of the local frame.
 */
export function beltGeometries(c1: [number, number], r1: number, c2: [number, number], r2: number, width = 9) {
  return cachedGeo(`belt-${c1}-${r1}-${c2}-${r2}-${width}`, () => {
    const b = new GeoBuilder();
    const g = beltLoop(c1, r1, c2, r2, width, 1.6);
    // loop drawn in XY (x = forward, y = up), extruded along Z → map to Z forward, Y up, X across
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-1, 0, 0),
    );
    b.add("belt", g, m);
    return b.build();
  });
}

export function Belt({
  c1,
  r1,
  c2,
  r2,
  width = 9,
  ...group
}: Omit<ThreeElements["group"], "children"> & {
  c1: [number, number];
  r1: number;
  c2: [number, number];
  r2: number;
  width?: number;
}) {
  const geos = useMemo(() => beltGeometries(c1, r1, c2, r2, width), [c1, r1, c2, r2, width]);
  return (
    <group {...group}>
      <RoleMeshes geos={geos} edgeThreshold={45} />
    </group>
  );
}
