"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { CHANNEL } from "../dimensions";
import { cachedGeo, GeoBuilder, gridUvBox } from "../geometry";
import { CHANNEL_SOLID_UV } from "../textures";
import { RoleMeshes } from "./PartMesh";

export type ChannelProfile = "1120" | "1121";

/**
 * goBILDA U-channel in mm. Local frame: length along X (centred), U opens toward +Y, outer section
 * 48 × 48 mm (1120) or 48 × 12 mm (1121 low-side). The hole pattern is an alpha map driven by UVs
 * measured in 24 mm periods, so the holes line up with the real 8 mm grid / 24 mm bore pitch.
 */
export function channelGeometry(lengthMm: number, profile: ChannelProfile = "1120") {
  return cachedGeo(`channel-${profile}-${lengthMm}`, () => {
    const L = lengthMm;
    const o = CHANNEL.outerMm / 2; // 24
    const w = CHANNEL.wallMm; // 2.5
    const flangeH = profile === "1120" ? CHANNEL.outerMm : CHANNEL.lowSideMm;
    const phase = (L % CHANNEL.pitchMm) / 2;
    const u = (x: number) => (x + L / 2 - phase) / CHANNEL.pitchMm;
    const parts: THREE.BufferGeometry[] = [];

    // web: y ∈ [-24, -21.5], spans z ∈ [-24, 24]
    parts.push(
      wall(L, w, CHANNEL.outerMm, [0, -o + w / 2, 0], (p, n) =>
        Math.abs(n.y) > 0.9 ? [u(p.x), (p.z + o) / CHANNEL.outerMm] : null,
      ),
    );
    // flanges
    for (const sz of [-1, 1]) {
      const h = flangeH - w;
      const yc = -o + w + h / 2;
      parts.push(
        wall(L, h, w, [0, yc, sz * (o - w / 2)], (p, n) =>
          profile === "1120" && Math.abs(n.z) > 0.9 ? [u(p.x), (p.y + o) / CHANNEL.outerMm] : null,
        ),
      );
    }
    const b = new GeoBuilder();
    for (const g of parts) b.add("channel", g);
    return b.build(1).channel!;
  });
}

function wall(
  lx: number,
  ly: number,
  lz: number,
  center: [number, number, number],
  uvFn: (p: THREE.Vector3, n: THREE.Vector3) => [number, number] | null,
) {
  const g = new THREE.BoxGeometry(lx, ly, lz);
  g.translate(center[0], center[1], center[2]);
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const uv = g.getAttribute("uv");
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const t = uvFn(p, n) ?? CHANNEL_SOLID_UV;
    uv.setXY(i, t[0], t[1]);
  }
  return g;
}

export type UChannelProps = Omit<ThreeElements["group"], "children"> & {
  /** Length in mm (goBILDA sizes are multiples of 24 mm). */
  length: number;
  profile?: ChannelProfile;
};

/** A single goBILDA U-channel (metres, length along local X, opening toward +Y). */
export function UChannel({ length, profile = "1120", ...group }: UChannelProps) {
  const geos = useMemo(() => {
    const g = channelGeometry(length, profile).clone();
    g.scale(0.001, 0.001, 0.001);
    return { channel: g };
  }, [length, profile]);
  return (
    <group {...group}>
      <RoleMeshes geos={geos} edgeThreshold={40} />
    </group>
  );
}

/**
 * Flat goBILDA-style pattern plate (mm), lying in the XZ plane, thickness along Y.
 * UVs are in 24 mm cells for the grid alpha map.
 */
export function patternPlateGeometry(w: number, d: number, t: number) {
  return cachedGeo(`gridplate-${w}-${d}-${t}`, () => gridUvBox(w, t, d, 24));
}
