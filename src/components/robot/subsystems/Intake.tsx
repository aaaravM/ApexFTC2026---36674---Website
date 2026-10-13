"use client";

import * as THREE from "three";
import { useRigRef } from "../context";
import { FRAME, INTAKE } from "../dimensions";
import { AssemblyBuilder, cachedAssembly, inMetres, Mm, StaticAssembly } from "../assembly";
import { box, chamferCyl, circlePath, cyl, extrude, polyShape, rbox, ring, slotPath } from "../geometry";
import { beltGeometries, Pulley } from "../parts/Belt";
import { fastenerHead } from "../parts/Fasteners";
import { FlapRoller } from "../parts/FlapRoller";
import { sideViewBasis } from "../parts/Hood";
import { HitProxy, type ProxyBox } from "../parts/PartMesh";
import { motorGeometries } from "../parts/YellowJacketMotor";
import { rdir, rmm, SHAFT } from "./util";

/**
 * Intake (RobotConstants "intakemain"): printed side plates just inside the rails, braced to the
 * rails' top flanges; a full-width roller with long silicone flaps (it reaches a POLLEN on the tiles
 * and gives way for NECTAR); a 5203 (5.2:1) mounted above the front of the roller INSIDE the plates,
 * driving it through a 1:1 GT2 belt on the outside of the right plate; a printed bar across the
 * plate tops that also carries the webcam mast.
 */
export const RX = INTAKE.rollerXmm;
export const RZ = INTAKE.rollerZmm;
const PLATE_IN = INTAKE.plateInnerYmm; // 120
const PLATE_T = INTAKE.plateThicknessMm;
const PLATE_OUT = PLATE_IN + PLATE_T; // 126
const PLATE_Y = PLATE_IN + PLATE_T / 2;
const MX = INTAKE.motorXmm;
const MZ = INTAKE.motorZmm;
/** Belt plane, outboard of the right plate (pulley hubs face outward). */
export const INTAKE_BELT_Y = -(PLATE_OUT + 10);
const RAIL_TOP = FRAME.railBottomZmm + 48;
/** Top bar across the plates (the webcam mast stands on it). */
export const INTAKE_BAR = { x: 207, z0: 222, z1: 232, depth: 20 } as const;

function plateGeometry() {
  const s = polyShape([
    [136, 44],
    [146, 20],
    [163, 8],
    [200, 8],
    [216, 15],
    [226, 34],
    [227, 200],
    [225, 226],
    [218, 233],
    [195, 233],
    [186, 226],
    [176, 206],
    [158, 194],
    [145, 174],
    [136, 148],
  ]);
  s.holes.push(circlePath(RX, RZ, 4.3));
  s.holes.push(circlePath(MX, MZ, 6.5));
  s.holes.push(slotPath(150, 66, 150, 128, 5.5));
  s.holes.push(slotPath(184, 30, 206, 30, 6));
  s.holes.push(circlePath(212, 150, 9));
  // grommet hole for the motor lead
  s.holes.push(circlePath(201, 216.5, 3.5));
  const g = extrude(s, PLATE_T, 0.8, 8);
  g.scale(0.001, 0.001, 0.001);
  return g;
}

function screwAt(b: AssemblyBuilder, p: [number, number, number], n: [number, number, number]) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...n).normalize());
  b.add("fastener", fastenerHead("bhcs"), new THREE.Matrix4().compose(new THREE.Vector3(...p), q, new THREE.Vector3(1, 1, 1)));
}

const mm = (g: THREE.BufferGeometry) => {
  g.scale(0.001, 0.001, 0.001);
  return g;
};

