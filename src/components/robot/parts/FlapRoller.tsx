"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useRigRef } from "../context";
import { AXIS_X, cachedGeo, cyl, extrude, GeoBuilder, M, ring } from "../geometry";
import type { MaterialRole } from "../materials";
import { RoleMeshes } from "./PartMesh";

/**
 * Intake roller: hex shaft + core tube + silicone flap wheels. Local frame: axle along X, centred.
 * Used for the full-width intake roller and (vertical) for the CR-servo side rollers.
 */
function bladeShape(rRoot: number, rTip: number, bend: number) {
  const n = 7;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = rRoot + (rTip - rRoot) * t;
    const a = bend * t * t;
    const th = (1.5 - 0.55 * t) / r; // half-thickness as an angle
    left.push([r * Math.cos(a + th), r * Math.sin(a + th)]);
    right.push([r * Math.cos(a - th), r * Math.sin(a - th)]);
  }
  const s = new THREE.Shape();
  [...left, ...right.reverse()].forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  return s;
}

export function flapRollerGeometries(opts: {
  length: number;
  wheels: number;
  wheelWidth: number;
  tipRadius: number;
  coreRadius: number;
  flaps: number;
  flapRole?: MaterialRole;
}) {
  const { length, wheels, wheelWidth, tipRadius, coreRadius, flaps, flapRole = "rubberGrey" } = opts;
  return cachedGeo(`flaproller-${length}-${wheels}-${wheelWidth}-${tipRadius}-${coreRadius}-${flaps}-${flapRole}`, () => {
    const b = new GeoBuilder();
    b.add("steel", cyl(4, length + 16, 6), M([0, 0, 0], AXIS_X));
    b.add("plasticDark", ring(coreRadius - 1.6, coreRadius, length, 16, 0.2), M([0, 0, 0], AXIS_X));
    const blade = extrude(bladeShape(coreRadius + 1, tipRadius, -0.5), wheelWidth, 0, 2);
    const spacing = wheels > 1 ? (length - wheelWidth) / (wheels - 1) : 0;
    for (let w = 0; w < wheels; w++) {
      const x = -length / 2 + wheelWidth / 2 + w * spacing;
      const phase = (w % 2) * (Math.PI / flaps);
      b.add("plasticDark", ring(coreRadius, coreRadius + 4.5, wheelWidth, 16, 0.6), M([x, 0, 0], AXIS_X));
      for (let k = 0; k < flaps; k++) {
        const a = phase + (k / flaps) * Math.PI * 2;
        // blade drawn in XY (radial in the plane), extruded along Z → rotate so width is along X
        const m = new THREE.Matrix4()
          .makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0))
          .premultiply(new THREE.Matrix4().makeRotationX(a));
        m.setPosition(x, 0, 0);
        b.add(flapRole, blade, m);
      }
    }
    return b.build();
  });
}

export type FlapRollerProps = Omit<ThreeElements["group"], "children"> & {
  length: number;
  wheels?: number;
  wheelWidth?: number;
  tipRadius?: number;
  coreRadius?: number;
  flaps?: number;
  flapRole?: MaterialRole;
  rigName?: string;
};

export function FlapRoller({
  length,
  wheels = 5,
  wheelWidth = 18,
  tipRadius = 40,
  coreRadius = 12,
  flaps = 8,
  flapRole,
  rigName,
  ...group
}: FlapRollerProps) {
  const geos = useMemo(
    () => flapRollerGeometries({ length, wheels, wheelWidth, tipRadius, coreRadius, flaps, flapRole }),
    [length, wheels, wheelWidth, tipRadius, coreRadius, flaps, flapRole],
  );
  const ref = useRigRef<THREE.Group>(rigName ?? "__unused");
  return (
    <group {...group}>
      <group ref={rigName ? ref : undefined} userData={{ spinner: true }}>
        <RoleMeshes geos={geos} edgeThreshold={40} />
      </group>
    </group>
  );
}
