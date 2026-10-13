"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { PINPOINT } from "../dimensions";
import { box, cachedGeo, chamferCyl, GeoBuilder, M, rbox } from "../geometry";
import { RoleMeshes } from "./PartMesh";

/**
 * goBILDA Pinpoint V2 odometry computer (40 × 42.5 × 15.6 mm, 32 mm hole pattern).
 * Local frame: bottom at y = 0, connectors on the +Z edge, X/Y arrows label on top.
 */
export function pinpointGeometries() {
  return cachedGeo("pinpoint", () => {
    const b = new GeoBuilder();
    const h = PINPOINT.bodyHeightMm;
    b.add("plasticDark", rbox(PINPOINT.widthMm, h, PINPOINT.lengthMm, 3.2, 3), M([0, h / 2, 0]));
    // raised lid
    b.add("plasticDark", rbox(PINPOINT.widthMm - 9, 1.6, PINPOINT.lengthMm - 12, 1.2, 2), M([0, h + 0.4, -2]));
    // yellow label patches: "X", "Y", "I²C" boxes and the brand strip
    for (const [x, w] of [
      [-8, 5],
      [-1, 5],
      [7, 7],
    ] as [number, number][])
      b.add("nylonYellow", box(w, 0.4, 6), M([x, h + 1.3, 5]));
    b.add("nylonYellow", box(14, 0.4, 3.2), M([4, h + 1.3, -11]));
    // M4 screws in the 32 mm pattern
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) b.add("fastener", chamferCyl(3.4, 2, 0.5, 16), M([sx * 16, h + 1, sz * 16]));
    // three JST-PH connectors on the +Z edge
    for (let i = 0; i < 3; i++) b.add("nylonWhite", box(6.5, 5, 4), M([-8 + i * 8, 5, PINPOINT.lengthMm / 2 + 1.2]));
    // status LED
    b.add("led", box(2, 0.6, 2), M([-15, h + 0.3, 8]));
    return b.build();
  });
}

export function Pinpoint(props: Omit<ThreeElements["group"], "children">) {
  const geos = useMemo(() => pinpointGeometries(), []);
  return (
    <group {...props}>
      <RoleMeshes geos={geos} skipEdges={["nylonYellow", "fastener", "led", "nylonWhite"]} />
    </group>
  );
}
