"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { MOTOR } from "../dimensions";
import { AXIS_Z, box, cachedGeo, chamferCyl, cyl, GeoBuilder, lathe, M } from "../geometry";
import { RoleMeshes } from "./PartMesh";

export type GearboxType = "2stage" | "1stage" | "direct";

const GEARBOX_LEN: Record<GearboxType, number> = {
  "2stage": MOTOR.gearbox2StageMm,
  "1stage": MOTOR.gearbox1StageMm,
  direct: MOTOR.gearboxDirectMm,
};

/** Overall body length (mm) excluding the output shaft. */
export function motorLength(gearbox: GearboxType) {
  return GEARBOX_LEN[gearbox] + MOTOR.canLengthMm + MOTOR.encoderLengthMm;
}

const SEG = 28;

/**
 * goBILDA 5203 Yellow Jacket planetary gear motor [GB: Ø36 body, gearbox + 75 mm motor/encoder,
 * 8 mm REX shaft 23.5 mm long].
 * Local frame: output shaft along +Z, gearbox mounting face at z = 0, body extends toward −Z.
 * Three draw calls: metal gearbox + shaft, black can + encoder cap, yellow label band.
 */
export function motorGeometries(gearbox: GearboxType = "2stage", shaftLen: number = MOTOR.shaftLengthMm) {
  return cachedGeo(`yj2-${gearbox}-${shaftLen}`, () => {
    const r = MOTOR.diameterMm / 2; // 18
    const G = GEARBOX_LEN[gearbox];
    const C = MOTOR.canLengthMm;
    const E = MOTOR.encoderLengthMm;
    const b = new GeoBuilder();

    // ---- gearbox: lathe profile along +Y (rotated to +Z), from back (y=-G) to the face (y=0)
    const stages = gearbox === "2stage" ? [-G * 0.36, -G * 0.7] : gearbox === "1stage" ? [-G * 0.55] : [-G * 0.6];
    const prof: [number, number][] = [[0, -G - 0.01], [r - 0.6, -G], [r, -G + 0.6]];
    for (const s of stages) {
      prof.push([r, s - 1.2], [r - 0.45, s - 0.6], [r - 0.45, s + 0.6], [r, s + 1.2]);
    }
    // 37.5 mm mounting flange at the face, then the output boss
    prof.push([r, -3.2], [r + 0.75, -2.6], [r + 0.75, -0.6], [r - 0.4, 0], [9, 0], [8.4, 2.4], [6.5, 2.4], [6.5, 1.8], [0, 1.8]);
    b.add("gearbox", lathe(prof, SEG), M([0, 0, 0], AXIS_Z));
    // face fixing holes (dark) on the 16 mm square pattern
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      b.add("motorCan", cyl(1.6, 0.4, 8), M([8 * Math.SQRT2 * Math.cos(a), 8 * Math.SQRT2 * Math.sin(a), 0.05], AXIS_Z));
    }
    // 8 mm REX output shaft (round with a flat, approximated by a 12-gon)
    b.add("gearbox", cyl(MOTOR.shaftMm / 2, shaftLen, 12), M([0, 0, 2.4 + shaftLen / 2], AXIS_Z));

    // ---- can (black), slightly stepped where it meets the gearbox
    const z0 = -G;
    const can: [number, number][] = [
      [0, -C],
      [r - 1.4, -C],
      [r, -C + 1.4],
      [r, -1.2],
      [r - 0.8, -0.4],
      [r - 1.6, 0],
      [0, 0.01],
    ];
    b.add("motorCan", lathe(can, SEG), M([0, 0, z0], AXIS_Z));
    // label band (yellow), a touch proud of the can
    const bandW = C * 0.46;
    b.add("motorAccent", lathe([[r + 0.25, -bandW / 2], [r + 0.25, bandW / 2]], SEG), M([0, 0, z0 - C * 0.5], AXIS_Z));
    // ---- encoder cap
    const ez = z0 - C;
    const enc: [number, number][] = [
      [0, -E],
      [r - 3.2, -E],
      [r - 1.6, -E + 1.6],
      [r - 1.2, -1],
      [r - 0.4, 0],
      [0, 0.01],
    ];
    b.add("motorCan", lathe(enc, SEG), M([0, 0, ez], AXIS_Z));
    // JST-XH encoder connector + motor lead grommet on the back face
    b.add("motorCan", box(9, 5.5, 6), M([5.5, -6, ez - E - 2.6]));
    b.add("motorCan", chamferCyl(3.2, 4, 0.6, 12), M([-6, 2, ez - E - 1.8], AXIS_Z));
    return b.build();
  });
}

export type YellowJacketMotorProps = Omit<ThreeElements["group"], "children"> & {
  gearbox?: GearboxType;
  shaftLength?: number;
};

export function YellowJacketMotor({ gearbox = "2stage", shaftLength, ...group }: YellowJacketMotorProps) {
  const geos = useMemo(() => motorGeometries(gearbox, shaftLength), [gearbox, shaftLength]);
  return (
    <group {...group}>
      <RoleMeshes geos={geos} />
    </group>
  );
}
