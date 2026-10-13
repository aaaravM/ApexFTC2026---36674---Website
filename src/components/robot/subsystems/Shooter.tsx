"use client";

import * as THREE from "three";
import { SubsystemScope, useRigRef } from "../context";
import { COLOR_SENSOR, DERIVED, SHOOTER_GEOM } from "../dimensions";
import { AssemblyBuilder, cachedAssembly, inMetres, Mm, StaticAssembly } from "../assembly";
import { box, cachedGeo, circlePath, cyl, extrude, rbox, ring, slotPath, sphere } from "../geometry";
import { beltGeometries, Pulley } from "../parts/Belt";
import { colorSensorGeometries } from "../parts/ColorSensor";
import { fastenerHead } from "../parts/Fasteners";
import { FlapRoller } from "../parts/FlapRoller";
import { Flywheel } from "../parts/Flywheel";
import { hoodGeometries, sideViewBasis } from "../parts/Hood";
import { HitProxy, RoleMeshes, type ProxyBox } from "../parts/PartMesh";
import { servoGeometries } from "../parts/Servo";
import { Limelight3A } from "../parts/Webcam";
import { motorGeometries } from "../parts/YellowJacketMotor";
import { rdir, rmm, SHAFT } from "./util";

/**
 * Shooter (rides on the turret; frame origin on the turret axis at floor level).
 *  - 4.0 in flywheel on a 5203 1:1 (6000 RPM) through a 1:1 GT2 belt; the motor (107.5 mm) sits
 *    between plates 122 mm apart, behind the hood
 *  - sprung hood wrapping the back of the flywheel: pivot pin just behind the exit lip (the 40°
 *    exit tangent never moves), springs at the entry end so NECTAR can push it out ≈ 15 mm. The exit
 *    point is the muzzle, ON the yaw axis 14 in above the floor (RobotConstants MUZZLE_*), so the
 *    muzzle really is fixed for every turret angle, as the team's solver assumes
 *  - staging point under the flywheel: the next ball waits there, 6 mm into the CR-servo feeder's
 *    flaps and 4 mm clear of the flywheel, in front of the REV Color Sensor V3 ("ball_color")
 */
export const FX = DERIVED.flywheelAxisXmm; // ≈ 51.7
export const FZ = DERIVED.flywheelAxisZmm; // ≈ 294
const PLATE_IN = SHOOTER_GEOM.sidePlateInnerMm; // 61
const PLATE_T = SHOOTER_GEOM.sidePlateThicknessMm;
const PLATE_Y = PLATE_IN + PLATE_T / 2; // 64
const PLATE_OUT = PLATE_IN + PLATE_T; // 67
const HALF_L = SHOOTER_GEOM.sidePlateHalfLengthMm; // 112
/** Top of the rotating platform: the side plates stand on it. */
const PLATE_BOTTOM = DERIVED.platformTopZmm;
const MOTOR_X = SHOOTER_GEOM.motorXmm;
export const FEED_X = SHOOTER_GEOM.feederXmm;
export const FEED_Z = SHOOTER_GEOM.feederZmm;
const PULLEY_R = 10;
const PULLEY_Y = PLATE_OUT + 9;
export const STAGE: [number, number] = [SHOOTER_GEOM.stagingXmm, SHOOTER_GEOM.stagingZmm];
const SENSOR_FACE_Y = DERIVED.nectarRadiusMm + 2.3; // 48: 12 mm from POLLEN, 2 mm from NECTAR
/** Hood pivot (near the exit lip) and spring anchor (behind the entry end). */
const HOOD_OUT = DERIVED.hoodInnerRadiusMm + SHOOTER_GEOM.hoodThicknessMm;
const PIVOT: [number, number] = [FX + (HOOD_OUT + 4) * Math.cos((136 * Math.PI) / 180), FZ + (HOOD_OUT + 4) * Math.sin((136 * Math.PI) / 180)];
const SPRING_HOOD: [number, number] = [FX + (HOOD_OUT + 7) * Math.cos((193 * Math.PI) / 180), FZ + (HOOD_OUT + 7) * Math.sin((193 * Math.PI) / 180)];
const SPRING_POST: [number, number] = [-102, 238];

