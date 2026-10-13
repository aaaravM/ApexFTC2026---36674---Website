"use client";

/**
 * React plumbing shared by the parts:
 *   - RobotContext: current look + one MaterialLibrary per subsystem (and one for the harness)
 *   - SubsystemScope: which library the parts below it use (for highlight ghosting / harness fade)
 *   - RigRegistry: named Object3D refs the animation loop drives (wheels, flywheel, explode groups…)
 * Parts also work standalone (outside <ApexRobot>): they fall back to a shared studio library.
 */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type * as THREE from "three";
import { DEFAULT_ACCENT, MaterialLibrary, type MaterialRole } from "./materials";
import type { RobotLook, SubsystemId } from "./rig";

/** A material scope: a subsystem, or the cross-subsystem wiring harness. */
export type MaterialScope = SubsystemId | "harness";

export interface RobotContextValue {
  look: RobotLook;
  libraries: Record<MaterialScope, MaterialLibrary> | null;
  registry: RigRegistry;
}

export class RigRegistry {
  private objects = new Map<string, THREE.Object3D>();
  set(name: string, obj: THREE.Object3D | null) {
    if (obj) this.objects.set(name, obj);
    else this.objects.delete(name);
  }
  get(name: string) {
    return this.objects.get(name);
  }
}

let fallbackLibrary: MaterialLibrary | null = null;
function getFallbackLibrary() {
  if (!fallbackLibrary) fallbackLibrary = new MaterialLibrary("studio", DEFAULT_ACCENT, "blue");
  return fallbackLibrary;
}
const fallbackRegistry = new RigRegistry();

const RobotContext = createContext<RobotContextValue>({
  look: "studio",
  libraries: null,
  registry: fallbackRegistry,
});
const SubsystemContext = createContext<MaterialScope>("drivetrain");

export function RobotProvider({ value, children }: { value: RobotContextValue; children: ReactNode }) {
  return <RobotContext.Provider value={value}>{children}</RobotContext.Provider>;
}

/** Everything rendered inside uses `id`'s material library (and is ghosted / faded with it). */
export function SubsystemScope({ id, children }: { id: MaterialScope; children: ReactNode }) {
  return <SubsystemContext.Provider value={id}>{children}</SubsystemContext.Provider>;
}

export function useRobotLook() {
  return useContext(RobotContext).look;
}
export function useSubsystem() {
  return useContext(SubsystemContext);
}

export function useLibrary() {
  const { libraries } = useContext(RobotContext);
  const id = useContext(SubsystemContext);
  return libraries ? libraries[id] : getFallbackLibrary();
}

export function useRobotMaterial(role: MaterialRole) {
  const lib = useLibrary();
  return useMemo(() => lib.get(role), [lib, role]);
}

export function useRobotLineMaterial(role: MaterialRole) {
  const lib = useLibrary();
  return useMemo(() => lib.line(role), [lib, role]);
}

/** Callback ref that registers an object under `name` for the animation loop. */
export function useRigRef<T extends THREE.Object3D>(name: string) {
  const { registry } = useContext(RobotContext);
  return useCallback(
    (obj: T | null) => {
      registry.set(name, obj);
    },
    [registry, name],
  );
}
