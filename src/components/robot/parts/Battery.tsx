"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { BATTERY } from "../dimensions";
import { cachedGeo, extrude, GeoBuilder, M } from "../geometry";
import { RoleMeshes } from "./PartMesh";

/**
 * goBILDA 12 V NiMH "nested" battery (3100-0012-0020): 124 × 43 × 47.8 mm, ten sub-C cells in two
 * staggered rows (that is what gives the wavy outline in goBILDA's drawing).
 * Local frame: length along X, width along Z, bottom at y = 0, label on top.
 */
function outlineShape() {
  const r = 11.9;
  const pitch = 23.4;
  const rowZ = Math.sqrt(pitch * pitch - (pitch / 2) * (pitch / 2)) / 2; // nested rows
  const circles: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const xt = -BATTERY.lengthMm / 2 + r + 0.6 + i * pitch;
    circles.push([xt, rowZ], [xt + pitch / 2, -rowZ]);
  }
  // shift so the pack is centred
  const minX = Math.min(...circles.map((c) => c[0])) - r;
  const maxX = Math.max(...circles.map((c) => c[0])) + r;
  const cx = (minX + maxX) / 2;
  const cs = circles.map(([x, z]) => [x - cx, z] as [number, number]);
  // star-shaped outline: farthest ray hit over all circles
  const s = new THREE.Shape();
  const n = 280;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    let best = 0;
    for (const [x, z] of cs) {
      const dc = dx * x + dz * z;
      const disc = dc * dc - (x * x + z * z) + r * r;
      if (disc >= 0) best = Math.max(best, dc + Math.sqrt(disc));
    }
    const px = dx * best;
    const pz = dz * best;
    if (i === 0) s.moveTo(px, pz);
    else s.lineTo(px, pz);
  }
  return s;
}

export function batteryGeometries() {
  return cachedGeo("battery", () => {
    const H = BATTERY.heightMm;
    const b = new GeoBuilder();
    const body = extrude(outlineShape(), H, 1.6, 2);
    // extrude is along Z; stand it up: shape XY → XZ, thickness → Y
    b.add("plasticDark", body, M([0, H / 2, 0], [Math.PI / 2, 0, 0]));
    const label = new THREE.PlaneGeometry(96, 30);
    label.rotateX(-Math.PI / 2);
    b.add("batteryWrap", label, M([0, H + 0.08, 0]));
    return b.build();
  });
}

export function Battery(props: Omit<ThreeElements["group"], "children">) {
  const geos = useMemo(() => batteryGeometries(), []);
  return (
    <group {...props}>
      <RoleMeshes geos={geos} edgeThreshold={50} />
    </group>
  );
}
