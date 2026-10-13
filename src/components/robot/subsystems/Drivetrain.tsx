"use client";

import * as THREE from "three";
import { useRigRef } from "../context";
import { CHANNEL, DRIVE, FRAME, SIGN } from "../dimensions";
import { AssemblyBuilder, cachedAssembly, inMetres, Mm, StaticAssembly } from "../assembly";
import { cachedGeo, chamferCyl, cyl, extrude, gearShape, ring, type V3 } from "../geometry";
import { fastenerHead } from "../parts/Fasteners";
import { MecanumWheel } from "../parts/MecanumWheel";
import { numberPlateGeometries } from "../parts/NumberPlate";
import { HitProxy, type ProxyBox } from "../parts/PartMesh";
import { channelGeometry, patternPlateGeometry } from "../parts/UChannel";
import { motorGeometries } from "../parts/YellowJacketMotor";
import { basisEuler, rdir, rmm, SHAFT } from "./util";

/**
 * Drivetrain — goBILDA Strafer Chassis Kit v7 (104 mm GripForce) [GB 3209-0001-0007]:
 * two 432 mm 1120 rails 312 mm apart (open side inward), a 264 mm centre cross member, wheels on a
 * 336 × 413.7 mm rectangle with 28 mm ground clearance. Each 5203 lies INSIDE its rail along x and
 * turns its wheel through a 1:1 steel miter pair, so the whole 264 mm between the rails is clear
 * for the intake and NECTAR. The front end is open; the back cross member is stacked on the rails
 * (the battery nests in it and the Y odometry pod hangs under it).
 */

/** Wheel corners: robot-frame signs (sx: +1 left, sz: +1 front), handedness = sx·sz (X from above). */
export const WHEELS = [
  { id: "fl", sx: 1, sz: 1 },
  { id: "fr", sx: -1, sz: 1 },
  { id: "bl", sx: 1, sz: -1 },
  { id: "br", sx: -1, sz: -1 },
] as const;

export const AXLE_Z = FRAME.railBottomZmm + CHANNEL.outerMm / 2; // 52
const RAIL_Y = FRAME.railCentreYmm; // 156
const RAIL_TOP = FRAME.railBottomZmm + CHANNEL.outerMm; // 76
const WEB_INNER_Y = FRAME.railOuterYmm - CHANNEL.wallMm; // 177.5
const MITER_R = FRAME.miterPitchRadiusMm;
/** Motor gearbox face (x, mm): output shaft runs through the motor-side miter gear. */
export const DRIVE_MOTOR_FACE_X = DRIVE.wheelXmm - MITER_R - 12.5; // 143
const DECK_Z = RAIL_TOP + FRAME.deckThicknessMm / 2; // 77.5

function screw(b: AssemblyBuilder, p: V3, n: V3, kind: "shcs" | "bhcs" = "bhcs") {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...n).normalize());
  b.add("fastener", fastenerHead(kind), new THREE.Matrix4().compose(new THREE.Vector3(...p), q, new THREE.Vector3(1, 1, 1)));
}

/** 1:1 steel miter (bevel) gear, Ø25 pitch, axis +Y, back face at y = 0. In metres. */
export function miterGeometry() {
  return cachedGeo("miter-gear", () => {
    const g = extrude(gearShape(16, 1.5, 4.1), FRAME.miterFaceMm, 0, 3);
    // taper the tooth face toward the cone apex (a bevel gear, not a spur)
    const pos = g.getAttribute("position");
    const h = FRAME.miterFaceMm;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i) + h / 2; // 0 … h
      const k = 1 - 0.34 * (z / h);
      pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k);
    }
    g.computeVertexNormals();
    g.rotateX(-Math.PI / 2); // extrusion (+Z) → +Y
    g.translate(0, h / 2, 0);
    // hub boss behind the teeth
    const hub = cyl(7, 5, 16);
    hub.translate(0, -2.5, 0);
    const out = new THREE.BufferGeometry();
    const merged = [g.toNonIndexed(), hub.toNonIndexed()];
    const n = merged.reduce((s, x) => s + x.getAttribute("position").count, 0);
    const p = new Float32Array(n * 3);
    const nm = new Float32Array(n * 3);
    let o = 0;
    for (const m of merged) {
      p.set(m.getAttribute("position").array as Float32Array, o * 3);
      nm.set(m.getAttribute("normal").array as Float32Array, o * 3);
      o += m.getAttribute("position").count;
    }
    out.setAttribute("position", new THREE.BufferAttribute(p, 3));
    out.setAttribute("normal", new THREE.BufferAttribute(nm, 3));
    out.scale(0.001, 0.001, 0.001);
    return out;
  });
}