/** Closed slot following an arc (centre cx,cy; radius r; from a0 to a1; half-width w). */
function arcSlotPath(cx: number, cy: number, r: number, a0: number, a1: number, w: number) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r + w, a0, a1, false);
  p.absarc(cx + r * Math.cos(a1), cy + r * Math.sin(a1), w, a1, a1 + Math.PI, false);
  p.absarc(cx, cy, r - w, a1, a0, true);
  p.absarc(cx + r * Math.cos(a0), cy + r * Math.sin(a0), w, a0 + Math.PI, a0 + Math.PI * 2, false);
  p.closePath();
  return p;
}

function sidePlateGeometry() {
  return cachedGeo("shooter-plate-v2", () => {
    const s = new THREE.Shape();
    s.moveTo(-HALF_L + 8, PLATE_BOTTOM);
    s.lineTo(HALF_L - 8, PLATE_BOTTOM);
    s.quadraticCurveTo(HALF_L, PLATE_BOTTOM, HALF_L, PLATE_BOTTOM + 8);
    s.lineTo(HALF_L, FZ);
    s.absarc(FX, FZ, HALF_L - FX, 0, Math.PI / 2, false);
    s.lineTo(18, 384);
    s.quadraticCurveTo(-4, 402, -28, 400);
    s.lineTo(-62, 388);
    s.lineTo(-98, 352);
    s.quadraticCurveTo(-HALF_L, 336, -HALF_L, 314);
    s.lineTo(-HALF_L, PLATE_BOTTOM + 8);
    s.quadraticCurveTo(-HALF_L, PLATE_BOTTOM, -HALF_L + 8, PLATE_BOTTOM);
    s.holes.push(circlePath(FX, FZ, 11));
    s.holes.push(circlePath(FEED_X, FEED_Z, 4.4));
    s.holes.push(circlePath(MOTOR_X, FZ, 7));
    s.holes.push(circlePath(86, 244, 12));
    // colour-sensor window at the staging point
    s.holes.push(slotPath(STAGE[0] - 7, STAGE[1], STAGE[0] + 7, STAGE[1], 6));
    // arc slot concentric with the flywheel: the sprung hood's travel stop
    s.holes.push(arcSlotPath(FX, FZ, 134, (150 * Math.PI) / 180, (170 * Math.PI) / 180, 4));
    s.holes.push(slotPath(-2, 252, 20, 252, 5.5));
    const g = extrude(s, PLATE_T, 0.6, 8);
    g.scale(0.001, 0.001, 0.001);
    return g;
  });
}

/** Compression spring between two side-view points (mm), at lateral offset y. Metres. */
function springGeometry(a: [number, number], b: [number, number], y: number) {
  return cachedGeo(`hood-spring-${a}-${b}-${y}`, () => {
    const A = new THREE.Vector3(y, a[1], a[0]);
    const B = new THREE.Vector3(y, b[1], b[0]);
    const axis = B.clone().sub(A);
    const len = axis.length();
    axis.normalize();
    const u = new THREE.Vector3(1, 0, 0);
    const v = new THREE.Vector3().crossVectors(axis, u).normalize();
    const pts: THREE.Vector3[] = [];
    const coils = 7;
    const r = 4.2;
    const n = coils * 12;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const ang = t * coils * Math.PI * 2;
      const rr = t < 0.06 || t > 0.94 ? r * 0.7 : r;
      pts.push(A.clone().addScaledVector(axis, len * t).addScaledVector(u, Math.cos(ang) * rr).addScaledVector(v, Math.sin(ang) * rr));
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.7, 5, false);
    g.scale(0.001, 0.001, 0.001);
    return g;
  });
}

function screwAt(b: AssemblyBuilder, p: [number, number, number], n: [number, number, number], kind: "shcs" | "bhcs" = "bhcs") {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...n).normalize());
  b.add("fastener", fastenerHead(kind), new THREE.Matrix4().compose(new THREE.Vector3(...p), q, new THREE.Vector3(1, 1, 1)));
}

const mm = (g: THREE.BufferGeometry) => {
  g.scale(0.001, 0.001, 0.001);
  return g;
};

