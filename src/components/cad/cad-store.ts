"use client";

// A tiny shared store so the separate client islands on /cad agree on the selected assembly:
// the VIEW 1 tabs, the model index ("View in 3D") and the design stories all read and set it.
// Module state on purpose — the route stays mounted under Activity, so the selection survives a
// round trip to another page.

import { useSyncExternalStore } from "react";
import type { AssemblyId } from "./content";

let assembly: AssemblyId = "full";
const listeners = new Set<() => void>();

export const cadStore = {
  get: () => assembly,
  set(next: AssemblyId) {
    if (next === assembly) return;
    assembly = next;
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useCadAssembly() {
  return useSyncExternalStore(cadStore.subscribe, cadStore.get, () => "full" as AssemblyId);
}
