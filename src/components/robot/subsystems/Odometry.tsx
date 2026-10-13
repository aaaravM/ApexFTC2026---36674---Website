"use client";

import { useMemo } from "react";
import type * as THREE from "three";
import { useRigRef } from "../context";
import { ODO } from "../dimensions";
import { AssemblyBuilder, cachedAssembly, Mm, StaticAssembly } from "../assembly";
import { box, type V3 } from "../geometry";
import { CableHarness, type CableSpec } from "../parts/Cable";
import { odoPodGeometries, odoWheelGeometries, POD_MOUNT_X, POD_WHEEL_R } from "../parts/OdoPod";
import { HitProxy, RoleMeshes, type ProxyBox } from "../parts/PartMesh";
import { pinpointGeometries } from "../parts/Pinpoint";
import { rmm, rpts } from "./util";

/**
 * Odometry: goBILDA Pinpoint + two 4-bar dead-wheel pods at the team's measured offsets
 * (RobotConstants.Odo): X pod 84 mm RIGHT of the tracking point, Y pod 168 mm BEHIND it.
 * The pod wheels spin from the chassis velocity the rig derives from the wheel speeds.
 */
export const X_POD: [number, number] = [-24 - POD_MOUNT_X, ODO.xPodOffsetMm]; // block bolts to the centre cross member
export const Y_POD: [number, number] = [ODO.yPodOffsetMm, ODO.yPodAlongYmm];
const PINPOINT_AT: [number, number, number] = [-40, -110, 79];
const X_ROT: V3 = [0, Math.PI / 2, 0];
const Y_ROT: V3 = [0, Math.PI, 0];

const build = cachedAssembly("odometry-v2", () => {
  const b = new AssemblyBuilder();
  const pod = odoPodGeometries();
  // X pod: rolls along robot x; block faces forward onto the centre cross member's web
  b.addPart(pod, Mm(rmm(X_POD[0], X_POD[1], 0), X_ROT));
  // Y pod: rolls along robot y; block hangs from a bracket under the back cross member
  b.addPart(pod, Mm(rmm(Y_POD[0], Y_POD[1], 0), Y_ROT));
  const by = Y_POD[1] + POD_MOUNT_X + 1.5;
  const m = (g: THREE.BufferGeometry, x: number, y: number, z: number) => b.add("aluminium", g, Mm(rmm(x, y, z)));
  m(scaleBox(3, 44, 62), Y_POD[0], by, 45);
  m(scaleBox(24, 44, 3), Y_POD[0], by + 10.5, 74.5);
  // Pinpoint on the deck, next to the right rear turret post
  b.addPart(pinpointGeometries(), Mm(rmm(...PINPOINT_AT)));
  return b.build();
});

/** Box in mm (x = robot y width, y = height, z = robot x depth) converted to metres. */
function scaleBox(wy: number, dx: number, hz: number) {
  const g = box(wy, hz, dx);
  g.scale(0.001, 0.001, 0.001);
  return g;
}

const PP = PINPOINT_AT;
/** The Pinpoint's three JST-PH connectors are on its front (+x) edge. */
const PP_PORT = (i: number): [number, number, number] => [PP[0] + 23, PP[1] - 8 + i * 8, PP[2] + 5];
const CABLES: CableSpec[] = [
  // X pod → Pinpoint (up beside the centre cross member, over the deck's front edge)
  {
    points: rpts([
      [X_POD[0] + 8, X_POD[1], 40],
      [-30, X_POD[1] - 6, 70],
      [-12, -112, 86],
      PP_PORT(0),
    ]),
    radius: 1.4,
    ties: [0.45],
  },
  // Y pod → Pinpoint (forward under the deck, up at the deck's front edge)
  {
    points: rpts([
      [Y_POD[0], Y_POD[1] - 8, 40],
      [-150, 10, 60],
      [-90, -80, 68],
      [-20, -104, 72],
      [-10, -110, 84],
      PP_PORT(1),
    ]),
    radius: 1.4,
    ties: [0.3, 0.6],
  },
  // Pinpoint → Control Hub I2C (bus 1: never bus 0, that is the built-in IMU)
  {
    points: rpts([
      PP_PORT(2),
      [-14, -96, 92],
      [-30, -10, 104],
      [-44, 30, 110],
      [-50, 40, 112],
    ]),
    radius: 1.4,
    ties: [0.5],
  },
];

function PodWheel({ name, at, rotation }: { name: string; at: [number, number]; rotation: V3 }) {
  const ref = useRigRef<THREE.Group>(name);
  const geos = useMemo(() => odoWheelGeometries(), []);
  return (
    <group position={rmm(at[0], at[1], POD_WHEEL_R)} rotation={rotation}>
      <group ref={ref} userData={{ spinner: true }}>
        <RoleMeshes geos={geos} skipEdges={["steel", "aluminium"]} />
      </group>
    </group>
  );
}

const PROXY: readonly ProxyBox[] = [
  [X_POD[0] - 30, X_POD[0] + 30, X_POD[1] - 24, X_POD[1] + 24, 0, 60],
  [Y_POD[0] - 24, Y_POD[0] + 24, Y_POD[1] - 30, Y_POD[1] + 30, 0, 76],
  [PP[0] - 22, PP[0] + 22, PP[1] - 21, PP[1] + 21, PP[2], PP[2] + 16],
];

export function Odometry() {
  const anchor = useRigRef<THREE.Object3D>("anchor.odometry");
  return (
    <>
      <StaticAssembly build={build} skipEdges={["fastener", "nylonWhite", "nylonYellow", "led", "steel"]} />
      <PodWheel name="odoWheel.x" at={X_POD} rotation={X_ROT} />
      <PodWheel name="odoWheel.y" at={Y_POD} rotation={Y_ROT} />
      <CableHarness cables={CABLES} />
      <HitProxy boxes={PROXY} />
      <object3D ref={anchor} position={rmm(X_POD[0], X_POD[1], 40)} />
    </>
  );
}
