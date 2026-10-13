"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { AXIS_Z, box, cachedGeo, chamferCyl, GeoBuilder, M, rbox } from "../geometry";
import { RoleMeshes } from "./PartMesh";

/**
 * REV Color Sensor V3 (size estimated). Local frame: sensing face toward +Z, centred.
 * In the hopper throat it classifies POLLEN vs red/blue NECTAR (RobotConstants: "ball_color").
 */
export function colorSensorGeometries() {
  return cachedGeo("color-sensor", () => {
    const b = new GeoBuilder();
    b.add("plasticDark", rbox(28, 22, 7, 1.6, 2), M([0, 0, 0]));
    b.add("pcb", box(25, 19, 1.2), M([0, 0, -4]));
    // optical window + illumination LED
    b.add("lens", rbox(9, 6, 1, 0.8, 2), M([0, 2, 3.6]));
    b.add("led", chamferCyl(1.6, 0.8, 0.2, 12), M([-6.5, 2, 3.7], AXIS_Z));
    // JST-PH 4-pin on the back, mounting screws
    b.add("nylonWhite", box(8, 5, 5), M([0, -6, -6.5]));
    for (const x of [-11, 11]) b.add("fastener", chamferCyl(2.6, 1.4, 0.3, 14), M([x, -7, 3.8], AXIS_Z));
    return b.build();
  });
}

export function ColorSensor(props: Omit<ThreeElements["group"], "children">) {
  const geos = useMemo(() => colorSensorGeometries(), []);
  return (
    <group {...props}>
      <RoleMeshes geos={geos} skipEdges={["led", "fastener", "nylonWhite", "lens"]} />
    </group>
  );
}