const build = cachedAssembly("intake-v2", () => {
  const b = new AssemblyBuilder();
  const plate = plateGeometry();
  for (const s of [-1, 1]) b.add("plasticAccent", plate, sideViewBasis(s * PLATE_Y * 0.001, 0, 0));
  // flanged bearings for the roller shaft on both plates
  const brg = inMetres(ring(4.2, 9.5, 3, 24, 0.4));
  for (const s of [-1, 1]) b.add("steel", brg, Mm(rmm(RX, s * (PLATE_OUT + 1.5), RZ), [0, 0, Math.PI / 2]));
  // printed L-brackets: plate outer face → rail top flange (two per side)
  for (const s of [-1, 1]) {
    for (const x of [182, 210]) {
      b.add("plasticDark", mm(rbox(3, 26, 22, 0.8, 2)), Mm(rmm(x, s * (PLATE_OUT + 1.5), RAIL_TOP + 3 + 13)));
      b.add("plasticDark", mm(rbox(34, 3, 22, 0.8, 2)), Mm(rmm(x, s * (PLATE_OUT + 17), RAIL_TOP + 1.5)));
      screwAt(b, rmm(x, s * (PLATE_OUT + 3.1), RAIL_TOP + 20), rdir(0, s, 0));
      screwAt(b, rmm(x, s * 152, RAIL_TOP + 3.1), rdir(0, 0, 1));
    }
  }
  // top bar across the plates
  b.add("plasticAccent", mm(rbox(2 * PLATE_IN, INTAKE_BAR.z1 - INTAKE_BAR.z0, INTAKE_BAR.depth, 2, 2)), Mm(rmm(INTAKE_BAR.x, 0, (INTAKE_BAR.z0 + INTAKE_BAR.z1) / 2)));
  for (const s of [-1, 1]) screwAt(b, rmm(INTAKE_BAR.x, s * (PLATE_OUT + 0.1), (INTAKE_BAR.z0 + INTAKE_BAR.z1) / 2), rdir(0, s, 0));
  // hex stand-off tying the plates together in front of the motor
  b.add("aluminium", mm(cyl(4.6, 2 * PLATE_IN, 6)), Mm(rmm(222, 0, 172), [0, 0, Math.PI / 2]));
  for (const s of [-1, 1]) screwAt(b, rmm(222, s * (PLATE_OUT + 0.1), 172), rdir(0, s, 0));
  // intake motor: face on the inside of the right plate, shaft out through it to the belt pulley
  b.addPart(motorGeometries("1stage", 20), Mm(rmm(MX, -PLATE_IN, MZ), SHAFT.right));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    screwAt(b, rmm(MX + 11.3 * Math.cos(a), -(PLATE_OUT + 0.1), MZ + 11.3 * Math.sin(a)), rdir(0, -1, 0));
  }
  // 1:1 GT2 belt on the outside of the right plate
  b.addPart(beltGeometries([RX, RZ], 10, [MX, MZ], 10, 9), Mm(rmm(0, INTAKE_BELT_Y, 0)));
  // shaft collar on the free (left) end of the roller axle
  b.add("aluminium", inMetres(chamferCyl(7, 5, 0.6, 20)), Mm(rmm(RX, PLATE_OUT + 5.5, RZ), [0, 0, Math.PI / 2]));
  // belt guard tab (printed) between the pulleys
  b.add("plasticDark", mm(box(3, 10, 30)), Mm(rmm((RX + MX) / 2 + 10, -(PLATE_OUT + 1.5), (RZ + MZ) / 2 - 12), [0.0, 0, 0]));
  return b.build();
});

const PROXY: readonly ProxyBox[] = [[136, 227, -128, 128, 6, 234]];

export function Intake() {
  const anchor = useRigRef<THREE.Object3D>("anchor.intake");
  return (
    <>
      <StaticAssembly build={build} skipEdges={["fastener", "steel"]} />
      <FlapRoller
        rigName="intakeRoller"
        position={rmm(RX, 0, RZ)}
        length={2 * PLATE_IN - 4}
        wheels={7}
        wheelWidth={18}
        tipRadius={INTAKE.rollerFlapRadiusMm}
        coreRadius={INTAKE.rollerCoreRadiusMm}
        flaps={8}
      />
      <Pulley rigName="intakePulley" pitchR={10} width={9} position={rmm(RX, INTAKE_BELT_Y, RZ)} rotation={[0, 0, Math.PI]} />
      <Pulley rigName="intakeMotorPulley" pitchR={10} width={9} position={rmm(MX, INTAKE_BELT_Y, MZ)} rotation={[0, 0, Math.PI]} />
      <HitProxy boxes={PROXY} />
      <object3D ref={anchor} position={rmm(RX + 52, 70, RZ + 40)} />
    </>
  );
}
