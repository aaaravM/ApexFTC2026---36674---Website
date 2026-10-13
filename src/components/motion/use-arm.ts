"use client";

// Shared trigger for the motion kit. The server renders the FINAL state, so text is readable
// before JS and nothing flashes on load. After hydration:
//   - elements already on screen stay static (no visible → hidden → animated flash)
//   - elements below the fold are "armed" (hidden) and "play" when they scroll into view
//   - `immediate` CSS effects are rendered with data-m="play" on the server and animate on first
//     paint (see motion.css) — this hook leaves them alone; JS effects (CountUp, Scramble) start on mount
// Reduced motion: never armed. Safe under Next's Activity: re-running effects is a no-op once played,
// an element that comes back on screen still armed plays, and finished effects settle when hidden.

import { useLayoutEffect, type RefObject } from "react";

export interface ArmOptions {
  immediate?: boolean;
  /** Fraction of the viewport bottom ignored before triggering (default 0.12 → plays a little after entering). */
  inset?: number;
  /** Runs when the element is hidden, waiting to play (e.g. reset a counter to 0). */
  onArm?: () => void;
  /** Runs when the element starts playing (JS-driven effects). */
  onPlay?: () => void;
}

/** When each element started playing. Used to settle finished effects when Next's Activity hides
 *  the route: a hidden route is display:none, and CSS animations restart when it is shown again, so
 *  a finished effect would replay on Back. Dropping data-m leaves the static final state. */
const playedAt = new WeakMap<HTMLElement, number>();
const SETTLE_AFTER_MS = 3000;
function settle(el: HTMLElement) {
  const t = playedAt.get(el);
  if (el.dataset.m === "play" && t !== undefined && performance.now() - t > SETTLE_AFTER_MS) delete el.dataset.m;
}

export function useArm(ref: RefObject<HTMLElement | null>, { immediate, inset = 0.12, onArm, onPlay }: ArmOptions = {}) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const settleOnHide = () => settle(el);
    if (el.dataset.played !== undefined) return settleOnHide; // "" once played (falsy — compare to undefined)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const play = () => {
      el.dataset.m = "play";
      el.dataset.played = "";
      playedAt.set(el, performance.now());
      onPlay?.();
    };

    if (immediate) {
      if (onPlay) {
        onArm?.();
        play();
      } else {
        el.dataset.played = "";
        playedAt.set(el, performance.now());
      }
      return settleOnHide;
    }

    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      // on screen at load → stay static. If it was armed when an Activity hid the route and it comes
      // back already on screen, play it now so it can't stay hidden.
      if (el.dataset.m === "armed") play();
      return settleOnHide;
    }

    el.dataset.m = "armed";
    onArm?.();
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          play();
          io.disconnect();
        }
      },
      { rootMargin: `0px 0px -${Math.round(inset * 100)}% 0px` },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      settleOnHide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, inset]);
}
