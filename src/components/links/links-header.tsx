// LINKS page header — the system PageHeader pattern (eyebrow [ 07 / LINKS ] + H1 + lede + title
// block; same spacing as src/components/site/page-header.tsx, built from its TitleBlock) with the
// motion kit layered on: the eyebrow decodes and its rule draws, the H1 rises letter by letter on
// load, and the live counts in the title block count up. Server Component.

import { Mark } from "@/components/brand/mark";
import { CountUp, LineDraw, Scramble, TextReveal } from "@/components/motion";
import { TitleBlock, type TitleBlockItem } from "@/components/site/page-header";
import { CONTENT_UPDATED } from "@/content/site";
import { LINKS_CHECKED, OFFICIAL_LINKS, TOTAL_LINKS } from "./link-data";

export function LinksHeader() {
  const items: TitleBlockItem[] = [
    { label: "DWG", value: "DWG-007" },
    { label: "REV", value: "A" },
    { label: "UPDATED", value: CONTENT_UPDATED },
    { label: "LINKS", value: <CountUp value={TOTAL_LINKS} immediate duration={1.1} /> },
    { label: "OFFICIAL", value: <CountUp value={OFFICIAL_LINKS} immediate duration={1.1} /> },
    { label: "CHECKED", value: LINKS_CHECKED },
  ];

  return (
    <header className="container-page pt-[calc(var(--header-h)+clamp(48px,9vw,128px))] pb-[clamp(48px,7vw,96px)]">
      <div className="flex items-center gap-4">
        <Scramble text="[ 07 / LINKS ]" immediate hover className="type-label shrink-0 text-fg-muted" />
        <LineDraw immediate delay={0.15} className="flex-1 text-hairline" />
      </div>
      <h1 id="links-title" className="type-display mt-8 max-w-[18ch] sm:mt-10">
        <TextReveal text="Resources we use." immediate delay={0.1} />
      </h1>
      <p className="type-lede mt-6 sm:mt-8">
        The manuals, docs and tools behind APEX-R1 — official <Mark id="first" symbol /> resources first, every link
        checked.
      </p>
      <TitleBlock items={items} className="mt-10 sm:mt-14" />
    </header>
  );
}
