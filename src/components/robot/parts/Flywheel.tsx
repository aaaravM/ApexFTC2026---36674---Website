"use client";

import { useEffect, useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useRigRef, useRobotMaterial } from "../context";
import { DERIVED, SHOOTER_GEOM } from "../dimensions";
import { AXIS_X, cachedGeo, chamferCyl, cyl, extrude, GeoBuilder, lathe, M, ring } from "../geometry";
import { spinBlurTexture } from "../textures";
import { noRaycast, RoleMeshes } from "./PartMesh";

/**
 * 4.0 in (101.6 mm) flywheel: two 38 mm compliant wheels on an 8 mm shaft, aluminium hub plates
 * with spoke windows (so the spin reads). Local frame: axle along X, centred.
 * At speed, a motion-blur disc fades in over each hub so the spokes never strobe.
 */
export function flywheelGeometries() {
  return cachedGeo("flywheel-v2", () => {
    const R = DERIVED.flywheelRadiusMm;
    const W = SHOOTER_GEOM.flywheelWidthMm;
    const b = new GeoBuilder();
    // tread: two wheels with crowned edges and a centre gap, light tread grooves
    const prof: [number, number][] = [];
    const half = W / 2;
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const y = -half + (i / n) * W;
      const local = Math.abs(y) - half / 2; // distance from each wheel's centre plane
      const wheelHalf = half / 2;
      const edge = Math.max(0, Math.abs(local) - (wheelHalf - 3)) / 3; // 0..1 in last 3 mm
      let r = R - edge * edge * 3.2;
      if (Math.abs(y) < 1.2) r = R - 4.5; // gap between the two wheels
      const g = Math.abs(Math.sin((y / W) * Math.PI * 9));
      if (g < 0.15) r -= 0.5;
      prof.push([r, y]);
    }
    b.add("rubber", lathe([[R - 12, -half], ...prof, [R - 12, half]], 36), M([0, 0, 0], AXIS_X));
    // aluminium hub plates with six spoke windows on both faces
    const plate = new THREE.Shape();
    plate.absarc(0, 0, R - 10, 0, Math.PI * 2, false);
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2 + 0.16;
      const a1 = a0 + Math.PI / 3 - 0.32;
      const h = new THREE.Path();
      h.absarc(0, 0, R - 17, a0, a1, false);
      h.absarc(0, 0, 15, a1, a0, true);
      h.closePath();
      plate.holes.push(h);
    }
    const bore = new THREE.Path();
    bore.absarc(0, 0, 4.1, 0, Math.PI * 2, true);
    plate.holes.push(bore);
    for (const s of [-1, 1]) {
      const g = extrude(plate, 3, 0.4, 10);
      b.add("aluminium", g, M([s * (half - 1.4), 0, 0], [0, Math.PI / 2, 0]));
      b.add("aluminium", ring(4.1, 12, 6, 24, 0.6), M([s * (half + 2.6), 0, 0], AXIS_X));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        b.add("fastener", chamferCyl(2.4, 1.6, 0.3, 8), M([s * (half + 0.4), (R - 13.5) * Math.cos(a), (R - 13.5) * Math.sin(a)], AXIS_X));
      }
    }
    // inner web visible through the spoke windows
    b.add("aluminium", ring(8, R - 11, W - 8, 32, 0.5), M([0, 0, 0], AXIS_X));
    return b.build();
  });
}

export function flywheelShaftGeometry(length: number) {
  return cachedGeo(`flywheel-shaft-${length}`, () => {
    const b = new GeoBuilder();
    b.add("steel", cyl(4, length, 12), M([0, 0, 0], AXIS_X));
    return b.build();
  });
}

/** Blur discs over both hub plates (metres, axle along X). */
function blurDiscGeometry() {
  return cachedGeo("flywheel-blur", () => {
    const R = DERIVED.flywheelRadiusMm;
    const half = SHOOTER_GEOM.flywheelWidthMm / 2;
    const parts: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      const g = new THREE.CircleGeometry(R - 10.2, 40);
      g.rotateY((s * Math.PI) / 2);
      g.translate(s * (half + 1.3), 0, 0);
      parts.push(g);
    }
    const pos: number[] = [];
    const uv: number[] = [];
    const nor: number[] = [];
    for (const p of parts) {
      const ng = p.toNonIndexed();
      pos.push(...(ng.getAttribute("position").array as Float32Array));
      uv.push(...(ng.getAttribute("uv").array as Float32Array));
      nor.push(...(ng.getAttribute("normal").array as Float32Array));
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    out.scale(0.001, 0.001, 0.001);
    out.computeBoundingSphere();
    return out;
  });
}

/** The motion-blur discs. The rig sets `userData.material.opacity` from the flywheel RPM. */
function FlywheelBlur({ rigName }: { rigName: string }) {
  const alu = useRobotMaterial("aluminium") as THREE.MeshStandardMaterial;
  const material = useMemo(() => {
    const emissiveFace = !!alu.userData.emissiveFace;
    const base = emissiveFace ? (alu as unknown as THREE.MeshLambertMaterial).emissive : alu.color;
    const m = new THREE.MeshStandardMaterial({
      color: base.clone().multiplyScalar(emissiveFace ? 1 : 0.62),
      emissive: emissiveFace ? base.clone() : new THREE.Color(0, 0, 0),
      metalness: emissiveFace ? 0 : 0.55,
      roughness: 0.5,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      alphaMap: spinBlurTexture(),
      side: THREE.DoubleSide,
    });
    m.forceSinglePass = true;
    m.name = "flywheel-blur";
    return m;
  }, [alu]);
  useEffect(() => () => material.dispose(), [material]);
  const geometry = useMemo(() => blurDiscGeometry(), []);
  const reg = useRigRef<THREE.Mesh>(rigName);
  return (
    <mesh
      ref={(m) => {
        if (m) m.userData.material = material;
        reg(m);
      }}
      geometry={geometry}
      material={material}
      visible={false}
      raycast={noRaycast}
      renderOrder={2}
    />
  );
}

export type FlywheelProps = Omit<ThreeElements["group"], "children"> & { rigName?: string; blurName?: string };

export function Flywheel({ rigName, blurName = "flywheelBlur", ...group }: FlywheelProps) {
  const geos = useMemo(() => flywheelGeometries(), []);
  const ref = useRigRef<THREE.Group>(rigName ?? "__unused");
  return (
    <group {...group}>
      <group ref={rigName ? ref : undefined} userData={{ spinner: true }}>
        <RoleMeshes geos={geos} skipEdges={["fastener"]} edgeThreshold={35} />
        <FlywheelBlur rigName={blurName} />
      </group>
    </group>
  );
}
