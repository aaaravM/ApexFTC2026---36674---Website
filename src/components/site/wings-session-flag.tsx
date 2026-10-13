"use client";

// After the first wings draw-on of a session finishes, mark <html data-wings="drawn"> and
// remember it in sessionStorage, so later page loads (and later-mounted marks) show the finished
// mark instead of re-drawing. The inline script in layout.tsx applies the flag before paint.

import { useEffect } from "react";

export const WINGS_SESSION_KEY = "apex:wings";

export function WingsSessionFlag() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.wings === "drawn") return;
    // draw 700ms + fill 250ms + flap 820ms ≈ 1.8s
    const t = window.setTimeout(() => {
      root.dataset.wings = "drawn";
      try {
        sessionStorage.setItem(WINGS_SESSION_KEY, "drawn");
      } catch {
        /* private mode / blocked storage: the mark simply draws again next load */
      }
    }, 1900);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