const build = cachedAssembly("shooter-v2", () => {
  const b = new AssemblyBuilder();
  const plate = sidePlateGeometry();
  for (const s of [-1, 1]) b.add("aluminium", plate, sideViewBasis(s * PLATE_Y * 0.001, 0, 0));
  // sprung hood, concentric with the flywheel at rest
  b.addPart(hoodGeometries(2 * PLATE_IN - 2), Mm(rmm(FX, 0, FZ)));
  // hood pivot pin (just behind the exit lip) and the two return springs at the entry end
  b.add("steel", mm(cyl(3, 2 * PLATE_OUT + 4, 10)), Mm(rmm(PIVOT[0], 0, PIVOT[1]), [0, 0, Math.PI / 2]));
  b.add("aluminium", mm(cyl(4.6, 2 * PLATE_IN, 6)), Mm(rmm(SPRING_POST[0], 0, SPRING_POST[1]), [0, 0, Math.PI / 2]));
  for (const y of [-38, 38]) b.add("steel", springGeometry(SPRING_HOOD, SPRING_POST, y));
  // flywheel motor (1:1 5203) between the plates behind the hood, shaft out through the left plate
  b.addPart(motorGeometries("direct", 22), Mm(rmm(MOTOR_X, PLATE_IN, FZ), SHAFT.left));
  // 1:1 GT2 belt on the outside of the left plate
  b.addPart(beltGeometries([MOTOR_X, FZ], PULLEY_R, [FX, FZ], PULLEY_R, 9), Mm(rmm(0, PULLEY_Y, 0)));
  // flanged bearings: flywheel (both plates) and feeder
  const brg = inMetres(ring(4.1, 11.5, 3, 24, 0.4));
  const brgFeed = inMetres(ring(4.1, 8, 2.5, 20, 0.3));
  for (const s of [-1, 1]) {
    b.add("steel", brg, Mm(rmm(FX, s * (PLATE_OUT + 1.5), FZ), [0, 0, Math.PI / 2]));
    b.add("steel", brgFeed, Mm(rmm(FEED_X, s * (PLATE_OUT + 1.25), FEED_Z), [0, 0, Math.PI / 2]));
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      screwAt(b, rmm(FX + 16 * Math.cos(a), s * (PLATE_OUT + 0.1), FZ + 16 * Math.sin(a)), rdir(0, s, 0));
    }
    // hood mounting screws along the arc
    for (const deg of [146, 170, 192]) {
      const a = (deg * Math.PI) / 180;
      const r = HOOD_OUT + 3.5;
      screwAt(b, rmm(FX + r * Math.cos(a), s * (PLATE_OUT + 0.1), FZ + r * Math.sin(a)), rdir(0, s, 0));
    }
    // angle brackets to the turret platform (inside its 86 mm radius)
    for (const x of [-40, 40]) {
      b.add("aluminium", mm(box(3, 18, 30)), Mm(rmm(x, s * (PLATE_IN - 1.5), PLATE_BOTTOM + 9)));
      b.add("aluminium", mm(box(12, 3, 30)), Mm(rmm(x, s * (PLATE_IN - 6), PLATE_BOTTOM + 1.5)));
      screwAt(b, rmm(x, s * (PLATE_OUT + 0.1), PLATE_BOTTOM + 11), rdir(0, s, 0));
      screwAt(b, rmm(x, s * (PLATE_IN - 6), PLATE_BOTTOM + 3), rdir(0, 0, 1));
    }
  }
  // cross stand-offs tying the plates together
  b.add("aluminium", mm(cyl(4.6, 2 * PLATE_IN, 6)), Mm(rmm(-82, 0, 356), [0, 0, Math.PI / 2]));
  b.add("aluminium", mm(cyl(4.6, 2 * PLATE_IN, 6)), Mm(rmm(96, 0, 228), [0, 0, Math.PI / 2]));
  // feeder CR servo on the outside of the right plate, body pointing up
  b.addPart(servoGeometries(), Mm(rmm(FEED_X, -(PLATE_OUT + 0.5), FEED_Z), [0, 0, -Math.PI / 2]));
  // staging guide: clear plate in front of the waiting ball (the feeder is behind it)
  const guide = rbox(78, 30, 2, 1, 2);
  b.add("polycarb", mm(guide), Mm(rmm(STAGE[0] + 37.5, 0, PLATE_BOTTOM + 18)));
  // REV Color Sensor V3 on a printed boss on the left plate, looking at the staged ball
  const boss = PLATE_IN - SENSOR_FACE_Y - 7;
  b.add("plasticAccent", mm(rbox(26, 30, boss, 2, 2)), Mm(rmm(STAGE[0], PLATE_IN - boss / 2, STAGE[1]), [0, Math.PI / 2, 0]));
  b.addPart(colorSensorGeometries(), Mm(rmm(STAGE[0], SENSOR_FACE_Y + 3.5, STAGE[1]), SHAFT.right));
  return b.build();
});

