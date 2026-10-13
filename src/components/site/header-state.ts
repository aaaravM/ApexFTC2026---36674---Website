"use client";

// Header overlay state. The header is solid (bg + blur + hairline) everywhere except over a live
// 3D canvas: on "/" it starts transparent, and the home story decides when it turns solid.
//
//   // in the home story (client component):
//   useHeaderOverlay(!storyFinished);   // true → transparent header; false → solid
//
// The preference is released automatically when the component unmounts or its route is hidden
// by <Activity> (effects clean up on hide), so other pages always get the solid header.

import { useEffect, useSyncExternalStore } from "react";

type Overlay = boolean | null;
let overlay: Overlay = null;
const listeners = new Set<() => void>();

function set(next: Overlay) {
  if (overlay === next) return;
  overlay = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** null = no page preference (header decides by route), true = transparent, false = solid. */
export function useHeaderOverlayState(): Overlay {
  return useSyncExternalStore(
    subscribe,
    () => overlay,
    () => null,
  );
}

/** Ask for a transparent (true) or solid (false) header while this component is mounted. */
export function useHeaderOverlay(transparent: boolean) {
  useEffect(() => {
    set(transparent);
  }, [transparent]);
  useEffect(() => () => set(null), []);
}
