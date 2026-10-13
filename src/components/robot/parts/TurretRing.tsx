"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useRigRef } from "../context";
import { DERIVED, TURRET } from "../dimensions";
import { cachedGeo, chamferCyl, cyl, extrude, gearShape, GeoBuilder, M, rbox, ring } from "../geometry";
import { RoleMeshes } from "./PartMesh";

/**
 * Turret drive: fixed bearing ring, 100 T ring gear (rotates with the turret), 20 T pinion (5:1),
 * and the rotating platform the shooter bolts to. All local frames: Y = turret axis, origin on the
 * axis at the bottom of the fixed ring. The platform sits on 2 mm spacers so the pinion's top face
 * clears it, and carries the tab that meets the stop block at ±172° (the software limit is ±170°).
 */

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0]; // XY shape → XZ plane, thickness along +Y

/** Fixed lazy-susan ring (sits on the base plate). */
export function fixedRingGeometries() {
  return cachedGeo("turret-fixed-ring", () => {
    const b = new GeoBuilder();
    const h = TURRET.fixedRingHeightMm;
    const rOut = TURRET.fixedRingOuterMm / 2;
    const rIn = TURRET.boreMm / 2 + 1;
    b.add("aluminium", ring(rIn, rOut, h - 1.2, 48, 0.6), M([0, (h - 1.2) / 2, 0]));
    // bearing race seam (dark) right under the gear
    b.add("aluminiumDark", ring(rIn + 2, rOut - 3, 1.2, 48, 0.2), M([0, h - 0.6, 0]));
    // screws around the outside of the ring into the base plate
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      b.add("fastener", chamferCyl(3.5, 3, 0.5, 10), M([(rOut + 4) * Math.cos(a), 1.5, (rOut + 4) * Math.sin(a)]));
    }
    return b.build();
  });
}

/** Ring gear + spacers + platform + stop tab (all rotate with the turret). Origin at the bottom of the gear. */
export function turretRotorGeometries() {
  return cachedGeo("turret-rotor-v2", () => {
    const b = new GeoBuilder();
    const gh = TURRET.gearHeightMm;
    const gap = TURRET.platformGapMm;
    const gear = gearShape(TURRET.gearTeeth, TURRET.module, TURRET.boreMm / 2, { bolts: 12, boltR: 64 });
    b.add("plasticAccent", extrude(gear, gh, 0.35, 3), M([0, gh / 2, 0], FLAT));
    const pt = TURRET.platformThicknessMm;
    const py = gh + gap; // platform bottom
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      // spacer between the gear and the platform, bolt head on top
      b.add("aluminium", cyl(4, gap + 0.2, 10), M([64 * Math.cos(a), gh + gap / 2, 64 * Math.sin(a)]));
      b.add("fastener", chamferCyl(3.4, 2.4, 0.4, 10), M([64 * Math.cos(a), py + pt + 1.2, 64 * Math.sin(a)]));
    }
    // rotating platform: disc with a central pass-through for the ball + lightening pockets
    const R = TURRET.platformRadiusMm;
    const disc = new THREE.Shape();
    disc.absarc(0, 0, R, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 52, 0, Math.PI * 2, true);
    disc.holes.push(hole);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const p = new THREE.Path();
      p.absarc(75 * Math.cos(a), 75 * Math.sin(a), 6, 0, Math.PI * 2, true);
      disc.holes.push(p);
    }
    b.add("aluminium", extrude(disc, pt, 0.5, 40), M([0, py + pt / 2, 0], FLAT));
    // stop tab at the front of the platform rim (meets the block on the base plate at ±172°)
    const tabR = TURRET.stopTabRadiusMm;
    b.add("aluminiumDark", rbox(10, pt, tabR - R + 8, 1, 2), M([0, py + pt / 2, R - 4 + (tabR - R + 8) / 2]));
    return b.build();
  });
}

/** 20 T pinion on the turret motor shaft. Origin at the pinion's bottom face (= the gear's bottom). */
export function pinionGeometries() {
  return cachedGeo("turret-pinion-v2", () => {
    const b = new GeoBuilder();
    const g = gearShape(TURRET.pinionTeeth, TURRET.module, 4.1);
    // exactly as tall as the ring gear, so its top face never reaches the platform
    b.add("steel", extrude(g, TURRET.gearHeightMm, 0.3, 3), M([0, TURRET.gearHeightMm / 2, 0], FLAT));
    b.add("steel", ring(4.1, 8.5, 4, 20, 0.4), M([0, -2, 0]));
    b.add("fastener", cyl(1.6, 3, 8), M([8.8, -2, 0], [0, 0, Math.PI / 2]));
    return b.build();
  });
}

export function TurretFixedRing(props: Omit<ThreeElements["group"], "children">) {
  const geos = useMemo(() => fixedRingGeometries(), []);
  return (
    <group {...props}>
      <RoleMeshes geos={geos} skipEdges={["fastener"]} />
    </group>
  );
}

export function TurretRotor(props: Omit<ThreeElements["group"], "children">) {
  const geos = useMemo(() => turretRotorGeometries(), []);
  return (
    <group {...props}>
      <RoleMeshes geos={geos} skipEdges={["fastener"]} edgeThreshold={40} />
    </group>
  );
}

export function TurretPinion({ rigName, ...group }: Omit<ThreeElements["group"], "children"> & { rigName?: string }) {
  const geos = useMemo(() => pinionGeometries(), []);
  const ref = useRigRef<THREE.Group>(rigName ?? "__unused");
  return (
    <group {...group}>
      <group ref={rigName ? ref : undefined} userData={{ spinner: true }}>
        <RoleMeshes geos={geos} skipEdges={["fastener"]} edgeThreshold={40} />
      </group>
    </group>
  );
}

/** Centre distance between the turret axis and the pinion (mm). */
export const PINION_CENTRE_MM = DERIVED.gearPitchRadiusMm + DERIVED.pinionPitchRadiusMm;
