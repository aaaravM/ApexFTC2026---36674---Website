"use client";

import type * as THREE from "three";
import { useRigRef } from "../context";
import { CAMERA_MODEL } from "../dimensions";
import { AssemblyBuilder, cachedAssembly, Mm, StaticAssembly } from "../assembly";
import { chamferCyl, rbox } from "../geometry";
import { HitProxy, type ProxyBox } from "../parts/PartMesh";
import { webcamGeometries } from "../parts/Webcam";
import { INTAKE_BAR } from "./Intake";
import { rmm } from "./util";

/**
 * Vision: "Webcam 1" on a short printed mast standing on the intake's top bar. Chassis-mounted and
 * facing forward at 10.5 in, as in RobotConstants.Camera (see CAMERA_MODEL for why it sits a little
 * further forward than the 5 in placeholder): everything here stays outside the turret's swept
 * circle. The group position of the lens is the camera mount.
 */
const LENS: [number, number, number] = [CAMERA_MODEL.xIn * 25.4, CAMERA_MODEL.yIn * 25.4, CAMERA_MODEL.zIn * 25.4];
const BAR_TOP = INTAKE_BAR.z1;
const MAST_Y = 8;

const mm = (g: THREE.BufferGeometry) => {
  g.scale(0.001, 0.001, 0.001);
  return g;
};

const build = cachedAssembly("vision-v2", () => {
  const b = new AssemblyBuilder();
  b.addPart(webcamGeometries(), Mm(rmm(...LENS)));
  const clipBottom = LENS[2] - 21;
  const mastX = LENS[0] - 10;
  const mastH = clipBottom - BAR_TOP;
  // printed mast + foot + hinge knuckle
  b.add("plasticAccent", mm(rbox(18, mastH, 14, 3, 3)), Mm(rmm(mastX, MAST_Y, BAR_TOP + mastH / 2)));
  b.add("plasticAccent", mm(rbox(44, 5, INTAKE_BAR.depth, 2, 2)), Mm(rmm(INTAKE_BAR.x, MAST_Y, BAR_TOP + 2.5)));
  b.add("plasticAccent", mm(chamferCyl(7, 20, 1, 20)), Mm(rmm(mastX, MAST_Y, clipBottom + 1), [0, 0, Math.PI / 2]));
  // gusset ribs on the mast foot
  for (const s of [-1, 1]) b.add("plasticAccent", mm(rbox(3, 12, 14, 1, 2)), Mm(rmm(mastX + 2, MAST_Y + s * 7.5, BAR_TOP + 9)));
  return b.build();
});

const PROXY: readonly ProxyBox[] = [[LENS[0] - 22, LENS[0] + 6, -30, 46, BAR_TOP, LENS[2] + 16]];

export function Vision() {
  const mount = useRigRef<THREE.Object3D>("cameraMount");
  const anchor = useRigRef<THREE.Object3D>("anchor.vision");
  return (
    <>
      <StaticAssembly build={build} skipEdges={["led"]} />
      <HitProxy boxes={PROXY} />
      <object3D ref={mount} position={rmm(...LENS)} />
      <object3D ref={anchor} position={rmm(LENS[0] + 6, LENS[1] + 30, LENS[2] + 16)} />
    </>
  );
}
