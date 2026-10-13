// "Where the work shows up" — the TEAM page's closing index: each discipline on the roster → the
// page where its work lives (robot, CAD, code, outreach), with the live head-count per
// discipline, then the sponsor ask and the youth-protection note. Server component.

import { Mark } from "@/components/brand/mark";
import type { CSSProperties } from "react";
import { LineDraw, Magnetic, RollText, Scramble, TextReveal } from "@/components/motion";
import { ButtonLink } from "@/components/site/button";
import { TransitionLink } from "@/components/site/transition-link";
import { rosterCounts } from "@/content/team";
import { crewLabel, workLinks } from "./data";
import { Rise } from "./rise";
import { SectionTag } from "./section-tag";

export function WorkIndex() {
  const counts = rosterCounts();
  const links = workLinks();
  return (
    <section aria-labelledby="team-work-title" className="container-page pb-[clamp(64px,8vw,112px)]">
      <SectionTag code="03" label="WHERE THE WORK SHOWS UP" />
      <div className="mt-10 grid gap-x-[var(--gutter)] gap-y-10 lg:mt-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <TextReveal as="h2" id="team-work-title" text="See the work." className="type-h2" />
          <TextReveal
            as="p"
            mode="words"
            delay={0.25}
            stagger={0.025}
            className="type-body mt-6 text-fg-muted"
            text="Every discipline on the roster has a page of its own — the machine we build, the drawings behind it, the code that aims it and the outreach log."
          />
        </div>
        <Rise as="ol" variant="slide" className="border-t border-hairline lg:col-span-8 lg:col-start-5">
          {links.map((w, i) => (
            <li key={w.href} className="border-b border-hairline" style={{ "--i": i } as CSSProperties}>
              <TransitionLink
                href={w.href}
                className="group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-x-4 py-5 sm:grid-cols-[3rem_minmax(0,11rem)_minmax(0,1fr)_auto] sm:py-6"
              >
                <Scramble
                  text={w.index}
                  className="font-mono text-[11px] tracking-[0.08em] text-fg-muted tabular-nums"
                />
                <span className="min-w-0">
                  <span className="block font-display text-[22px] leading-tight font-[560] [font-stretch:108%] transition-colors duration-[120ms] group-hover:text-pollen-text group-focus-visible:text-pollen-text">
                    <RollText>{w.label}</RollText>
                  </span>
                  <span className="mt-1 block font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase tabular-nums">
                    {w.discipline} · {crewLabel(w.discipline, counts[w.discipline])}
                  </span>
                </span>
                <span className="col-start-2 row-start-2 mt-2 text-[15px] leading-6 text-fg-muted sm:col-start-3 sm:row-start-1 sm:mt-0">
                  {w.blurb}
                </span>
                <span
                  aria-hidden="true"
                  className="col-start-3 row-start-1 font-mono text-[14px] text-fg transition-transform duration-[220ms] ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none sm:col-start-4"
                >
                  →
                </span>
              </TransitionLink>
            </li>
          ))}
        </Rise>
      </div>

      <LineDraw className="mt-[clamp(64px,9vw,120px)] text-hairline" />
      <div className="grid gap-x-[var(--gutter)] gap-y-8 pt-8 lg:grid-cols-12">
        <TextReveal
          as="p"
          mode="words"
          stagger={0.03}
          className="type-lede lg:col-span-7"
          text="A rookie team runs on its partners. Founding Partners fund the parts, the practice field and the event fees for our first season."
        />
        <div className="flex items-start lg:col-span-4 lg:col-start-9 lg:justify-end">
          <Magnetic>
            <ButtonLink href="/sponsors" arrow>
              <RollText>Become a Founding Partner</RollText>
            </ButtonLink>
          </Magnetic>
        </div>
        <p className="font-mono text-[10px] leading-5 tracking-[0.08em] text-fg-muted uppercase lg:col-span-12">
          Student photos appear only with photo consent · No student contact details are published · <Mark id="first" />{" "}
          Youth Protection Program
        </p>
      </div>
    </section>
  );
}
