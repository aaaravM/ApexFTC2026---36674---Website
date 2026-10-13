"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useRigRef } from "../context";
import { CAMERA_MODEL, DRIVE, FRAME, HUB, TURRET } from "../dimensions";
import { AssemblyBuilder, cachedAssembly, Mm, StaticAssembly } from "../assembly";
import { box, rbox } from "../geometry";
import { batteryGeometries } from "../parts/Battery";
import { CableHarness, type CableSpec } from "../parts/Cable";
import { hubGeometries } from "../parts/ControlHub";
import { standoffGeometries } from "../parts/Fasteners";
import { HitProxy, PartMesh, type ProxyBox } from "../parts/PartMesh";
import { powerSwitchGeometries } from "../parts/PowerSwitch";
import { DRIVE_MOTOR_FACE_X } from "./Drivetrain";
import { INTAKE_BAR } from "./Intake";
import { LIFT_PULLEYS } from "./Hopper";
import { PINION_AT, SERVICE_HOLE } from "./Turret";
import { basisEuler, rmm, rpts } from "./util";

/**
 * Electronics: REV Control Hub with the Expansion Hub stacked on standoffs above it, the 12 V NiMH
 * battery strapped into the back cross member, the main power switch on the back, and the wiring,
 * terminated per the team's 2026-10-11 rewire (README-rewire.md):
 *   Expansion  motor 1 leftfront · motor 2 intakemain · motor 3 leftback · servo 5 leftintake
 *   Control    motor 0 rightback · motor 1 rightfront · motor 3 Flywheel · servo 1 rightintake
 *              I2C bus 1 odomcomp (Pinpoint; bus 0 is the built-in IMU)
 *   not configured yet (free ports): turret → Control motor 2, feeder → Control servo 0,
 *              ball_color → Control I2C bus 2; Webcam 1 → Control USB 2.0
 * Hubs are turned so their motor ports face forward; labels read from behind the robot.
 */
export const HUB_AT = { x: -104, y: 0, zCH: 85, zEH: 85 + HUB.heightMm + HUB.stackGapMm };
const BATTERY_AT: [number, number, number] = [FRAME.backCrossXmm, -20, 76 + 2.5];
const SWITCH_AT: [number, number, number] = [FRAME.backCrossXmm - 24, 95, 100];

const mmBox = (x: number, y: number, z: number, r = 0) => {
  const g = r > 0 ? rbox(x, y, z, r, 2) : box(x, y, z);
  g.scale(0.001, 0.001, 0.001);
  return g;
};

const build = cachedAssembly("electronics-v2", () => {
  const b = new AssemblyBuilder();
  b.addPart(hubGeometries("control"), Mm(rmm(HUB_AT.x, HUB_AT.y, HUB_AT.zCH)));
  b.addPart(hubGeometries("expansion"), Mm(rmm(HUB_AT.x, HUB_AT.y, HUB_AT.zEH)));
  // stand-offs: deck → Control Hub (6 mm) and Control Hub → Expansion Hub
  const corners: [number, number][] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) corners.push([HUB_AT.x + sx * 45.5, sy * 65.5]);
  b.addPart(
    standoffGeometries([
      ...corners.map(([x, y]) => ({ a: rmm(x, y, 79), b: rmm(x, y, HUB_AT.zCH) })),
      ...corners.map(([x, y]) => ({ a: rmm(x, y, HUB_AT.zCH + HUB.heightMm + 1.6), b: rmm(x, y, HUB_AT.zEH) })),
    ]),
  );
  b.addPart(batteryGeometries(), Mm(rmm(...BATTERY_AT)));
  // two hook-and-loop straps round the battery and the back cross member, with buckles on top
  for (const y of [BATTERY_AT[1] - 34, BATTERY_AT[1] + 34]) {
    const x0 = FRAME.backCrossXmm;
    const top = BATTERY_AT[2] + 47.8 + 0.7;
    b.add("belt", mmBox(20, 1.4, 50.6), Mm(rmm(x0, y, top)));
    b.add("belt", mmBox(20, 1.4, 50.6), Mm(rmm(x0, y, 75.3)));
    b.add("belt", mmBox(20, top - 75.3, 1.4), Mm(rmm(x0 + 24.9, y, (top + 75.3) / 2)));
    b.add("belt", mmBox(20, top - 75.3, 1.4), Mm(rmm(x0 - 24.9, y, (top + 75.3) / 2)));
    b.add("plasticDark", mmBox(24, 4, 12, 1), Mm(rmm(x0 + 6, y, top + 2)));
  }
  // main switch on the back face, rocker facing back
  b.addPart(powerSwitchGeometries(), Mm(rmm(...SWITCH_AT), basisEuler([1, 0, 0], [0, 0, -1])));
  // inline 20 A mini-blade fuse holder on the battery lead
  b.add("plasticDark", mmBox(10, 9, 26, 2), Mm(rmm(FRAME.backCrossXmm, -96, 128.5)));
  b.add("nylonYellow", mmBox(5, 4, 10, 0.8), Mm(rmm(FRAME.backCrossXmm, -96, 134.5)));
  return b.build();
});

