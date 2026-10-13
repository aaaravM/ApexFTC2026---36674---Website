"use client";

import * as THREE from "three";
import { useRigRef } from "../context";
import { DERIVED, FRAME, TURRET } from "../dimensions";
import { AssemblyBuilder, cachedAssembly, inMetres, Mm, StaticAssembly } from "../assembly";
import { circlePath, extrude, polyShape, rbox, roundedRectPath, setPlateMask } from "../geometry";
import { fastenerHead } from "../parts/Fasteners";
import { HitProxy, type ProxyBox } from "../parts/PartMesh";
import { fixedRingGeometries, PINION_CENTRE_MM, TurretPinion, turretRotorGeometries } from "../parts/TurretRing";
import { channelGeometry } from "../parts/UChannel";
import { motorGeometries } from "../parts/YellowJacketMotor";
import { basisEuler, rmm, SHAFT } from "./util";

/**
 * Turret: four vertical 1120 posts (rear pair on the deck, front pair on the rails) carry a 4 mm
 * pattern plate with the lazy-susan ring and the pinion motor (5203 19.2:1 hanging underneath).
 * The 100 T ring gear + platform rotate with the turret; the 20 T pinion gives the team's G = 5
 * reduction (TICKS_PER_RAD = 427.9). A stop block behind the axis makes ±170° a mechanical limit too.
 */
const AX = TURRET.axisXmm;
const PIN_ANGLE = (TURRET.pinionAngleDeg * Math.PI) / 180;
export const PINION_AT: [number, number] = [AX + PINION_CENTRE_MM * Math.cos(PIN_ANGLE), PINION_CENTRE_MM * Math.sin(PIN_ANGLE)];
const PLATE_Z = TURRET.basePlateZmm;
const PLATE_TOP = PLATE_Z + TURRET.basePlateThicknessMm;
const RAIL_TOP = FRAME.railBottomZmm + 48;
const DECK_TOP = RAIL_TOP + FRAME.deckThicknessMm;
const [REAR_X, FRONT_X] = TURRET.postXmm;
const PY = TURRET.postYmm;
/** Plate outline (robot x): back edge, front edge between the intake plates, front "ears" over the posts. */
const PLATE_BACK = REAR_X - 24;
const PLATE_FRONT = 140;
const EAR_FRONT = FRONT_X + 24;
/** Hole where the service loop passes up from the hubs (behind the axis). */
export const SERVICE_HOLE: [number, number] = [AX - TURRET.serviceLoopRadiusMm, 0];

/** Plan-view shape (shape x = robot y, shape y = robot x) → three.js, thickness along Y. */
function planBasis(x: number, y: number, z: number) {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0));
  m.setPosition(x, y, z);
  return m;
}

function basePlateGeometry() {
  const c = 7; // corner chamfer
  const s = polyShape([
    [-180 + c, PLATE_BACK],
    [180 - c, PLATE_BACK],
    [180, PLATE_BACK + c],
    [180, EAR_FRONT - c],
    [180 - c, EAR_FRONT],
    [128 + c, EAR_FRONT],
    [128, EAR_FRONT - c],
    [128, PLATE_FRONT],
    [-128, PLATE_FRONT],
    [-128, EAR_FRONT - c],
    [-128 - c, EAR_FRONT],
    [-180 + c, EAR_FRONT],
    [-180, EAR_FRONT - c],
    [-180, PLATE_BACK + c],
  ]);
  s.holes.push(circlePath(0, AX, 58));
  s.holes.push(circlePath(PINION_AT[1], PINION_AT[0], 9.5));
  s.holes.push(circlePath(SERVICE_HOLE[1], SERVICE_HOLE[0], 8));
  // lightening windows: the plate is a frame round the ring, so the lift, servos and hubs show
  for (const sy of [-1, 1]) {
    s.holes.push(roundedRectPath(new THREE.Path(), 42, 100, 10, sy * 139, 42));
    s.holes.push(roundedRectPath(new THREE.Path(), 72, 36, 9, sy * 72, -40));
  }
  const g = extrude(s, TURRET.basePlateThicknessMm, 0.5, 8);
  // ExtrudeGeometry cap UVs are the shape coordinates (mm) → 24 mm goBILDA grid cells,
  // offset so a bore lands on the turret axis.
  const uv = g.getAttribute("uv");
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(nor.getZ(i)) > 0.9) uv.setXY(i, (pos.getX(i) - 12) / 24, (pos.getY(i) - AX - 12) / 24);
    else uv.setXY(i, 2 / 24, 1 - 8 / 24); // walls/bevels: a solid spot of the grid texture
  }
  // solid border along the outer edges (front edge between the intake plates included)
  setPlateMask(g, -180 - 12, PLATE_BACK - AX - 12, 180 - 12, PLATE_FRONT - AX - 12);
  g.scale(0.001, 0.001, 0.001);
  return g;
}

function screw(b: AssemblyBuilder, p: [number, number, number], up = true) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, up ? 1 : -1, 0));
  b.add("fastener", fastenerHead("bhcs"), new THREE.Matrix4().compose(new THREE.Vector3(...p), q, new THREE.Vector3(1, 1, 1)));
}

