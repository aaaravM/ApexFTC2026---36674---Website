"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { SIGN } from "../dimensions";
import { box, cachedGeo, chamferCyl, GeoBuilder, M, rbox } from "../geometry";
import { RoleMeshes } from "./PartMesh";

/**
 * FTC robot sign [Competition Manual R401–R403]: at least 6.5 × 2.5 in, solid alliance colour,
 * white team-number numerals ≈ 2.25 in tall, nothing else printed on it. Modelled 170 × 66 mm on a
 * dark backer with two screws. Local frame: printed face toward +Z, centred.
 */
export function numberPlateGeometries() {
  return cachedGeo("robot-sign", () => {
    const b = new GeoBuilder();
    b.add("numberPlate", box(SIGN.widthMm, SIGN.heightMm, SIGN.thicknessMm), M([0, 0, 0]));
    b.add("plasticDark", rbox(SIGN.widthMm + 4, SIGN.heightMm + 4, 1.6, 3, 2), M([0, 0, -(SIGN.thicknessMm / 2 + 0.8)]));
    // two screws inside the 0.25 in border (not on the numerals)
    for (const x of [-(SIGN.widthMm / 2 - 3.4), SIGN.widthMm / 2 - 3.4])
      b.add("fastener", chamferCyl(2.9, 1.1, 0.3, 12), M([x, 0, SIGN.thicknessMm / 2 + 0.45], [Math.PI / 2, 0, 0]));
    return b.build();
  });
}

export function NumberPlate(props: Omit<ThreeElements["group"], "children">) {
  const geos = useMemo(() => numberPlateGeometries(), []);
  return (
    <group {...props}>
      <RoleMeshes geos={geos} skipEdges={["fastener"]} />
    </group>
  );
}
