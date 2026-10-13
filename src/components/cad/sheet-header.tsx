// Sheet header — the CAD page opening (DESIGN_SPEC §3 PageHeader pattern, drawn on the sheet):
// eyebrow [ 04 / CAD ] + H1 + lede + title-block meta row, with the drawing's REVISION block in the
// top-right corner (where real sheets keep it). Motion: the H1 rises, the lede follows word by word,
// the revision block types itself in row by row (caption → header → revisions) and the meta row
// wipes in — the page's single wipe. Server component.

import { ImageWipe, TextReveal } from "@/components/motion";
import { TitleBlock } from "@/components/site/page-header";
import { ConceptModelCaption } from "@/components/site/concept-model-caption";
import { isConceptModel } from "@/content/robot";
import type { CSSProperties } from "react";
import { drawing, revisions } from "./content";
import { Plot } from "./plot-motion";
import { seq } from "./plot-seq";
import { SheetLabel } from "./sheet-label";

export function RevisionBlock({ className, immediate }: { className?: string; immediate?: boolean }) {
  return (
    <Plot className={className} immediate={immediate} delay={immediate ? 0.7 : 0} step={0.14}>
      <table className="w-full border-collapse border border-fg font-mono text-[10px] leading-4 tracking-[0.06em] uppercase">
        <caption style={seq(0)} className="fx-type border border-b-0 border-fg px-2.5 py-1.5 text-left text-[10px] tracking-[0.08em] text-fg">
          Revisions
        </caption>
        <thead>
          <tr style={seq(1)} className="fx-type text-fg-muted">
            <th scope="col" className="w-10 border border-fg px-2.5 py-1 text-left font-normal">
              Rev
            </th>
            <th scope="col" className="border border-fg px-2.5 py-1 text-left font-normal">
              Description
            </th>
            <th scope="col" className="w-[92px] border border-fg px-2.5 py-1 text-left font-normal">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {revisions.map((r, i) => (
            <tr key={r.rev} style={seq(2 + i, { "--fx-dur": "0.7s", "--fx-steps": 30 } as CSSProperties)} className="fx-type align-top text-fg">
              <td className="border border-fg px-2.5 py-1.5">{r.rev}</td>
              <td className="border border-fg px-2.5 py-1.5 normal-case tracking-[0.02em]">{r.description}</td>
              <td className="border border-fg px-2.5 py-1.5 tabular-nums">{r.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Plot>
  );
}

export function SheetHeader() {
  return (
    <header className="relative pt-[clamp(28px,5vw,72px)] pb-[clamp(40px,6vw,88px)]">
      {/* revision block: top-right corner on desktop, after the meta row on smaller screens */}
      <div className="absolute top-0 right-0 hidden w-[min(440px,36%)] lg:block">
        <RevisionBlock immediate />
      </div>

      <SheetLabel code="04" label="CAD" immediate className="lg:mr-[calc(min(440px,36%)+28px)]" />
      <TextReveal as="h1" id="cad-title" immediate delay={0.15} text="Designed in CAD, built in shop." className="type-display mt-8 max-w-[16ch] sm:mt-10" />
      <TextReveal
        as="p"
        mode="words"
        immediate
        delay={0.55}
        stagger={0.018}
        duration={0.7}
        className="type-lede mt-6 sm:mt-8"
        text="Every subsystem is modelled before a single part is cut. Until our assemblies are public, this sheet shows the concept model generated from our code — take it apart, cut a section through it, and read why each mechanism is the shape it is."
      />
      <ImageWipe immediate from="left" delay={0.9} className="mt-10 sm:mt-14">
      <TitleBlock
        items={[
          { label: "DWG", value: drawing.number },
          { label: "REV", value: drawing.rev },
          { label: "UPDATED", value: drawing.date },
          { label: "TOOLS", value: "Onshape · Fusion 360" },
          { label: "MODEL", value: isConceptModel ? "Concept · real CAD pending" : "Team CAD" },
        ]}
      />
      </ImageWipe>
      <ConceptModelCaption className="mt-4" />
      <RevisionBlock className="mt-8 lg:hidden" />
    </header>
  );
}