/** Flywheel + shaft + driven pulley (spins as one). */
const buildFlywheelExtras = cachedAssembly("flywheel-extras-v2", () => {
  const b = new AssemblyBuilder();
  b.add("steel", mm(cyl(4, 2 * PLATE_OUT + 12, 12)), Mm(rmm(0, 6, 0), [0, 0, Math.PI / 2]));
  return b.build();
});

function FlywheelExtras() {
  return <RoleMeshes geos={buildFlywheelExtras()} edges={false} />;
}

/** Printed adapter plate for the optional Limelight on the left side plate. */
const buildLimelightMount = cachedAssembly("limelight-mount-v2", () => {
  const b = new AssemblyBuilder();
  b.add("plasticAccent", mm(rbox(4, 54, 40, 1.2, 2)), Mm(rmm(64, PLATE_OUT + 2, 345)));
  b.add("plasticAccent", mm(rbox(22, 6, 30, 1.2, 2)), Mm(rmm(56, PLATE_OUT + 13, 322)));
  return b.build();
});

/** The third preloaded ball, waiting at the staging point (turret frame). */
const buildStagedBall = cachedAssembly("staged-ball", () => {
  const b = new AssemblyBuilder();
  b.add("ballPollen", inMetres(sphere(DERIVED.pollenRadiusMm, 28, 18)), Mm(rmm(STAGE[0], 0, STAGE[1])));
  return b.build();
});

const PROXY: readonly ProxyBox[] = [[-HALF_L, HALF_L, -PLATE_OUT - 10, PULLEY_Y + 12, PLATE_BOTTOM, 402]];

export function Shooter({ limelight = false, staged = false }: { limelight?: boolean; staged?: boolean }) {
  const flywheel = useRigRef<THREE.Group>("flywheel");
  const muzzle = useRigRef<THREE.Object3D>("muzzle");
  const pivot = useRigRef<THREE.Object3D>("turretPivot");
  const anchor = useRigRef<THREE.Object3D>("anchor.shooter");
  const sensor = useRigRef<THREE.Object3D>("colorSensor");
  return (
    <>
      <StaticAssembly build={build} skipEdges={["fastener", "steel", "nylonYellow"]} />
      <group ref={flywheel} position={rmm(FX, 0, FZ)} userData={{ spinner: true }}>
        <Flywheel />
        <FlywheelExtras />
        <Pulley pitchR={PULLEY_R} width={9} position={rmm(0, PULLEY_Y, 0)} />
      </group>
      <Pulley rigName="motorPulley" pitchR={PULLEY_R} width={9} position={rmm(MOTOR_X, PULLEY_Y, FZ)} />
      <FlapRoller
        rigName="feeder"
        position={rmm(FEED_X, 0, FEED_Z)}
        length={70}
        wheels={2}
        wheelWidth={20}
        tipRadius={SHOOTER_GEOM.feederTipRadiusMm}
        coreRadius={6}
        flaps={7}
        flapRole="rubber"
      />
      {staged ? <StaticAssembly build={buildStagedBall} /> : null}
      {limelight ? (
        <SubsystemScope id="vision">
          <group userData={{ subsystem: "vision" }}>
            <Limelight3A position={rmm(64, PLATE_OUT + 4 + 22, 345)} rotation={[-0.2, 0, Math.PI / 2]} />
            <StaticAssembly build={buildLimelightMount} />
          </group>
        </SubsystemScope>
      ) : null}
      <HitProxy boxes={PROXY} />
      <object3D ref={muzzle} position={rmm(0, 0, DERIVED.muzzleZmm)} />
      <object3D ref={pivot} position={rmm(0, 0, PLATE_BOTTOM)} />
      <object3D ref={sensor} position={rmm(COLOR_SENSOR.xMm, SENSOR_FACE_Y, COLOR_SENSOR.zMm)} />
      <object3D ref={anchor} position={rmm(-34, 0, 408)} />
    </>
  );
}
