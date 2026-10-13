"use client";

/**
 * Stylised BIOBUZZ HIVE Structure (field element) for aim demos, proportioned from Competition
 * Manual §9.6: an A-frame 49.46 in wide × 38.95 in deep whose crossbar (the pivot axis) is 43.95 in
 * above the tiles, carrying two HIVES (red + blue). Each HIVE is a beam with a CELL at each end,
 * 18.8 in apart; a CELL opening is ≈ 20 × 14 in and 12 in deep. One CELL faces up — the target.
 * (Our own line-art interpretation — not FIRST's field CAD.)
 *
 * Frame: origin on the floor under the middle of the crossbar; crossbar along X; HIVE beams along Z.
 * `hiveAimOffset()` gives the centre of a HIVE's upward CELL opening (the AprilTag cluster origin,
 * which is what the team's HiveTracker aims at). Rendered as ~6 merged meshes.
 */
import { useLayoutEffect, useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HIVE, IN } from "./dimensions";
import { normalize } from "./geometry";
import { BALL_COLORS } from "./materials";
import type { RobotLook, RobotTone } from "./rig";

/** [est] How far a HIVE is tipped from level when one CELL faces up. */
export const HIVE_TILT_DEG = 25;
/** Lateral centre of each alliance's HIVE along the crossbar (inches). */
const HIVE_X_IN = { blue: -12.4, red: 12.4 } as const;

/** Offset (metres, HIVE-structure frame) of `alliance`'s upward CELL opening centre. */
export function hiveAimOffset(alliance: "red" | "blue" = "blue", tiltDeg = HIVE_TILT_DEG, out = new THREE.Vector3()) {
  const t = (tiltDeg * Math.PI) / 180;
  const half = HIVE.cellSpacingIn / 2;
  const cd = HIVE.cellDepthIn;
  const dir = alliance === "blue" ? 1 : -1; // the two HIVES are tipped opposite ways
  const y = HIVE.pivotHeightIn + (cd / 2) * Math.cos(t) + half * Math.sin(t);
  const z = dir * (half * Math.cos(t) - (cd / 2) * Math.sin(t));
  return out.set(HIVE_X_IN[alliance] * IN, y * IN, z * IN);
}

export type HiveProps = Omit<ThreeElements["group"], "children"> & {
  look?: RobotLook;
  tone?: RobotTone;
  tiltDeg?: number;
};

type Part = { geo: THREE.BufferGeometry; m: THREE.Matrix4 };

function tubeBetween(a: THREE.Vector3, b: THREE.Vector3, r: number): Part {
  const len = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(r, r, len, 10, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return { geo, m: new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)) };
}

function mergeParts(parts: Part[]) {
  const geos = parts.map(({ geo, m }) => normalize(geo.clone().applyMatrix4(m)));
  const out = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return out!;
}

