"use client";

// One Lenis instance for the whole site (spec §2): lerp 0.1, smooth wheel, root mode (it moves
// the real window scroll, so motion's useScroll / IntersectionObserver / ScrollTrigger all work).
// Disabled — native scrolling — on touch devices and for prefers-reduced-motion users.
// Never scroll-jacks: it only smooths wheel input; page length is unchanged.
//
// Other components: `useLenis()` from "lenis/react" (undefined when Lenis is off — always handle
// that), `useScrollTo()` from "@/lib/hooks", and `data-lenis-prevent` on inner scroll areas.
// GSAP ScrollTrigger users: add `useLenis(ScrollTrigger.update)` in that component.

import { ReactLenis } from "lenis/react";
import { useMediaQuery } from "@/lib/hooks";

export function SmoothScroll() {
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)", true);
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)", false);
  if (reduce || !fine) return null;
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: -64 },
        stopInertiaOnNavigate: true,
        allowNestedScroll: true,
      }}
    />
  );
}
