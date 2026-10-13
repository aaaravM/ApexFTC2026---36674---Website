"use client";

// Armed + Tally — the /robot page's own scroll-in choreography, built on the motion kit's useArm.
//
//   <Armed className="…">…</Armed>
//     One trigger for a whole figure: below the fold it is armed (data-m="armed"), and it plays
//     (data-m="play") when it scrolls in. The children choreograph themselves with the rp-fx-*
//     classes in ./robot-page.css, timed per element with CSS variables (`fx()` in ./fx.ts):
//       rp-fx-fade   fades in                 rp-fx-from  transform from --rp-from to --rp-to
//       rp-fx-dim    lights up from 35 %      rp-fx-clip  "types" in, left → right (--rp-steps)
//       rp-fx-dash   a pathLength=1 stroke draws          rp-fx-led   a status dot switches on
//
//   <Tally value={2590} suffix=" rpm" duration={0.65} ease="linear" />
//     A real number inside an <Armed> group that counts from zero on the GROUP's trigger, with its
//     own delay/duration/ease, so it stays in step with the drawing next to it.
//
// The server HTML is the final state (readable without JavaScript); figures already on screen at
// load stay static; under prefers-reduced-motion nothing is ever armed. ./settle finishes anything
// still armed when the route is hidden by <Activity>.

import { animate, type AnimationPlaybackControls } from "motion/react";
import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { useArm } from "@/components/motion";
import { nf } from "@/lib/format";
import "./robot-page.css";

type ArmedTag = "div" | "ul" | "ol" | "dl" | "p" | "figure";

export function Armed({
  as: Tag = "div",
  inset = 0.1,
  children,
  ...rest
}: {
  as?: ArmedTag;
  /** Fraction of the viewport bottom ignored before the group plays (default 0.1). */
  inset?: number;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  useArm(ref, { inset });
  return (
    // the tags share one ref type at runtime; TS can't narrow the union
    <Tag ref={ref as never} data-rp-group="" {...rest}>
      {children}
    </Tag>
  );
}

const EASES = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  linear: "linear",
} as const;

export interface TallyProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Seconds the count takes. */
  duration?: number;
  /** Seconds after the group starts playing. */
  delay?: number;
  ease?: keyof typeof EASES;
  className?: string;
}

export function Tally({ value, decimals = 0, prefix = "", suffix = "", duration = 1.2, delay = 0, ease = "out", className }: TallyProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const format = nf({ minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const final = `${prefix}${format.format(value)}${suffix}`;

  useLayoutEffect(() => {
    const el = ref.current;
    const txt = out.current;
    const group = el?.closest<HTMLElement>("[data-rp-group]");
    if (!el || !txt || !group) return;
    const f = nf({ minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const show = (n: number) => {
      txt.textContent = `${prefix}${f.format(n)}${suffix}`;
    };
    let ctl: AnimationPlaybackControls | undefined;

    // follow the group: armed → 0, play → count, settled / never armed → final value
    const sync = () => {
      const m = group.dataset.m;
      if (m === "armed") {
        ctl?.stop();
        el.dataset.m = "armed";
        show(0);
      } else if (m === "play") {
        if (el.dataset.m !== "armed") return;
        el.dataset.m = "play";
        ctl = animate(0, value, {
          duration,
          delay,
          ease: EASES[ease] as never,
          onUpdate: show,
          onComplete: () => show(value),
        });
      } else {
        ctl?.stop();
        delete el.dataset.m;
        show(value);
      }
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(group, { attributes: true, attributeFilter: ["data-m"] });
    return () => {
      mo.disconnect();
      // hidden mid-count (route hidden by Activity): land on the real value
      if (ctl) {
        ctl.stop();
        show(value);
      }
    };
  }, [value, decimals, prefix, suffix, duration, delay, ease]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      <span className="sr-only">{final}</span>
      <span ref={out} aria-hidden="true">
        {final}
      </span>
    </span>
  );
}
