"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { box, cachedGeo, chamferCyl, cyl, GeoBuilder, M, rbox } from "../geometry";
import { RoleMeshes } from "./PartMesh";

/**
 * goBILDA 2000-series dual-mode servo (40 × 20 × 37 mm body, 25T spline), set to continuous rotation
 * for the intake side rollers / feeder. Local frame: output spline axis = +Y at the origin, body
 * extends toward −X (spline sits near one end), bottom of the body at y = −37.
 */
export function servoGeometries() {
  return cachedGeo("servo-2000", () => {
    const b = new GeoBuilder();
    const off = -10; // spline is 10 mm from the body's +X end
    b.add("plasticDark", rbox(40, 37, 20, 1.6, 2), M([off, -37 / 2 - 2, 0]));
    // mounting flanges
    b.add("plasticDark", rbox(55, 2.6, 20, 1, 2), M([off, -9, 0]));
    // top cap step + spline boss
    b.add("plasticDark", rbox(30, 3, 18, 1.2, 2), M([off + 4, -0.6, 0]));
    b.add("steel", chamferCyl(3, 4, 0.3, 18), M([0, 1.6, 0]));
    b.add("steel", cyl(1.3, 1, 8), M([0, 3.8, 0]));
    // label stripe
    b.add("nylonYellow", box(30, 9, 0.4), M([off, -22, 10.1]));
    b.add("nylonYellow", box(30, 9, 0.4), M([off, -22, -10.1]));
    return b.build();
  });
}

export function Servo(props: Omit<ThreeElements["group"], "children">) {
  const geos = useMemo(() => servoGeometries(), []);
  return (
    <group {...props}>
      <RoleMeshes geos={geos} skipEdges={["nylonYellow", "steel"]} />
    </group>
  );
}