const buildFrame = cachedAssembly("drivetrain-strafer", () => {
  const b = new AssemblyBuilder();
  // ---- side rails: 1120-0017-0432, open side facing inward (motors live inside the U)
  const rail = inMetres(channelGeometry(FRAME.railLengthMm));
  b.add("channel", rail, Mm(rmm(0, RAIL_Y, AXLE_Z), basisEuler([0, 0, 1], [-1, 0, 0])));
  b.add("channel", rail, Mm(rmm(0, -RAIL_Y, AXLE_Z), basisEuler([0, 0, 1], [1, 0, 0])));
  // ---- centre cross member 1120-0011-0264 between the rails (open side forward)
  b.add("channel", inMetres(channelGeometry(FRAME.crossLengthMm)), Mm(rmm(FRAME.centreCrossXmm, 0, AXLE_Z), basisEuler([1, 0, 0], [0, 0, 1])));
  // ---- back cross member 1120-0015-0360 stacked on the rails (open side up: the battery nests in it)
  b.add("channel", inMetres(channelGeometry(FRAME.backCrossLengthMm)), Mm(rmm(FRAME.backCrossXmm, 0, RAIL_TOP + CHANNEL.outerMm / 2)));
  // ---- electronics deck (3 mm pattern plate on the rails, front edge on the centre cross member)
  const deckLen = FRAME.deckFrontXmm - FRAME.deckBackXmm;
  b.add(
    "gridPlate",
    inMetres(patternPlateGeometry(FRAME.deckHalfWidthMm * 2, deckLen, FRAME.deckThicknessMm)),
    Mm(rmm((FRAME.deckFrontXmm + FRAME.deckBackXmm) / 2, 0, DECK_Z)),
  );
  // ---- corner gussets tying the centre cross member to the rails (front of the deck)
  for (const s of [-1, 1]) b.add("gridPlate", inMetres(patternPlateGeometry(48, 36, 3)), Mm(rmm(4, s * 144, DECK_Z)));

  // ---- four drive motors inside the rails, axis along x, gearbox faces toward the wheels
  const motor = motorGeometries("2stage");
  const miter = miterGeometry();
  const axleShaft = inMetres(cyl(4, 44, 6));
  const bearing = inMetres(ring(4.1, 7.2, 2.2, 20, 0.4));
  const flange = inMetres(ring(4.1, 9.4, 1, 20, 0.3));
  const mount = inMetres(chamferCyl(19.5, 4, 0.6, 24));
  for (const w of WHEELS) {
    const fx = w.sz * DRIVE_MOTOR_FACE_X;
    const y = w.sx * RAIL_Y;
    b.addPart(motor, Mm(rmm(fx, y, AXLE_Z), w.sz > 0 ? SHAFT.forward : SHAFT.back));
    // goBILDA face-mount plate across the channel at the gearbox face
    b.add("aluminium", mount, Mm(rmm(fx + w.sz * 1, y, AXLE_Z), [Math.PI / 2, 0, 0]));
    // miter pair: one on the motor shaft (axis x), one on the wheel axle (axis y)
    const mx = w.sz * (DRIVE.wheelXmm - MITER_R);
    b.add("steel", miter, Mm(rmm(mx, y, AXLE_Z), w.sz > 0 ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]));
    const my = w.sx * (RAIL_Y + MITER_R);
    b.add("steel", miter, Mm(rmm(w.sz * DRIVE.wheelXmm, my, AXLE_Z), w.sx > 0 ? [0, 0, Math.PI / 2] : [0, 0, -Math.PI / 2]));
    // hex wheel axle out through the web, flanged bearing on the outside
    b.add("steel", axleShaft, Mm(rmm(w.sz * DRIVE.wheelXmm, w.sx * 186, AXLE_Z), [0, 0, Math.PI / 2]));
    b.add("steel", bearing, Mm(rmm(w.sz * DRIVE.wheelXmm, w.sx * (WEB_INNER_Y + 1.25), AXLE_Z), [0, 0, Math.PI / 2]));
    b.add("steel", flange, Mm(rmm(w.sz * DRIVE.wheelXmm, w.sx * (FRAME.railOuterYmm + 0.5), AXLE_Z), [0, 0, Math.PI / 2]));
    // motor-mount screws on the rail's top flange
    for (const dy of [-12, 12]) screw(b, rmm(fx - w.sz * 2, y + dy, RAIL_TOP), rdir(0, 0, 1));
  }

  // ---- robot signs (R401–R403): one on each side, between the tyres
  const plate = numberPlateGeometries();
  const plateOut = FRAME.railOuterYmm + 4.7;
  b.addPart(plate, Mm(rmm(0, plateOut, AXLE_Z), SHAFT.left));
  b.addPart(plate, Mm(rmm(0, -plateOut, AXLE_Z), SHAFT.right));
  // sign stand-offs to the rail web
  const so = inMetres(cyl(3.2, 4.4, 6));
  for (const s of [-1, 1]) for (const x of [-(SIGN.widthMm / 2 - 9), SIGN.widthMm / 2 - 9]) b.add("aluminium", so, Mm(rmm(x, s * (FRAME.railOuterYmm + 2.2), AXLE_Z), [0, 0, Math.PI / 2]));

  // ---- hardware
  for (const s of [-1, 1]) {
    // centre cross member → rail (through the rail's top flange into an inside bracket)
    for (const dx of [-12, 12]) screw(b, rmm(dx, s * 174, RAIL_TOP), rdir(0, 0, 1));
    // gusset screws
    for (const dx of [-8, 16]) for (const dy of [126, 162]) screw(b, rmm(dx, s * dy, RAIL_TOP + 3), rdir(0, 0, 1));
    // back cross member: screws through its web (inside the U) into the rails
    for (const dx of [-12, 12]) screw(b, rmm(FRAME.backCrossXmm + dx, s * RAIL_Y, RAIL_TOP + CHANNEL.wallMm), rdir(0, 0, 1));
    // deck perimeter screws over the rails
    for (const x of [-140, -100]) screw(b, rmm(x, s * RAIL_Y, RAIL_TOP + 3), rdir(0, 0, 1));
    for (const y of [60, 108]) screw(b, rmm(-21, s * y, RAIL_TOP + 3), rdir(0, 0, 1));
  }
  return b.build();
});

