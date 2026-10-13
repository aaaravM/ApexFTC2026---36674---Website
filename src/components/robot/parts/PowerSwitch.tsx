"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { box, cachedGeo, GeoBuilder, M, rbox } from "../geometry";
import { RoleMeshes } from "./PartMesh";

/**
 * REV-style main power switch with bracket (FTC requires an accessible main switch).
 * Local frame: switch face toward +Z, bottom at y = 0.
 */
export function powerSwitchGeometries() {
  return cachedGeo("power-switch", () => {
    const b = new GeoBuilder();
    b.add("plasticDark", rbox(34, 22, 18, 2.5, 2), M([0, 11, 0]));
    b.add("plasticGrey", rbox(26, 14, 2, 1, 2), M([0, 12, 9.2]));
    // red rocker
    b.add("cableRed", rbox(14, 9, 4, 1.2, 2), M([0, 12, 11]));
    // bracket ears
    b.add("aluminium", box(48, 3, 18), M([0, 1.5, 0]));
    return b.build();
  });
}

export function PowerSwitch(props: Omit<ThreeElements["group"], "children">) {
  const geos = useMemo(() => powerSwitchGeometries(), []);
  return (
    <group {...props}>
      <RoleMeshes geos={geos} />
    </group>
  );
}
