"use client";

// The 404 page's printout — Watermelon UI error-3's "CONNECTION SEVERED" panel, rewritten as the
// real return value of Ballistics.solve() for a HIVE CELL placed 404 ft away (see shot.ts), plus the
// nearest page that IS in range for the address that missed ("/robots" → /robot).
// Motion: on load (or when scrolled to, on phones) the lines print one after another like a
// terminal, the status decodes to NO SOLUTION, and the failReason types itself out (typewriter.tsx) — use-reveal.ts + links-motion.css.

import { useRef, type CSSProperties, type ReactNode } from "react";
import "@/components/links/links-motion.css";
import { useReveal } from "@/components/links/use-reveal";
import { Scramble } from "@/components/motion";
import { TransitionLink } from "@/components/site/transition-link";
import { SHOOTER } from "@/lib/ballistics";
import { fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { nearestTarget, useRequestedPath } from "./requested-path";
import { REQUIRED, TARGET_FT } from "./shot";
import { Typewriter } from "./typewriter";

const line = (i: number) => ({ "--i": i }) as CSSProperties;

export function SolverPrintout({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  const path = useRequestedPath();
  const nearest = nearestTarget(path);

  const rows: { k: string; v: ReactNode }[] = [
    {
      k: "target",
      v: (
        <>
          <span className="text-fg">“{path ?? "…"}”</span> · {TARGET_FT} ft
        </>
      ),
    },
    {
      k: "needs",
      v: (
        <>
          <span className="text-fg">{fmtInt(REQUIRED.flywheelRpm)} rpm</span> · max {fmtInt(SHOOTER.maxFlywheelRpm)}
        </>
      ),
    },
    { k: "iterations", v: <span className="text-fg">{REQUIRED.iterations}</span> },
    { k: "valid", v: <span className="text-fg">false</span> },
    {
      k: "failReason",
      v: (
        <span className="text-fg">
          <Typewriter text={`“${REQUIRED.failReason}”`} delay={1.5} />
        </span>
      ),
    },
  ];

  return (
    <div
      ref={ref}
      data-m="play"
      style={{ "--lk-delay": "0.7s" } as CSSProperties}
      className={cn("lk-seq border border-hairline bg-surface-1", className)}
    >
      <div className="lk-print flex items-center justify-between gap-4 border-b border-hairline px-4 py-2.5" style={line(0)}>
        <p className="type-label text-fg-muted">Ballistics.solve()</p>
        <p className="type-label flex items-center gap-2 text-fg">
          <span aria-hidden="true" className="size-1.5 rounded-full border border-border-ui" />
          <Scramble text="No solution" immediate duration={1.6} />
        </p>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 px-4 py-4 font-mono text-[12px] leading-5 text-fg-muted">
        {rows.map(({ k, v }, i) => (
          <div key={k} className="contents">
            <dt className="lk-print" style={line(i + 1)}>
              {k}
            </dt>
            <dd className="lk-print min-w-0 break-words" style={line(i + 1)}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
      <div
        className="lk-print flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-hairline px-4 py-3 font-mono text-[12px] leading-5"
        style={line(rows.length + 1)}
      >
        <span className="text-fg-muted">nearest in range</span>
        <TransitionLink href={nearest.href} className="group/near inline-flex items-baseline gap-2 text-fg">
          <span className="link-draw group-hover/near:[background-size:100%_1px] group-focus-visible/near:[background-size:100%_1px]">
            <span className="font-sans text-[13px]">{nearest.label}</span>
          </span>
          <span className="text-fg-muted">{nearest.href}</span>
          <span
            aria-hidden="true"
            className="transition-transform duration-[220ms] ease-out group-hover/near:translate-x-1 group-focus-visible/near:translate-x-1 motion-reduce:transition-none"
          >
            →
          </span>
        </TransitionLink>
      </div>
    </div>
  );
}