// ------------------------------------------------------------------------------------------------
// Wiring
// ------------------------------------------------------------------------------------------------
const P = (pts: [number, number, number][]) => rpts(pts);
const camX = CAMERA_MODEL.xIn * 25.4;
const camZ = CAMERA_MODEL.zIn * 25.4;
const zCH = HUB_AT.zCH;
const zEH = HUB_AT.zEH;
/** Hub port positions (robot mm). Motor ports face forward (x = −53.5), servo headers face back. */
const motorPort = (z0: number, i: number): [number, number, number] => [HUB_AT.x + 50.5, -46 + 21 * i, z0 + 20];
const encPort = (z0: number, i: number): [number, number, number] => [HUB_AT.x + 49.3, -44 + 21 * i, z0 + 26.5];
const servoPort = (z0: number, i: number): [number, number, number] => [HUB_AT.x - 48.5, -48 + 12 * i, z0 + 28.4];
const i2cPort = (z0: number, bus: number): [number, number, number] => [HUB_AT.x + 49.3, 27 + 7.5 * bus, z0 + 26.5];

/** Riser between the hub stack's front face and the lift servos (x ≈ −40). */
function toHubFront(start: [number, number, number][], port: [number, number, number]): [number, number, number][] {
  const last = start[start.length - 1];
  return [
    ...start,
    [-34, last[1] * 0.55 + port[1] * 0.45, Math.max(88, Math.min(last[2], port[2]) - 4)],
    [-44, port[1], port[2] - 6],
    [port[0] + 0.5, port[1], port[2]],
  ];
}

/** A drive motor's power pair + encoder lead from its encoder end (inside the rail) to a hub port. */
function driveLeads(sx: number, sz: number, z0: number, port: number): CableSpec[] {
  const ex = sz * (DRIVE_MOTOR_FACE_X - 116.6) - sz * 3;
  const y = sx * FRAME.railCentreYmm;
  const out: [number, number, number][] = [
    [ex, y - sx * 4, 50],
    [ex - sz * 4, sx * 128, 60],
    [sz > 0 ? 6 : -30, sx * 112, 82],
  ];
  return [
    { points: P(toHubFront(out, motorPort(z0, port))), radius: 1.15, role: "cableRed", pairWith: "cableBlack", ties: [0.3] },
    {
      points: P(toHubFront(out.map(([x, yy, z]) => [x + sz * 2, yy - sx * 5, z + 3] as [number, number, number]), encPort(z0, port))),
      radius: 1.3,
    },
  ];
}

