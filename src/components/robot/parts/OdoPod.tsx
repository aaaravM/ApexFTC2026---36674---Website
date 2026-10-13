"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import type * as THREE from "three";
import { useRigRef } from "../context";
import { ODO } from "../dimensions";
import { AXIS_X, AXIS_Z, box, cachedGeo, chamferCyl, cyl, GeoBuilder, lathe, M, rbox } from "../geometry";
import { RoleMeshes } from "./PartMesh";

/**
 * goBILDA 4-bar odometry pod (3110-0001-0002), shown at its minimum (compressed) height.
 * From the drawing: 43 × 43 mm mounting block (32 mm M4 pattern), 11 mm thick, ≤ 41.5 mm deep,
 * 32 mm omni wheel, 57 mm tall when compressed.
 *
 * Local frame: origin on the floor under the wheel centre. The wheel rolls along X, its axle is
 * along Z. The mounting block's face sits at x = −POD_MOUNT_X (the block is behind the wheel along −X).
 * The wheel is a separate part (`odoWheelGeometries`, centred on the axle) so the rig can spin it.
 */
export const POD_MOUNT_X = 26;
export const POD_WHEEL_R = ODO.wheelDiameterMm / 2; // 16

export function odoPodGeometries() {
  return cachedGeo("odo-pod-body", () => {
    const b = new GeoBuilder();
    const r = POD_WHEEL_R;
    const blk = ODO.blockMm; // 43
    const t = ODO.blockThicknessMm; // 11
    const bx = -POD_MOUNT_X + t / 2;
    b.add("plasticDark", rbox(t, blk, blk, 2, 2), M([bx, 14 + blk / 2, 0]));
    for (const y of [24, 40]) b.add("plasticDark", chamferCyl(4.2, blk - 4, 0.6, 14), M([bx + 4, y, 0], AXIS_Z));
    for (const z of [-15.5, 15.5]) {
      b.add("plasticDark", rbox(25, 6, 3.5, 1.5, 2), M([-5, 33, z], [0, 0, -0.32]));
      b.add("plasticDark", rbox(25, 6, 3.5, 1.5, 2), M([-5, 19.5, z], [0, 0, -0.18]));
    }
    for (const z of [-9.5, 9.5]) b.add("plasticDark", rbox(30, 26, 3, 2, 2), M([3, r + 4, z]));
    b.add("plasticDark", rbox(22, 7, 22, 2, 2), M([5, r + 15, 0]));
    b.add("nylonWhite", box(8, 5, 5), M([8, r + 21, 0]));
    for (const y of [14 + 5.5, 14 + 37.5])
      for (const z of [-16, 16]) b.add("fastener", chamferCyl(3.6, 2.4, 0.4, 6), M([bx + t / 2 + 1.1, y, z], AXIS_X));
    return b.build();
  });
}

/** 32 mm omni wheel + axle, centred on the axle (local Z). */
export function odoWheelGeometries() {
  return cachedGeo("odo-pod-wheel", () => {
    const b = new GeoBuilder();
    const r = POD_WHEEL_R;
    b.add("plasticDark", chamferCyl(r - 4, 14, 0.8, 20), M([0, 0, 0], AXIS_Z));
    const tyre: [number, number][] = [];
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const y = -7 + (i / n) * 14;
      const groove = Math.abs(y) < 0.9 ? 2 : 0;
      tyre.push([r - 0.6 - groove - Math.pow(Math.abs(y) / 7, 4) * 2.2, y]);
    }
    b.add("rubber", lathe([[r - 5, -7], ...tyre, [r - 5, 7]], 20), M([0, 0, 0], AXIS_Z));
    // spoke marks so the spin reads
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      b.add("aluminium", box(2, 7, 0.6), M([Math.cos(a) * 5, Math.sin(a) * 5, 7.1], [0, 0, a + Math.PI / 2]));
    }
    b.add("steel", cyl(2, 22, 8), M([0, 0, 0], AXIS_Z));
    return b.build();
  });
}

export function OdoPod({ rigName, ...props }: Omit<ThreeElements["group"], "children"> & { rigName?: string }) {
  const body = useMemo(() => odoPodGeometries(), []);
  const wheel = useMemo(() => odoWheelGeometries(), []);
  const spin = useRigRef<THREE.Group>(rigName ?? "__unused");
  return (
    <group {...props}>
      <RoleMeshes geos={body} skipEdges={["fastener", "steel", "nylonWhite"]} />
      <group position={[0, POD_WHEEL_R * 0.001, 0]}>
        <group ref={rigName ? spin : undefined}>
          <RoleMeshes geos={wheel} skipEdges={["steel", "aluminium"]} />
        </group>
      </group>
    </group>
  );
}
