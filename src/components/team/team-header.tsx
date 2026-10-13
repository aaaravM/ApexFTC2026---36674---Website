// TEAM page header — the system PageHeader pattern (eyebrow [ 01 / TEAM ] + H1 + lede + title
// block, same spacing as src/components/site/page-header.tsx, built from its own TitleBlock and
// SectionLabel), plus the 12-frame contact sheet on the right at desktop widths, so "Meet the
// team." opens on faces rather than on text. Counts are computed from the roster. Server component.

import { CountUp, TextReveal } from "@/components/motion";
import { TitleBlock, type TitleBlockItem } from "@/components/site/page-header";
import { CONTENT_UPDATED } from "@/content/site";
import { DISCIPLINES, rosterCounts } from "@/content/team";
import { pad2, rosterStats, teamLede } from "./data";
import { HeaderSheet } from "./header-sheet";
import { SectionTag } from "./section-tag";

/** A zero-padded readout ("07") that counts up on first paint — the real roster number. */
function Count({ n, suffix }: { n: number; suffix?: string }) {
  return <CountUp value={n} prefix={n < 10 ? "0" : ""} suffix={suffix} immediate duration={1.1} />;
}

export function TeamHeader() {
  const counts = rosterCounts();
  const stats = rosterStats();
  const items: TitleBlockItem[] = [
    { label: "DWG", value: "DWG-001" },
    { label: "REV", value: "A" },
    { label: "UPDATED", value: CONTENT_UPDATED },
    { label: "Students", value: <Count n={stats.total} /> },
    ...DISCIPLINES.map((d) => ({ label: d, value: <Count n={counts[d]} /> })),
    {
      label: "Photos",
      value: <Count n={stats.photos} suffix={` / ${pad2(stats.total)}`} />,
    },
    {
      label: "Bios",
      value: <Count n={stats.bios} suffix={` / ${pad2(stats.total)}`} />,
    },
  ];

  return (
    <header className="container-page pt-[calc(var(--header-h)+clamp(48px,9vw,128px))] pb-[clamp(48px,7vw,96px)]">
      <SectionTag code="01" label="TEAM" immediate />
      <div className="mt-8 grid gap-x-[var(--gutter)] gap-y-10 sm:mt-10 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-8">
          <h1 id="team-title" className="type-display max-w-[18ch]">
            <TextReveal text="Meet the team." immediate />
          </h1>
          <TextReveal
            as="p"
            mode="words"
            text={teamLede()}
            immediate
            delay={0.35}
            stagger={0.035}
            className="type-lede mt-6 sm:mt-8"
          />
        </div>
        <div className="hidden lg:col-span-4 lg:col-start-9 lg:block">
          <HeaderSheet />
        </div>
      </div>
      <TitleBlock items={items} className="mt-10 sm:mt-14" />
    </header>
  );
}