const lift = LIFT_PULLEYS.high;
const CABLES: CableSpec[] = [
  // battery → fuse → main switch (16 AWG pair over the back cross member)
  {
    points: P([
      [-176, -84, 110],
      [-172, -92, 124],
      [-168, -96, 130],
      [-192, -96, 131],
      [-196, -40, 132],
      [-200, 40, 132],
      [-212, 88, 116],
    ]),
    radius: 1.35,
    role: "cableRed",
    pairWith: "cableBlack",
    ties: [0.35, 0.72],
  },
  // switch → Control Hub XT30 (+y end of the hub)
  {
    points: P([
      [-214, 104, 112],
      [-196, 112, 124],
      [-150, 92, 110],
      [-128, 80, 102],
      [-126, 75, 101],
    ]),
    radius: 1.35,
    role: "cableRed",
    pairWith: "cableBlack",
    ties: [0.45],
  },
  // XT30 jumper Control Hub → Expansion Hub
  {
    points: P([
      [-110, 76, 101],
      [-108, 92, 120],
      [-112, 92, 144],
      [-126, 76, 158],
    ]),
    radius: 1.2,
    role: "cableRed",
    pairWith: "cableBlack",
  },
  // RS485 link
  {
    points: P([
      [-90, 75, 101],
      [-86, 88, 128],
      [-90, 75, 158],
    ]),
    radius: 1.1,
  },
  // drivetrain: left side on the Expansion Hub, right side on the Control Hub
  ...driveLeads(1, 1, zEH, 1), // leftfront → EH motor 1
  ...driveLeads(1, -1, zEH, 3), // leftback → EH motor 3
  ...driveLeads(-1, -1, zCH, 0), // rightback → CH motor 0
  ...driveLeads(-1, 1, zCH, 1), // rightfront → CH motor 1
  // intakemain → EH motor 2: between the motor and the top bar, out through the right plate,
  // down between the plate and the belt, back along the inside of the right rail
  {
    points: P(
      toHubFront(
        [
          [INTAKE_BAR.x - 2, -4, 202],
          [INTAKE_BAR.x - 2, -40, 219.5],
          [INTAKE_BAR.x - 4, -118, 219.5],
          [198, -129, 214],
          [176, -129, 176],
          [166, -128.5, 140],
          [150, -128, 92],
          [96, -128, 82],
          [20, -122, 84],
        ],
        motorPort(zEH, 2),
      ),
    ),
    radius: 1.15,
    role: "cableRed",
    pairWith: "cableBlack",
    ties: [0.42, 0.56, 0.7],
  },
  // turret motor (hangs under the base plate on the left) → CH motor 2
  {
    points: P(
      toHubFront(
        [
          [PINION_AT[0] - 6, PINION_AT[1] - 4, 64],
          [PINION_AT[0] - 20, PINION_AT[1] - 6, 66],
          [6, 76, 82],
        ],
        motorPort(zCH, 2),
      ),
    ),
    radius: 1.15,
    role: "cableRed",
    pairWith: "cableBlack",
    ties: [0.4],
  },
  // lift servos: leftintake → EH servo 5 (round the +y end), rightintake → CH servo 1 (round the −y end)
  {
    points: P([
      [lift[0] - 52, 44, lift[1] - 52],
      [-30, 70, 132],
      [-70, 82, 166],
      [-130, 82, 176],
      [-156, 40, 175],
      [servoPort(zEH, 5)[0] - 0.5, servoPort(zEH, 5)[1], servoPort(zEH, 5)[2]],
    ]),
    radius: 1.0,
    ties: [0.5],
  },
  {
    points: P([
      [lift[0] - 52, -44, lift[1] - 52],
      [-30, -72, 118],
      [-80, -82, 118],
      [-140, -78, 118],
      [-158, -50, 116],
      [servoPort(zCH, 1)[0] - 0.5, servoPort(zCH, 1)[1], servoPort(zCH, 1)[2]],
    ]),
    radius: 1.0,
    ties: [0.5],
  },
  // Webcam 1 USB → Control Hub USB 2.0 (−y end): down the mast, over the left plate, back along the
  // inside of the left rail, across the deck in front of the hub stack
  {
    points: P([
      [camX - 18, 22, camZ - 18],
      [camX - 16, 22, INTAKE_BAR.z1 + 4],
      [INTAKE_BAR.x, 60, INTAKE_BAR.z1 + 2],
      [INTAKE_BAR.x - 2, 124, INTAKE_BAR.z1 + 3],
      [196, 129, 214],
      [170, 129, 150],
      [150, 128, 92],
      [80, 128, 82],
      [-10, 118, 84],
      [-46, 80, 84],
      [-48, -80, 86],
      [-96, -86, 92],
      [-124, -76, 100],
    ]),
    radius: 1.8,
    ties: [0.2, 0.42, 0.62, 0.8],
  },
  // service bundle (Flywheel, feeder, ball_color) from the base-plate hole down to the hubs
  {
    points: P([
      [SERVICE_HOLE[0], 0, TURRET.basePlateZmm + 2],
      [SERVICE_HOLE[0] - 2, 2, 166],
      [-42, 6, 140],
      [-48, 10, 122],
    ]),
    radius: 3.2,
    role: "cableSleeve",
    ties: [0.5],
  },
  { points: P(toHubFront([[-48, 12, 120]], motorPort(zCH, 3))), radius: 1.15, role: "cableRed", pairWith: "cableBlack" },
  { points: P(toHubFront([[-48, 10, 118]], i2cPort(zCH, 2))), radius: 1.1 },
  {
    points: P([
      [-48, 6, 118],
      [-50, -30, 120],
      [-58, -76, 122],
      [-150, -80, 120],
      [-158, -56, 116],
      [servoPort(zCH, 0)[0] - 0.5, servoPort(zCH, 0)[1], servoPort(zCH, 0)[2]],
    ]),
    radius: 1.0,
  },
];

export function Electronics() {
  const anchor = useRigRef<THREE.Object3D>("anchor.electronics");
  return (
    <>
      <StaticAssembly build={build} skipEdges={["fastener", "nylonWhite", "nylonYellow", "led", "cableRed", "belt"]} />
      <HitProxy boxes={PROXY} />
      <object3D ref={anchor} position={rmm(HUB_AT.x, 0, HUB_AT.zEH + HUB.heightMm + 6)} />
    </>
  );
}

