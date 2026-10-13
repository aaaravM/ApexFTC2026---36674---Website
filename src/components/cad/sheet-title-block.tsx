// The drawing's title block (bottom-right of the sheet, zone A1 on a real drawing) and the
// general-notes block beside it. Motion: the notes are typed line by line; the title-block cells
// type in one after another while their values decode, and the team mark is stamped on last.
// Server component (Plot effects, ./plot.css).

import type { CSSProperties } from "react";
import { ApexWings } from "@/components/brand/apex-wings";
import { Scramble } from "@/components/motion";
import { isConceptModel } from "@/content/robot";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { drawing, generalNotes, MANUAL_URL } from "./content";
import { Plot } from "./plot-motion";
import { seq } from "./plot-seq";

/** Third-angle projection symbol (ASME): the truncated cone's small end faces its end view. */
export function ThirdAngleSymbol({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 66 30" className={className} role="img" aria-label="Third-angle projection">
      <g fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round">
        <path d="M4 5 L28 9.5 L28 20.5 L4 25 Z" />
        <circle cx="47" cy="15" r="10" />
        <circle cx="47" cy="15" r="5.5" />
      </g>
      <g stroke="currentColor" strokeWidth="0.6" strokeDasharray="5 1.5 1.2 1.5">
        <path d="M1 15 H62" />
        <path d="M47 2 V28" />
      </g>
    </svg>
  );
}

function Cell({ label, children, className, n }: { label: string; children: React.ReactNode; className?: string; n: number }) {
  return (
    <div className={cn("fx-type border-r border-b border-fg px-3 py-2", className)} style={seq(n)}>
      <dt className="font-mono text-[9px] leading-3 tracking-[0.1em] text-fg-muted uppercase">{label}</dt>
      <dd className="mt-1 font-mono text-[11px] leading-4 tracking-[0.04em] text-fg uppercase tabular-nums">
        {typeof children === "string" ? <Scramble text={children} duration={0.5} className="whitespace-normal" /> : children}
      </dd>
    </div>
  );
}

export function SheetTitleBlock() {
  return (
    <section
      aria-labelledby="cad-titleblock-title"
      className="mt-[clamp(72px,10vw,140px)] grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-12 lg:items-end lg:gap-[var(--gutter)]"
    >
      <h2 id="cad-titleblock-title" className="sr-only">
        Drawing notes and title block
      </h2>
      <div className="lg:col-span-6 xl:col-span-6">
        <p className="type-label text-fg">Notes</p>
        <Plot as="ol" className="mt-4 space-y-2.5 border-t border-fg pt-4" step={0.22}>
          {generalNotes.map((n, i) => (
            <li
              key={i}
              style={seq(i, { "--fx-dur": "0.6s", "--fx-steps": 28 } as CSSProperties)}
              className="fx-type grid grid-cols-[2.25rem_1fr] font-mono text-[11px] leading-[1.6] tracking-[0.02em] text-fg-muted"
            >
              <span className="text-fg tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span>
                {i === generalNotes.length - 1 ? (
                  <>
                    {n.replace(/\.$/, "")} —{" "}
                    <a href={MANUAL_URL} target="_blank" rel="noopener noreferrer" className="link-draw text-fg">
                      ftc.game/manual ↗<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    .
                  </>
                ) : (
                  n
                )}
              </span>
            </li>
          ))}
        </Plot>
      </div>

      <Plot as="dl" className="grid grid-cols-6 border-t border-l border-fg bg-bg lg:col-span-6 lg:col-start-7" step={0.07} delay={0.15}>
        <div className="col-span-6 flex items-center gap-4 border-r border-b border-fg px-3 py-3 sm:col-span-3">
          {/* the team's mark is stamped on last, like the approval stamp on a released drawing */}
          <span className="fx-stamp shrink-0" style={{ "--fx-own": "1.05s" } as CSSProperties}>
            <ApexWings size={40} className="text-fg" />
          </span>
          <div className="min-w-0">
            <dt className="sr-only">Drawn by</dt>
            <dd className="font-display text-[15px] leading-5 font-normal tracking-[0.16em] text-fg uppercase [font-stretch:125%]">
              {site.name}
            </dd>
            <dd className="font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
              FTC {site.teamNumber} · {site.locationShort}
            </dd>
          </div>
        </div>
        <Cell n={2} label="Title" className="col-span-6 sm:col-span-3">
          {drawing.title}
        </Cell>
        <Cell n={3} label="Drawn" className="col-span-3 sm:col-span-2">
          {drawing.drawn}
        </Cell>
        <Cell n={4} label="Date" className="col-span-3 sm:col-span-2">
          {drawing.date}
        </Cell>
        <Cell n={5} label="Units" className="col-span-2 sm:col-span-2">
          {drawing.units}
        </Cell>
        <Cell n={6} label="Dwg no" className="col-span-2">
          {drawing.number}
        </Cell>
        <Cell n={7} label="Rev" className="col-span-2 sm:col-span-1">
          {drawing.rev}
        </Cell>
        <Cell n={8} label="Sheet" className="col-span-2 sm:col-span-1">
          {drawing.sheet}
        </Cell>
        <Cell n={9} label="Scale" className="col-span-2 sm:col-span-1">
          {drawing.scale}
        </Cell>
        <div className="fx-type col-span-2 border-r border-b border-fg px-3 py-2 sm:col-span-1" style={seq(10)}>
          <dt className="font-mono text-[9px] leading-3 tracking-[0.1em] text-fg-muted uppercase">Proj.</dt>
          <dd className="mt-1 text-fg">
            <ThirdAngleSymbol className="h-[18px] w-auto" />
          </dd>
        </div>
        <Cell n={11} label="Status" className="col-span-6 sm:col-span-6">
          {isConceptModel ? "Concept model · real CAD pending" : "Team CAD"}
        </Cell>
      </Plot>
    </section>
  );
}