/** Build all HIVE geometry in the structure frame (metres), merged by material. */
function buildHive(tiltDeg: number) {
  const W = HIVE.frameWidthIn * IN;
  const D = HIVE.frameDepthIn * IN;
  const Hp = HIVE.pivotHeightIn * IN;
  const half = (HIVE.cellSpacingIn / 2) * IN;
  const cw = HIVE.cellWidthIn * IN;
  const ct = HIVE.cellTallIn * IN;
  const cd = HIVE.cellDepthIn * IN;
  const t = (tiltDeg * Math.PI) / 180;
  const tube = 0.019;

  const frame: Part[] = [];
  for (const x of [-W / 2, W / 2]) {
    frame.push(tubeBetween(new THREE.Vector3(x, 0, -D / 2), new THREE.Vector3(x, Hp, 0), tube));
    frame.push(tubeBetween(new THREE.Vector3(x, 0, D / 2), new THREE.Vector3(x, Hp, 0), tube));
    frame.push(tubeBetween(new THREE.Vector3(x, tube, -D / 2), new THREE.Vector3(x, tube, D / 2), tube));
  }
  frame.push(tubeBetween(new THREE.Vector3(-W / 2, Hp, 0), new THREE.Vector3(W / 2, Hp, 0), tube * 1.3));

  const walls: Record<"red" | "blue", Part[]> = { red: [], blue: [] };
  const rims: Part[] = [];
  const tags: Part[] = [];
  for (const alliance of ["blue", "red"] as const) {
    const dir = alliance === "blue" ? 1 : -1;
    const hiveM = new THREE.Matrix4().compose(
      new THREE.Vector3(HIVE_X_IN[alliance] * IN, Hp, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -t * dir),
      new THREE.Vector3(1, 1, 1),
    );
    // beam
    frame.push({ geo: new THREE.BoxGeometry(0.045, 0.045, 2 * half), m: hiveM.clone() });
    for (const up of [true, false]) {
      const z = (up ? dir : -dir) * half;
      const cellM = hiveM
        .clone()
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, z))
        .multiply(new THREE.Matrix4().makeRotationX(up ? 0 : Math.PI));
      // open-top basket: bottom + 4 walls (opening at local +Y)
      const wall = (w: number, h: number, pos: [number, number, number], rot: [number, number, number]) =>
        walls[alliance].push({
          geo: new THREE.PlaneGeometry(w, h),
          m: cellM.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1))),
        });
      wall(cw, ct, [0, -cd / 2, 0], [-Math.PI / 2, 0, 0]);
      wall(cw, cd, [0, 0, ct / 2], [0, 0, 0]);
      wall(cw, cd, [0, 0, -ct / 2], [0, Math.PI, 0]);
      wall(ct, cd, [cw / 2, 0, 0], [0, Math.PI / 2, 0]);
      wall(ct, cd, [-cw / 2, 0, 0], [0, -Math.PI / 2, 0]);
      // white rim around the opening + vertical corner posts
      const r = 0.011;
      const rim = (a: [number, number, number], b: [number, number, number]) => {
        const p = tubeBetween(new THREE.Vector3(...a), new THREE.Vector3(...b), r);
        rims.push({ geo: p.geo, m: cellM.clone().multiply(p.m) });
      };
      const y = cd / 2;
      rim([-cw / 2, y, ct / 2], [cw / 2, y, ct / 2]);
      rim([-cw / 2, y, -ct / 2], [cw / 2, y, -ct / 2]);
      rim([cw / 2, y, -ct / 2], [cw / 2, y, ct / 2]);
      rim([-cw / 2, y, -ct / 2], [-cw / 2, y, ct / 2]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) rim([(sx * cw) / 2, -cd / 2, (sz * ct) / 2], [(sx * cw) / 2, cd / 2, (sz * ct) / 2]);
      // AprilTag cluster (4 members at x = ±2.75, ±6.5 in) on the bottom face, inside
      for (const x of [-6.5, -2.75, 2.75, 6.5]) {
        tags.push({
          geo: new THREE.PlaneGeometry(0.062, 0.062),
          m: cellM.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x * IN, -cd / 2 + 0.002, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1))),
        });
      }
    }
  }
  return {
    frame: mergeParts(frame),
    blue: mergeParts(walls.blue),
    red: mergeParts(walls.red),
    rims: mergeParts(rims),
    tags: mergeParts(tags),
  };
}

function useHiveMaterials(look: RobotLook, tone: RobotTone) {
  const mats = useMemo(() => {
    const paper = look === "blueprint" && tone === "light";
    const ink = paper ? "#141413" : "#B9B9B2";
    const frame =
      look === "blueprint"
        ? new THREE.MeshBasicMaterial({ color: paper ? "#55534C" : "#3a3a36" })
        : new THREE.MeshStandardMaterial({
            color: look === "clay" ? (tone === "light" ? "#cbc5b8" : "#3E3E3B") : "#3d4148",
            metalness: look === "clay" ? 0.2 : 0.7,
            roughness: 0.45,
          });
    const cell = (c: string) =>
      new THREE.MeshStandardMaterial({
        color: c,
        roughness: 0.4,
        metalness: 0,
        transparent: true,
        opacity: look === "blueprint" ? (paper ? 0.3 : 0.18) : look === "clay" ? 0.45 : 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
    const rim =
      look === "blueprint"
        ? new THREE.MeshBasicMaterial({ color: ink })
        : new THREE.MeshStandardMaterial({ color: tone === "light" ? "#f7f6f2" : "#ECECE7", roughness: 0.45 });
    const tag = new THREE.MeshBasicMaterial({ color: look === "blueprint" ? ink : "#101010", side: THREE.DoubleSide });
    return { frame, red: cell(BALL_COLORS.ballNectarRed), blue: cell(BALL_COLORS.ballNectarBlue), rim, tag };
  }, [look, tone]);
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

export function Hive({ look = "studio", tone = "dark", tiltDeg = HIVE_TILT_DEG, ...group }: HiveProps) {
  const mats = useHiveMaterials(look, tone);
  const geo = useMemo(() => buildHive(tiltDeg), [tiltDeg]);
  useLayoutEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  return (
    <group {...group}>
      <mesh geometry={geo.frame} material={mats.frame} castShadow />
      <mesh geometry={geo.rims} material={mats.rim} castShadow />
      <mesh geometry={geo.tags} material={mats.tag} />
      <mesh geometry={geo.blue} material={mats.blue} />
      <mesh geometry={geo.red} material={mats.red} />
    </group>
  );
}