const PROXY: readonly ProxyBox[] = [
  [HUB_AT.x - 52, HUB_AT.x + 52, -72, 72, 79, HUB_AT.zEH + HUB.heightMm],
  [FRAME.backCrossXmm - 25, FRAME.backCrossXmm + 25, -84, 44, 76, 128],
  [SWITCH_AT[0] - 20, SWITCH_AT[0], 75, 115, 85, 122],
];

// ------------------------------------------------------------------------------------------------
// Turret service loop: the bundle leaves the base plate behind the axis and wraps round the fixed
// ring as the turret turns (the reason travel is limited to ±170°). Rebuilt in place when the yaw
// changes; rides with the harness.
// ------------------------------------------------------------------------------------------------
const LOOP_SEGMENTS = 64;
const LOOP_RADIAL = 6;
const LOOP_R = TURRET.serviceLoopRadiusMm;
const LOOP_Z = TURRET.basePlateZmm + TURRET.basePlateThicknessMm + 3.4;

/** Service-loop centreline (three metres) for a turret yaw (radians). */
export function serviceLoopPoints(yaw: number) {
  const ax = TURRET.axisXmm;
  const pts: THREE.Vector3[] = [];
  const at = (r: number, a: number, z: number) => {
    pts.push(new THREE.Vector3(r * Math.sin(a) * 0.001, z * 0.001, (ax + r * Math.cos(a)) * 0.001));
  };
  const a0 = Math.PI; // behind the axis
  pts.push(new THREE.Vector3(SERVICE_HOLE[1] * 0.001, (TURRET.basePlateZmm - 6) * 0.001, SERVICE_HOLE[0] * 0.001));
  at(LOOP_R, a0, LOOP_Z - 1);
  // a little slack bulge first, then the wrap
  const n = Math.max(2, Math.ceil(Math.abs(yaw) / 0.2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + yaw * t + Math.sign(yaw || 1) * 0.12 * Math.sin(Math.PI * t);
    at(LOOP_R + 2.5 * Math.sin(Math.PI * t), a, LOOP_Z);
  }
  // rise to the platform's pass-through (turret frame (−75, 0))
  const a1 = a0 + yaw;
  at(LOOP_R - 2, a1 + Math.sign(yaw || 1) * 0.05, LOOP_Z + 7);
  at(75, a1, TURRET.basePlateZmm + 24);
  at(75, a1, TURRET.basePlateZmm + 34);
  return pts;
}

/** Fixed-topology tube rebuilt in place. */
function writeTube(geo: THREE.BufferGeometry, pts: THREE.Vector3[], radius: number) {
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const tube = new THREE.TubeGeometry(curve, LOOP_SEGMENTS, radius, LOOP_RADIAL, false);
  const p = geo.getAttribute("position") as THREE.BufferAttribute;
  const n = geo.getAttribute("normal") as THREE.BufferAttribute;
  (p.array as Float32Array).set(tube.getAttribute("position").array as Float32Array);
  (n.array as Float32Array).set(tube.getAttribute("normal").array as Float32Array);
  p.needsUpdate = true;
  n.needsUpdate = true;
  geo.computeBoundingSphere();
  tube.dispose();
}

function ServiceLoop() {
  const holder = useRigRef<THREE.Object3D>("serviceLoop");
  const geo = useMemo(() => {
    const t = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(serviceLoopPoints(0)), LOOP_SEGMENTS, 0.0032, LOOP_RADIAL, false);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute((t.getAttribute("position").array as Float32Array).slice(), 3));
    g.setAttribute("normal", new THREE.BufferAttribute((t.getAttribute("normal").array as Float32Array).slice(), 3));
    g.setAttribute("uv", new THREE.BufferAttribute((t.getAttribute("uv").array as Float32Array).slice(), 2));
    g.setIndex(t.getIndex()!.clone());
    t.dispose();
    return g;
  }, []);
  const last = useRef(0);
  const obj = useRef<THREE.Object3D>(null);
  useEffect(() => {
    const o = obj.current;
    if (!o) return;
    o.userData.setYaw = (yaw: number) => {
      if (Math.abs(yaw - last.current) < 0.004) return;
      last.current = yaw;
      writeTube(geo, serviceLoopPoints(yaw), 0.0032);
    };
  }, [geo]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <object3D
      ref={(o) => {
        obj.current = o;
        holder(o);
      }}
    >
      <PartMesh geometry={geo} role="cableSleeve" edges={false} frustumCulled={false} />
    </object3D>
  );
}

/** All wiring that crosses subsystems; fades out as the robot explodes. */
export function ElectronicsHarness() {
  const ref = useRigRef<THREE.Group>("harness");
  return (
    <group ref={ref}>
      <CableHarness cables={CABLES} />
      <ServiceLoop />
    </group>
  );
}

/** Wheel radius, exported for the rig's odometry-pod maths. */
export const WHEEL_R_M = DRIVE.wheelDiameterMm / 2 / 1000;
