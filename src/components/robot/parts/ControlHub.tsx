"use client";

import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { HUB } from "../dimensions";
import { box, cachedGeo, chamferCyl, GeoBuilder, M, rbox } from "../geometry";
import { RoleMeshes } from "./PartMesh";

export type HubVariant = "control" | "expansion";

/**
 * REV Control Hub / Expansion Hub (≈143 × 103 × 32 mm, estimate).
 * Local frame: length along X, width along Z, bottom face at y = 0, label on top (+Y),
 * motor/encoder ports along the +Z edge, servo headers along −Z, XT30 power on the +X end.
 */
export function hubGeometries(variant: HubVariant) {
  return cachedGeo(`hub-${variant}`, () => {
    const L = HUB.lengthMm;
    const Wd = HUB.widthMm;
    const H = HUB.heightMm;
    const b = new GeoBuilder();
    // two-part case: black base + dark-grey lid with a visible seam
    b.add("plasticDark", rbox(L, 11, Wd, 3.2, 3), M([0, 5.5, 0]));
    b.add("plasticGrey", rbox(L - 2, H - 11.6, Wd - 2, 4.2, 3), M([0, 11.6 + (H - 11.6) / 2, 0]));
    // recessed label on top: turned so the text reads from the −Z side (behind the robot) and the
    // MOTOR / SERVO legends sit next to the motor (+Z) and servo (−Z) edges
    const label = new THREE.PlaneGeometry(L - 18, Wd - 20);
    label.rotateX(-Math.PI / 2);
    label.rotateY(Math.PI);
    b.add(variant === "control" ? "hubLabelControl" : "hubLabelExpansion", label, M([0, H + 0.05, 0]));
    // mounting screws at the corners
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) b.add("plasticDark", chamferCyl(3.3, 1.6, 0.5, 16), M([sx * (L / 2 - 6), H + 0.7, sz * (Wd / 2 - 6)]));
    // motor power ports (4, black) + encoder ports (4, white JST-PH) on the +Z edge
    for (let i = 0; i < 4; i++) {
      const x = -46 + i * 21;
      b.add("plasticDark", box(10, 6.5, 6), M([x, 20, Wd / 2 - 1]));
      b.add("nylonWhite", box(7, 4, 4.5), M([x + 2, 26.5, Wd / 2 - 2.2]));
    }
    // I2C / digital / analog sensor ports (white) further along +Z edge
    for (let i = 0; i < 5; i++) b.add("nylonWhite", box(6, 4, 4.5), M([42 + i * 7.5 - 15, 26.5, Wd / 2 - 2.2]));
    // servo headers (6 × 3-pin, black) on the −Z edge
    for (let i = 0; i < 6; i++) b.add("plasticDark", box(8, 3.2, 5), M([-48 + i * 12, 28.4, -(Wd / 2 - 3)]));
    // XT30 power in/out on the +X end (yellow)
    for (const z of [-22, -6]) b.add("nylonYellow", box(8, 8, 13), M([L / 2 + 2.5, 16, z]));
    // RS485 (white) on the +X end
    for (const z of [14, 26]) b.add("nylonWhite", box(5, 5, 7), M([L / 2 + 1.5, 16, z]));
    if (variant === "control") {
      // USB-A (one blue USB 3.0 shown as metal) + HDMI on the −X end
      b.add("plasticDark", box(4, 7.5, 14), M([-L / 2 - 1, 15, -20]));
      b.add("plasticDark", box(4, 7.5, 14), M([-L / 2 - 1, 15, 0]));
      b.add("plasticDark", box(4, 6, 15), M([-L / 2 - 1, 15, 22]));
    }
    // status LED behind the label's window
    b.add("led", box(7, 0.6, 3.2), M([-(L / 2 - 33), H + 0.3, Wd / 2 - 26]));
    return b.build();
  });
}

export type ControlHubProps = Omit<ThreeElements["group"], "children"> & { variant?: HubVariant };

export function ControlHub({ variant = "control", ...group }: ControlHubProps) {
  const geos = useMemo(() => hubGeometries(variant), [variant]);
  return (
    <group {...group}>
      <RoleMeshes geos={geos} skipEdges={["led", "nylonWhite", "nylonYellow"]} />
    </group>
  );
}
