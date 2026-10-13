// Ghoster — fades whole subsystems back so an assembly (e.g. TURRET + SHOOTER, two subsystems)
// stands out. The robot engine's own `highlight` prop takes ONE subsystem, so the CAD page keeps
// `highlight={null}` and ghosts here instead, the same way the engine does it (MaterialLibrary
// applyDim): opacity toward 0.12, colour toward the paper, edge lines toward 18 %.
//
// Materials are per subsystem in the engine (one MaterialLibrary each), so dimming a material never
// touches another subsystem. Base values are snapshotted on first touch and restored exactly at 0.

import * as THREE from "three";
import type { SubsystemId } from "@/components/robot";

const PAPER = new THREE.Color("#EFEDE6");
const GHOST_OPACITY = 0.12;

interface Base {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  /** Visible colour: `emissive` for the blueprint's flat faces, `color` otherwise. */
  color: THREE.Color | null;
  emissiveFace: boolean;
  line: boolean;
}

type AnyMat = THREE.Material & { color?: THREE.Color; emissive?: THREE.Color };

/** Nearest ancestor tagged with a subsystem (the engine tags its <Sub> groups). */
export function subsystemOf(obj: THREE.Object3D | null): SubsystemId | null {
  let o: THREE.Object3D | null = obj;
  while (o) {
    const s = o.userData?.subsystem as SubsystemId | undefined;
    if (s) return s;
    o = o.parent;
  }
  return null;
}

export class Ghoster {
  private groups = new Map<SubsystemId, Set<AnyMat>>();
  private base = new WeakMap<AnyMat, Base>();
  private level = new Map<SubsystemId, number>();

  /** Index the robot's materials by subsystem. Helpers tagged `userData.cadHelper` are skipped. */
  index(root: THREE.Object3D) {
    this.restoreAll();
    this.groups.clear();
    this.level.clear();
    root.traverse((o) => {
      if (o.userData?.cadHelper) return;
      const mesh = o as THREE.Mesh;
      const line = o as THREE.LineSegments;
      if (!mesh.isMesh && !line.isLineSegments) return;
      // the wiring harness lives outside the <Sub> groups but uses the electronics materials
      const id = subsystemOf(o) ?? "electronics";
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      let set = this.groups.get(id);
      if (!set) this.groups.set(id, (set = new Set()));
      for (const m of mats) if (m) set.add(m as AnyMat);
    });
  }

  private snapshot(m: AnyMat): Base {
    let b = this.base.get(m);
    if (!b) {
      const emissiveFace = !!m.userData?.emissiveFace;
      const vis = emissiveFace ? m.emissive : m.color;
      b = {
        opacity: m.opacity,
        transparent: m.transparent,
        depthWrite: m.depthWrite,
        color: vis ? vis.clone() : null,
        emissiveFace,
        line: (m as THREE.LineBasicMaterial).isLineBasicMaterial === true,
      };
      this.base.set(m, b);
    }
    return b;
  }

  private apply(m: AnyMat, d: number) {
    const b = this.snapshot(m);
    if (b.line) {
      m.opacity = b.opacity * (1 - 0.82 * d);
      return;
    }
    const ghost = d > 0.001;
    const transparent = ghost || b.transparent;
    if (m.transparent !== transparent) {
      m.transparent = transparent;
      m.needsUpdate = true;
    }
    m.opacity = b.opacity * (1 - d) + Math.min(b.opacity, GHOST_OPACITY) * d;
    m.depthWrite = ghost ? d < 0.5 && b.depthWrite : b.depthWrite;
    const vis = b.emissiveFace ? m.emissive : m.color;
    if (vis && b.color) vis.copy(b.color).lerp(PAPER, d * 0.55);
  }

  /** 0 = normal, 1 = fully ghosted. Cheap when unchanged. */
  set(id: SubsystemId, d: number) {
    const v = Math.round(Math.min(1, Math.max(0, d)) * 1000) / 1000;
    if (this.level.get(id) === v) return;
    this.level.set(id, v);
    const set = this.groups.get(id);
    if (set) for (const m of set) this.apply(m, v);
  }

  get(id: SubsystemId) {
    return this.level.get(id) ?? 0;
  }

  restoreAll() {
    for (const [id] of this.groups) this.set(id, 0);
  }
}
