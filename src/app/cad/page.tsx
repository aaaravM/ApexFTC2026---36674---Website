// CAD — DWG-004, APEX-R1 general assembly (DESIGN_SPEC §5 CAD). The whole page body is one drawing
// sheet on the light drafting sub-theme in both site themes (src/components/cad/cad.css re-declares
// the full token + shadcn alias block on the sheet, ERRATA #1): zone bands, plotted borders, a
// revision block, VIEW 1 (blueprint 3D viewer with orbit, EXPLODE, SECTION A–A and the
// direction-aware-tabs assembly switcher), critical dimensions, the model index CAD-001…004,
// design stories DS-01…04, the toolchain, notes and the title block.
// Motion is PLOTTED, and varies section to section (the team asked for more, and not "the same line
// swipe" everywhere): borders draw and zones tick in on load; VIEW 1 is scanned in and its section
// plane demos itself; dimensions draw then count; index rows feed in and get stamped; the design
// stories build as flowcharts; the toolchain cards flip down; the title block types itself in.

import type { Metadata } from "next";
import { ScrollProgress, StretchIn, TextReveal } from "@/components/motion";
import { PageTransition } from "@/components/site/page-transition";
import { CriticalDims } from "@/components/cad/critical-dims";
import { DesignStories } from "@/components/cad/design-stories";
import { ModelIndex } from "@/components/cad/model-index";
import { DrawingSheet } from "@/components/cad/sheet";
import { SheetHeader } from "@/components/cad/sheet-header";
import { SheetLabel } from "@/components/cad/sheet-label";
import { SheetTitleBlock } from "@/components/cad/sheet-title-block";
import { Toolchain } from "@/components/cad/toolchain";
import { CadWorkspace } from "@/components/cad/workspace";

export const metadata: Metadata = {
  title: "CAD",
  description:
    "DWG-004, the APEX-R1 general assembly: a blueprint 3D viewer you can explode and section, the four CAD documents, and the design decisions behind each mechanism.",
};

function SectionHead({
  id,
  code,
  label,
  title,
  lede,
  rule = "draw",
  fx = "chars",
}: {
  id: string;
  code: string;
  label: string;
  title: string;
  lede?: string;
  rule?: "draw" | "draw-right" | "scale";
  /** How the heading arrives: letters rise, words rise, or Hubot's width axis opens. */
  fx?: "chars" | "words" | "stretch";
}) {
  return (
    <>
      <SheetLabel code={code} label={label} rule={rule} />
      {fx === "stretch" ? (
        <h2 id={id} className="type-h2 mt-6 max-w-[22ch] sm:mt-8">
          <StretchIn from="70%" to="108%">
            {title}
          </StretchIn>
        </h2>
      ) : (
        <TextReveal as="h2" id={id} mode={fx} text={title} className="type-h2 mt-6 max-w-[22ch] sm:mt-8" />
      )}
      {lede && <p className="mt-5 max-w-[60ch] text-[16px] leading-[1.55] text-[var(--lede)]">{lede}</p>}
    </>
  );
}

export default function CadPage() {
  return (
    <PageTransition>
      <ScrollProgress />
      <div className="page-x mx-auto max-w-[1520px] pt-[calc(var(--header-h)+clamp(16px,3vw,40px))] pb-[clamp(48px,7vw,96px)]">
        <DrawingSheet dwg="DWG-004">
          <SheetHeader />

          <section id="cad-view" aria-labelledby="cad-view-title" className="scroll-mt-20 pt-[clamp(24px,4vw,48px)]">
            <SectionHead
              id="cad-view-title"
              code="VIEW 1"
              label="GENERAL ASSEMBLY"
              title="Take it apart. Cut through it."
              lede="Pick an assembly, then explode it or slide the section plane through it. The dimensions on the drawing are the team's own numbers."
            />
            <div className="mt-10">
              <CadWorkspace />
            </div>
            <CriticalDims />
          </section>

          <section aria-labelledby="cad-index-title" className="pt-[clamp(72px,10vw,140px)]">
            <SectionHead
              id="cad-index-title"
              code="LIST"
              label="MODEL INDEX"
              rule="scale"
              fx="words"
              title="Four documents, one robot."
              lede="Each subsystem lives in its own CAD document. The public links go here as soon as the documents are shared."
            />
            <ModelIndex />
          </section>

          <section aria-labelledby="cad-stories-title" className="pt-[clamp(72px,10vw,140px)]">
            <SectionHead
              id="cad-stories-title"
              code="DS"
              label="DESIGN STORIES"
              rule="draw-right"
              title="Why each mechanism is the shape it is."
              lede="Requirement, options, decision and the maths behind it, what changed, and what could still go wrong, for each mechanism."
            />
            <DesignStories />
          </section>

          <section aria-labelledby="cad-tools-title" className="pt-[clamp(72px,10vw,140px)]">
            <SectionHead id="cad-tools-title" code="T" label="TOOLCHAIN" title="From model to part." rule="scale" fx="stretch" />
            <Toolchain />
          </section>

          <SheetTitleBlock />
        </DrawingSheet>
      </div>
    </PageTransition>
  );
}
