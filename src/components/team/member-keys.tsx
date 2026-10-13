"use client";

// ← / → step through the roster on a member page (same directional slide as the links).
// Ignored while typing, inside widgets that own the arrow keys (tabs, sliders, dialogs, menus),
// and with modifier keys. The listener is removed when the page is hidden (Activity runs the
// effect cleanup), so hidden member pages never react.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const OWNS_ARROWS =
  '[role="tablist"],[role="tab"],[role="slider"],[role="dialog"],[role="listbox"],[role="menu"],[role="radiogroup"],[cmdk-root]';

export function MemberKeys({ prev, next }: { prev: string; next: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest(OWNS_ARROWS))) return;
      e.preventDefault();
      const back = e.key === "ArrowLeft";
      router.push(`/team/${back ? prev : next}`, {
        transitionTypes: [back ? "nav-back" : "nav-forward"],
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prev, next]);
  return null;
}