const buildFixed = cachedAssembly("turret-fixed-v2", () => {
  const b = new AssemblyBuilder();
  b.add("gridPlate", basePlateGeometry(), planBasis(0, (PLATE_Z + TURRET.basePlateThicknessMm / 2) * 0.001, 0));
  // 1120 posts, open side facing the robot centre (webs flush with the rails' webs)
  for (const s of [-1, 1]) {
    for (const [x, z0] of [
      [REAR_X, DECK_TOP],
      [FRONT_X, RAIL_TOP],
    ] as [number, number][]) {
      const len = PLATE_Z - z0;
      b.add("channel", inMetres(channelGeometry(len)), Mm(rmm(x, s * PY, z0 + len / 2), basisEuler([0, 1, 0], [-s, 0, 0])));
      // screws through the plate into the post's flanges
      for (const dx of [-16, 16]) screw(b, rmm(x + dx, s * (PY + 20), PLATE_TOP));
    }
  }
  b.addPart(fixedRingGeometries(), Mm(rmm(AX, 0, PLATE_TOP)));
  // pinion motor hangs under the plate, shaft up through it
  b.addPart(motorGeometries("2stage"), Mm(rmm(PINION_AT[0], PINION_AT[1], PLATE_Z), SHAFT.up));
  for (const [dx, dy] of [
    [-8, -8],
    [-8, 8],
    [8, -8],
    [8, 8],
  ])
    screw(b, rmm(PINION_AT[0] + dx * 1.6, PINION_AT[1] + dy * 1.6, PLATE_TOP));
  // stop block behind the axis (rubber-faced), meets the platform tab at ±172°
  const [r0, r1] = TURRET.stopRadiusMm;
  const blockH = DERIVED.platformTopZmm + 3 - PLATE_TOP;
  const block = rbox(14, blockH, r1 - r0, 1.5, 2);
  block.scale(0.001, 0.001, 0.001);
  b.add("plasticAccent", block, Mm(rmm(AX - (r0 + r1) / 2, 0, PLATE_TOP + blockH / 2)));
  const bump = rbox(15, 9, 3, 1, 2);
  bump.scale(0.001, 0.001, 0.001);
  b.add("rubber", bump, Mm(rmm(AX - r0 + 1, 0, DERIVED.platformZmm + 2)));
  screw(b, rmm(AX - (r0 + r1) / 2, 0, PLATE_TOP + blockH));
  // cable clamp where the service loop leaves the plate
  const clamp = rbox(14, 6, 12, 1.5, 2);
  clamp.scale(0.001, 0.001, 0.001);
  b.add("plasticDark", clamp, Mm(rmm(SERVICE_HOLE[0] + 2, -13, PLATE_TOP + 3)));
  screw(b, rmm(SERVICE_HOLE[0] + 2, -13, PLATE_TOP + 6));
  return b.build();
});

const buildRotor = cachedAssembly("turret-rotor-asm-v2", () => {
  const b = new AssemblyBuilder();
  b.addPart(turretRotorGeometries(), Mm(rmm(0, 0, DERIVED.gearZmm)));
  return b.build();
});

const PROXY: readonly ProxyBox[] = [
  [PLATE_BACK, PLATE_FRONT, -180, 180, PLATE_Z, PLATE_TOP],
  [REAR_X - 24, REAR_X + 24, 132, 180, DECK_TOP, PLATE_Z],
  [REAR_X - 24, REAR_X + 24, -180, -132, DECK_TOP, PLATE_Z],
  [FRONT_X - 24, FRONT_X + 24, 132, 180, RAIL_TOP, PLATE_Z],
  [FRONT_X - 24, FRONT_X + 24, -180, -132, RAIL_TOP, PLATE_Z],
  [AX - 72, AX + 72, -72, 108, PLATE_Z - 116, PLATE_TOP + 10],
];
const ROTOR_PROXY: readonly ProxyBox[] = [[-86, 100, -86, 86, DERIVED.gearZmm, DERIVED.platformTopZmm]];

/** Parts of the turret that stay with the chassis. */
export function TurretFixed() {
  const anchor = useRigRef<THREE.Object3D>("anchor.turret");
  return (
    <>
      <StaticAssembly build={buildFixed} skipEdges={["fastener"]} />
      <TurretPinion rigName="pinion" position={rmm(PINION_AT[0], PINION_AT[1], DERIVED.gearZmm)} />
      <HitProxy boxes={PROXY} />
      <object3D ref={anchor} position={rmm(AX + 78, -30, DERIVED.gearZmm + 6)} />
    </>
  );
}

/** Ring gear + platform: render inside the turret-yaw group (origin on the turret axis). */
export function TurretRotating() {
  return (
    <>
      <StaticAssembly build={buildRotor} skipEdges={["fastener"]} edgeThreshold={40} />
      <HitProxy boxes={ROTOR_PROXY} />
    </>
  );
}
