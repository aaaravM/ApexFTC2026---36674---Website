"use client";

// SettleOnHide — guards the motion kit's scroll-in effects (TextReveal, Scramble, LineDraw,
// ImageWipe, CountUp, useArm) across Next's <Activity> route hiding.
//
// Why: useArm "arms" below-the-fold elements (data-m="armed": hidden / zeroed) and plays them when
// they scroll in. If the route is hidden before they play and shown again with them ON screen,
// useArm's effect re-runs, sees them on screen and returns — leaving them armed forever (blank
// portraits, "0" counters, dotted labels). This wrapper's layout-effect cleanup runs when the
// route is hidden (or unmounts) and settles every still-armed element inside it into its final,
// static state, so a re-shown page is always complete. (Root fix requested for use-arm.ts.)
// Scramble/CountUp may be mid-run when the page hides: restoring the text from the sr-only twin
// below covers them too (their rAF/animate loops end by writing the final text anyway).

import { useLayoutEffect, useRef, type ReactNode } from "react";

// Also settles elements that already PLAYED (data-m="play"): Activity hides a route with
// display:none, and CSS animations restart when it is shown again — so without this, going back
// to /team would replay every wipe and reveal, and the card print would start fully clipped right
// when the portrait morphs back into it. Settled = no data-m = the static final state.
function settle(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-m]").forEach((el) => {
    delete el.dataset.m;
    el.dataset.played = "";
    // CountUp / Scramble keep the real text in an sr-only twin — restore the visible copy from it.
    const sr = el.querySelector<HTMLElement>(":scope > .sr-only");
    const shown = sr?.nextElementSibling as HTMLElement | null | undefined;
    if (sr && shown?.getAttribute("aria-hidden") === "true" && shown.childElementCount === 0) {
      shown.textContent = sr.textContent;
    }
  });
}

export function SettleOnHide({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    return () => {
      if (root) settle(root);
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
