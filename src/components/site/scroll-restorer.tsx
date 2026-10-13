"use client";

// Back/forward scroll restoration. With cacheComponents, a route hidden by <Activity> loses its
// window scroll position and nothing restores it on Back (lab-verified, with or without Lenis).
// This remembers the scroll position per path and restores it ONLY for browser back/forward
// (popstate) navigations; normal link navigations still start at the top.

import { useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const KEY = (path: string) => `apex:scroll:${path}`;
let popNavigation = false;

export function ScrollRestorer() {
  const pathname = usePathname();
  const lenis = useLenis();
  const current = useRef(pathname);

  // Flag browser back/forward.
  useEffect(() => {
    const onPop = () => {
      popNavigation = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Record the scroll position of the current path (rAF-throttled).
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        try {
          sessionStorage.setItem(KEY(current.current), String(Math.round(window.scrollY)));
        } catch {}
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // On path change: restore for popstate, otherwise leave Next's scroll-to-top alone.
  useEffect(() => {
    current.current = pathname;
    if (!popNavigation) return;
    popNavigation = false;
    let y = 0;
    try {
      y = Number(sessionStorage.getItem(KEY(pathname)) ?? 0);
    } catch {}
    if (!y) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      }),
    );
    return () => cancelAnimationFrame(id);
  }, [pathname, lenis]);

  return null;
}
