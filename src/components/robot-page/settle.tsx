"use client";

// Settle — keeps the motion kit honest across Next's <Activity> route hiding (cacheComponents
// keeps up to 3 visited routes mounted).
//
// useArm "arms" below-the-fold elements (data-m="armed": hidden / zeroed) and plays them when they
// scroll in. If /robot is hidden before they play and shown again with them already ON screen,
// useArm's effect re-runs, sees them on screen and returns — leaving them armed (blank rules,
// "0" figures, dotted labels). And elements that HAVE played keep data-m="play": hidden routes
// are display:none, and CSS animations restart when an element is displayed again, so every
// figure would replay on return (the shooter bars refilling beside numbers that don't recount).
// This wrapper's layout-effect cleanup runs when the route is hidden (or unmounts) and settles
// every armed or played element inside it into its final, static state (no data-m).
// (Same idea as the Team page's SettleOnHide; the root fix belongs in motion/use-arm.ts.)

import { useLayoutEffect, useRef, type ReactNode } from "react";

function settle(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-m]").forEach((el) => {
    delete el.dataset.m;
    el.dataset.played = "";
    // CountUp / Tally / Scramble keep the real text in an sr-only twin — restore the visible copy
    // from it (TextReveal's twin has child elements and is left alone).
    const sr = el.querySelector<HTMLElement>(":scope > .sr-only");
    const shown = sr?.nextElementSibling as HTMLElement | null | undefined;
    if (sr && shown?.getAttribute("aria-hidden") === "true" && shown.childElementCount === 0) {
      shown.textContent = sr.textContent;
    }
  });
}

export function Settle({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    return () => {
      if (root) settle(root);
    };
  }, []);
  return <div ref={ref}>{children}</div>;
}
