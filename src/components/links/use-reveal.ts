"use client";

// useReveal — the trigger behind the Links rows' stagger (links-motion.css) and the 404 printout.
// A sibling of the motion kit's useArm, for CSS sequences that animate many children at once:
//
//   <ul ref={ref} className="lk-seq" data-m={immediate ? "play" : undefined}>…</ul>
//
//   • Server HTML is the final state. `immediate` groups are rendered with data-m="play", so their
//     CSS sequence starts on first paint — but if the group turns out to be below the fold when the
//     page hydrates (phones), it is quietly re-armed and plays when scrolled to instead.
//   • Below-the-fold groups are armed (hidden) and play when they scroll in; on-screen ones stay put.
//   • A couple of seconds after playing, data-m becomes "done", so rows that appear later (filtering)
//     don't replay the entrance.
//   • Safe under React Strict Mode and Next's <Activity> route hiding: cleanup never "settles" (that
//     would kill the animation in dev) — instead an armed group that is on screen when its effect
//     re-runs plays immediately, so a re-shown page is never left blank.
//   • Reduced motion: never armed (and the CSS only animates under no-preference).

import { useLayoutEffect, type RefObject } from "react";

export function useReveal(ref: RefObject<HTMLElement | null>, { settleAfter = 2.2 }: { settleAfter?: number } = {}) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.m === "done") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.m = "done";
      return;
    }

    let timer = 0;
    let io: IntersectionObserver | null = null;
    const settle = () => {
      timer = window.setTimeout(() => {
        el.dataset.m = "done";
      }, settleAfter * 1000);
    };
    const play = () => {
      el.dataset.m = "play";
      el.dataset.mPlayed = "";
      settle();
    };
    const r = el.getBoundingClientRect();
    const onScreen = r.top < window.innerHeight && r.bottom > 0;

    if (el.dataset.m === "play" && (onScreen || "mPlayed" in el.dataset)) {
      // An immediate group on screen (its CSS is already running), or a replayed effect.
      el.dataset.mPlayed = "";
      settle();
    } else if (onScreen) {
      if (el.dataset.m === "armed") play();
      else el.dataset.m = "done"; // visible at load: stay static (no visible → hidden flash)
    } else {
      el.dataset.m = "armed";
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io?.disconnect();
          play();
        },
        { rootMargin: "0px 0px -10% 0px" },
      );
      io.observe(el);
    }

    return () => {
      io?.disconnect();
      window.clearTimeout(timer);
    };
  }, [ref, settleAfter]);
}
