/**
 * Assembly helpers. Subsystems are authored in ROBOT-FRAME MILLIMETRES (x forward, y left, z up)
 * via `rmm()`, which returns three.js metres (X = left, Y = up, Z = forward).
 */
import * as THREE from "three";
import { rmm } from "../dimensions";
import type { V3 } from "../geometry";

export { rmm };

/** Euler (XYZ) that maps a part's local +X / +Y onto the given three.js directions. */
export function basisEuler(xAxis: V3, yAxis: V3): V3 {
  const x = new THREE.Vector3(...xAxis).normalize();
  const y = new THREE.Vector3(...yAxis).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  const e = new THREE.Euler().setFromRotationMatrix(m);
  return [e.x, e.y, e.z];
}

const H = Math.PI / 2;
/** Rotations for parts whose "axis" is local +Z (motors: shaft along +Z). */
export const SHAFT = {
  left: [0, H, 0] as V3, // → three +X (robot +y)
  right: [0, -H, 0] as V3, // → three −X (robot −y)
  up: [-H, 0, 0] as V3, // → three +Y
  down: [H, 0, 0] as V3, // → three −Y
  forward: [0, 0, 0] as V3, // → three +Z (robot +x)
  back: [0, Math.PI, 0] as V3, // → three −Z
};

/** Robot-frame direction (x fwd, y left, z up) → three.js direction tuple. */
export const rdir = (x: number, y: number, z: number): V3 => [y, z, x];

/** Convert a list of robot-frame mm points to three metres. */
export const rpts = (pts: [number, number, number][]): V3[] => pts.map(([x, y, z]) => rmm(x, y, z));
