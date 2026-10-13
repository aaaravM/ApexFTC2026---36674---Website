"use client";

// Small client hooks shared by the pages. All are SSR-safe: the server snapshot is a fixed
// default, so nothing mismatches during hydration.

import { useCallback, useSyncExternalStore } from "react";
import { useLenis } from "lenis/react";

/** Live `matchMedia` result. Server snapshot = `serverDefault` (false unless given). */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}

/** prefers-reduced-motion: reduce (false on the server). motion's `useReducedMotion` also works. */
export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** A fine pointer that can hover (mouse / trackpad). False on touch screens and on the server. */
export const useFinePointer = () => useMediaQuery("(hover: hover) and (pointer: fine)");

/** Below the desktop header breakpoint (900px). */
export const useIsMobile = () => useMediaQuery("(max-width: 899.98px)");

const noopSubscribe = () => () => {};
/** True on the client after hydration, false on the server — gate browser-only UI with it. */
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Smooth-scroll to an element / id / y position. Uses Lenis when it is running (desktop, motion
 * allowed) and native scrolling otherwise; instant under reduced motion. Offsets for the fixed
 * 56px header by default.
 *
 *   const scrollTo = useScrollTo();
 *   <button onClick={() => scrollTo("#robot-turret")}>Turret</button>
 */
export function useScrollTo() {
  const lenis = useLenis();
  return useCallback(
    (target: string | HTMLElement | number, opts: { offset?: number; immediate?: boolean } = {}) => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const offset = opts.offset ?? (typeof target === "number" ? 0 : -64);
      const immediate = opts.immediate ?? reduce;
      if (lenis) {
        lenis.scrollTo(target, { offset, immediate, force: true });
        return;
      }
      let y: number;
      if (typeof target === "number") y = target;
      else {
        const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
        if (!el) return;
        y = el.getBoundingClientRect().top + window.scrollY;
      }
      window.scrollTo({ top: y + offset, behavior: immediate ? "auto" : "smooth" });
    },
    [lenis],
  );
}
