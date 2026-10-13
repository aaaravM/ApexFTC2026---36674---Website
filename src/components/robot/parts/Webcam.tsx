"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { AXIS_Z, box, cachedGeo, chamferCyl, GeoBuilder, lathe, M, rbox, ring } from "../geometry";
import { RoleMeshes } from "./PartMesh";

/**
 * USB webcam ("Webcam 1", C270-class, size estimated). Local frame: lens on +Z, centred on the lens
 * axis, so the group's position IS the camera mount point used by the vision code.
 */
export function webcamGeometries() {
  return cachedGeo("webcam", () => {
    const b = new GeoBuilder();
    // pill-shaped body, lens offset to the left
    b.add("plasticDark", rbox(70, 28, 20, 9, 4), M([8, 0, -10]));
    // glossy front fascia
    b.add("plasticGrey", rbox(66, 24, 1.2, 8, 3), M([8, 0, 0.3]));
    // lens barrel + glass
    b.add("aluminium", ring(6.4, 9.6, 3.2, 40, 0.5), M([0, 0, 1.2], AXIS_Z));
    b.add(
      "lens",
      lathe(
        [
          [0, 0.9],
          [4, 0.6],
          [6.4, 0],
          [6.4, -1.2],
          [0, -1.2],
        ].reverse() as [number, number][],
        40,
      ),
      M([0, 0, 2.2], AXIS_Z),
    );
    // activity LED + mic grille dots
    b.add("led", chamferCyl(1.1, 0.6, 0.2, 10), M([30, 7, 1.1], AXIS_Z));
    for (let i = 0; i < 3; i++) b.add("plasticDark", chamferCyl(0.7, 0.6, 0.1, 8), M([22 + i * 3.2, -7, 1.1], AXIS_Z));
    // hinge clip on the bottom
    b.add("plasticDark", rbox(18, 10, 14, 2, 2), M([8, -16, -10]));
    return b.build();
  });
}

export function Webcam(props: Omit<ThreeElements["group"], "children">) {
  const geos = useMemo(() => webcamGeometries(), []);
  return (
    <group {...props}>
      <RoleMeshes geos={geos} skipEdges={["led"]} />
    </group>
  );
}

/** Limelight 3A (optional; size estimated). Local frame: lens on +Z, centred on the lens axis. */
export function limelightGeometries() {
  return cachedGeo("limelight3a", () => {
    const b = new GeoBuilder();
    b.add("aluminiumDark", rbox(62, 44, 22, 5, 3), M([0, 0, -11]));
    // heat-sink fins on the back
    for (let i = 0; i < 6; i++) b.add("aluminiumDark", box(52, 1.6, 4), M([0, -15 + i * 6, -23]));
    b.add("plasticDark", rbox(56, 38, 1.2, 4, 2), M([0, 0, 0.4]));
    b.add("aluminium", ring(6.2, 9, 2.6, 36, 0.4), M([0, 4, 1.4], AXIS_Z));
    b.add("lens", chamferCyl(6.2, 1.6, 0.4, 32), M([0, 4, 1.8], AXIS_Z));
    // status LEDs
    for (const x of [-20, -16]) b.add("led", box(2.2, 2.2, 0.6), M([x, -13, 1]));
    return b.build();
  });
}

export function Limelight3A(props: Omit<ThreeElements["group"], "children">) {
  const geos = useMemo(() => limelightGeometries(), []);
  return (
    <group {...props}>
      <RoleMeshes geos={geos} skipEdges={["led"]} />
    </group>
  );
}