function Wheel({ id, sx, sz }: (typeof WHEELS)[number]) {
  const explodeRef = useRigRef<THREE.Group>(`wheelExplode.${id}`);
  const handedness = (sx * sz) as 1 | -1;
  return (
    <group ref={explodeRef}>
      <MecanumWheel
        rigName={`wheel.${id}`}
        handedness={handedness}
        hubSide={(-sx) as 1 | -1}
        position={rmm(sz * DRIVE.wheelXmm, sx * DRIVE.wheelYmm, AXLE_Z)}
      />
    </group>
  );
}

const PROXY: readonly ProxyBox[] = [
  // rails + wheels (each side)
  [-220, 220, 132, 226, 0, 104],
  [-220, 220, -226, -132, 0, 104],
  // centre cross member, back cross member, deck
  [-24, 24, -132, 132, 28, 76],
  [-204, -156, -180, 180, 76, 124],
  [-152, -18, -132, 132, 76, 79],
];

export function Drivetrain() {
  const anchor = useRigRef<THREE.Object3D>("anchor.drivetrain");
  return (
    <>
      <StaticAssembly build={buildFrame} skipEdges={["fastener", "steel"]} />
      {WHEELS.map((w) => (
        <Wheel key={w.id} {...w} />
      ))}
      <HitProxy boxes={PROXY} />
      <object3D ref={anchor} position={rmm(DRIVE.wheelXmm, DRIVE.wheelYmm + 26, AXLE_Z + 30)} />
    </>
  );
}
