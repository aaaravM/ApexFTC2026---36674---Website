// SPONSORS — "Become a Founding Partner." (DESIGN_SPEC §5 SPONSORS)
//
//   06.1 TIERS          Gold $500+ · Silver $250+ · Bronze $100+ (+ in-kind) from the REAL packet, with
//                       their real benefits; every slot OPEN — no sponsor name is ever invented. The
//                       nameplate's logo blank scales with the tier (the packet's large/medium/small).
//   06.2 WHY            the packet's four reasons.
//        ticker         what the money buys — packet budget lines + the real APEX-R1 parts (marquee).
//   06.3 WHERE IT GOES  $3,800–$5,500 on one shared axis; ≈$550 and ≈$650+ sized, the rest VARIES;
//                       "size a contribution" needle → tier + share of the budget.
//   06.4 CONTACT        packet CTA, team-inbox slot, registration links, FIG. 1 plaque.
//
// Motion (the team asked for more AND more varied, kept monochrome) — each section moves its own way:
//   header   H1 rises letter by letter on load, eyebrow decodes, title-block rule draws
//   06.1     tier plates rise and tip up (rotateX) in sequence; $100/$250/$500 count up; benefit
//            lines tick in as their check strokes draw; OPEN logo blanks wear marching-ants dashes
//   06.2     each reason's rule draws across, its number decodes, the words fade in place (sticky head)
//   ticker   what the money buys scrolls by (pauses on hover / reduced motion)
//   06.3     budget bars measure out left → right while their values count; the total runs to
//            $3,800 and the hatched range opens to $5,500; the needle follows the slider
//   06.4     packet CTA rolls + leans (Magnetic); the plaque wipes in, its wings flap once and its
//            open slot's dashes march.
//
// Tiers, budget and partners live in src/content/sponsors.ts; extra packet lines in
// src/components/sponsors/packet.ts. A signed partner (with permission) goes in `sponsors`.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MarkText } from "@/components/brand/mark";
import { CountUp, ImageWipe, LineDraw, Magnetic, RollText, Scramble, ScrollProgress, TextReveal } from "@/components/motion";
import { Entrance } from "@/components/outreach/entrance";
import { Parallax, Stagger, StaggerItem } from "@/components/outreach/motion-safe";
import { JumpLink } from "@/components/outreach/jump-link";
import { MotionButtonLink, MotionHeader, MotionLabel } from "@/components/outreach/motion-bits";
import { buttonClasses } from "@/components/site/button";
import { PageTransition } from "@/components/site/page-transition";
import { Pending } from "@/components/site/pending";
import { BudgetInstrument } from "@/components/sponsors/budget-instrument";
import { BudgetKey } from "@/components/sponsors/budget-key";
import { FoundingPlaque } from "@/components/sponsors/founding-plaque";
import { FundsMarquee } from "@/components/sponsors/funds-marquee";
import { packetCopy } from "@/components/sponsors/packet";
import { InKindBand, TierCard } from "@/components/sponsors/tier-card";
import { site } from "@/content/site";
import { budget, sponsorPage, sponsors, tiers, type TierId } from "@/content/sponsors";
import { fmtFixed } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sponsors",
  description: sponsorPage.lede,
};

const sectionClass = "container-page scroll-mt-[calc(var(--header-h)+24px)]";

const VERIFY = [
  { label: "Team 36674 on FTC Events", href: site.links.ftcEvents },
  { label: "FTCScout", href: site.links.ftcScout },
  { label: "Robot code on GitHub", href: site.links.github },
];

function ExternalText({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export default function SponsorsPage() {
  const cash = tiers.filter((t) => t.minUsd !== null);
  const inKind = tiers.find((t) => t.minUsd === null);
  const entryTier = cash.reduce<(typeof cash)[number] | undefined>(
    (lo, t) => (!lo || (t.minUsd ?? 0) < (lo.minUsd ?? 0) ? t : lo),
    undefined,
  );
  const partnersOf = (id: TierId) => sponsors.filter((s) => s.tier === id);
  const [low, high] = budget.rangeUsd;
  const email = site.links.email;

  return (
    <PageTransition>
      <ScrollProgress />
      <MotionHeader
        index="06"
        section="SPONSORS"
        title={sponsorPage.title}
        lede={sponsorPage.lede}
        titleId="sponsors-title"
        meta={[
          { label: "PARTNERS", value: sponsors.length ? String(sponsors.length).padStart(2, "0") : "00 · OPEN" },
          { label: "TIERS FROM", value: entryTier ? entryTier.amount : "IN-KIND" },
          { label: "BUDGET", value: `$${fmtFixed(low / 1000, 1)}K–${fmtFixed(high / 1000, 1)}K` },
        ]}
      >
        <MotionButtonLink href={site.links.sponsorPacket} external>
          View the sponsorship packet
        </MotionButtonLink>
        <JumpLink href="#sponsors-budget">Where the money goes</JumpLink>
      </MotionHeader>

      {/* 06.1 — tiers */}
      <section id="sponsors-tiers" aria-labelledby="sponsors-tiers-title" className={`${sectionClass} pb-[var(--section-pad)]`}>
        <MotionLabel code="06.1" label="TIERS" />
        <div className="mt-10 grid gap-y-6 lg:grid-cols-12 lg:gap-x-[var(--gutter)]">
          <h2 id="sponsors-tiers-title" className="type-h2 max-w-[17ch] lg:col-span-7">
            <TextReveal text="All three tiers put your name on the robot." mode="words" stagger={0.05} />
          </h2>
          <p className="type-body text-fg-muted lg:col-span-4 lg:col-start-9 lg:self-end">{packetCopy.tiersIntro}</p>
        </div>

        {/* Plates rise and tip up into place, Gold → Silver → Bronze → In-kind (each card draws its own
            right/bottom hairline, so nothing behind them shows while they move). */}
        <Entrance preset="tilt" stagger={0.14} className="mt-12 grid border-t border-l border-hairline md:grid-cols-3 lg:mt-16">
          {cash.map((t) => (
            <TierCard key={t.id} tier={t} partners={partnersOf(t.id)} />
          ))}
          {inKind && <InKindBand tier={inKind} partners={partnersOf(inKind.id)} className="md:col-span-3" />}
        </Entrance>

        <p className="mt-4 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
          Source ·{" "}
          <ExternalText href={site.links.sponsorPacket} className="link-draw pb-0.5 hover:text-fg focus-visible:text-fg">
            {packetCopy.title}
          </ExternalText>
        </p>
      </section>

      {/* 06.2 — why */}
      <section id="sponsors-why" aria-labelledby="sponsors-why-title" className={`${sectionClass} pb-[var(--section-pad)]`}>
        <MotionLabel code="06.2" label="WHY" />
        <div className="mt-10 grid gap-y-12 lg:grid-cols-12 lg:gap-x-[var(--gutter)]">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+48px)] lg:col-span-5 lg:self-start">
            <h2 id="sponsors-why-title" className="type-h2 max-w-[13ch]">
              <TextReveal text="Why sponsor a rookie team?" />
            </h2>
            <p className="type-lede mt-6">{packetCopy.whyIntro}</p>
          </div>
          {/* Reasons: each rule draws across, its number decodes, then the words fade up in place. */}
          <ol className="border-b border-hairline lg:col-span-6 lg:col-start-7">
            {sponsorPage.why.map((w, i) => (
              <li key={w.title} className="relative">
                <LineDraw className="absolute inset-x-0 top-0 text-hairline" delay={0.05} />
                <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 py-6 sm:grid-cols-[56px_minmax(0,1fr)] sm:py-7">
                  <span aria-hidden="true" className="pt-1.5 font-mono text-[11px] leading-4 text-fg-muted tabular-nums">
                    <Scramble text={String(i + 1).padStart(2, "0")} duration={0.5} />
                  </span>
                  <Entrance preset="fade" self delay={0.2}>
                    <h3 className="type-h3">{w.title}</h3>
                    <p className="type-body mt-2 text-fg-muted">{w.body}</p>
                  </Entrance>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <FundsMarquee />

      {/* 06.3 — where it goes */}
      <section id="sponsors-budget" aria-labelledby="sponsors-budget-title" className={`${sectionClass} section-y`}>
        <MotionLabel code="06.3" label="WHERE IT GOES" />
        <div className="mt-10 grid gap-y-12 lg:grid-cols-12 lg:gap-x-[var(--gutter)]">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+48px)] lg:col-span-4 lg:self-start">
            <h2 id="sponsors-budget-title" className="type-h2">
              <TextReveal text="Where it goes." />
            </h2>
            <p className="mt-10 font-mono text-[clamp(34px,3.3vw,48px)] leading-none font-light tracking-[-0.03em] whitespace-nowrap text-fg tabular-nums">
              <CountUp value={low} prefix="$" />
              <span className="text-fg-muted">–</span>
              <CountUp value={high} prefix="$" />
            </p>
            <p className="type-label mt-3 text-fg-muted">{budget.label}</p>
            <p className="type-body mt-8 text-fg-muted">{packetCopy.budgetIntro}</p>
            <BudgetKey className="mt-10" />
          </div>
          <BudgetInstrument className="lg:col-span-7 lg:col-start-6" />
        </div>
      </section>

      {/* 06.4 — contact */}
      <section id="sponsors-contact" aria-labelledby="sponsors-contact-title" className={`${sectionClass} pb-[var(--section-pad)]`}>
        <MotionLabel code="06.4" label="CONTACT" />
        <div className="mt-10 grid gap-y-14 lg:grid-cols-12 lg:gap-x-[var(--gutter)]">
          <div className="lg:col-span-6">
            <h2 id="sponsors-contact-title" className="type-h2 max-w-[14ch]">
              <TextReveal text="Put your name on our first robot." />
            </h2>
            <p className="type-lede mt-6">{packetCopy.contact}</p>

            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-4">
              <MotionButtonLink href={site.links.sponsorPacket} external size="lg">
                View the sponsorship packet
              </MotionButtonLink>
              {email ? (
                <Magnetic>
                  <a href={`mailto:${email}`} className={buttonClasses({ variant: "ghost", size: "lg" })}>
                    <RollText>Email the team</RollText>
                  </a>
                </Magnetic>
              ) : (
                <Pending inline label="Team inbox · coming soon" />
              )}
            </div>
            {!email && (
              <p className="mt-4 max-w-[48ch] text-[14px] leading-6 text-fg-muted">
                Our contact details are in the packet until the team inbox is set up.
              </p>
            )}

            <div className="mt-12 border-t border-hairline pt-6">
              <p className="type-label text-fg-muted">Verify the team</p>
              <Stagger as="ul" className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
                {VERIFY.map((v) => (
                  <StaggerItem as="li" key={v.href}>
                    <ExternalText href={v.href} className="link-draw pb-0.5 text-fg">
                      {v.label}
                    </ExternalText>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>

          <Parallax speed={0.06} className="lg:col-span-5 lg:col-start-8">
            <figure>
              <ImageWipe>
                <FoundingPlaque />
              </ImageWipe>
              <figcaption className="mt-3 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
                <span className="block text-fg">Fig. 1 — Founding Partner · slot open</span>
                <span className="mt-0.5 block">Illustration. Gold partners receive a custom plaque.</span>
              </figcaption>
            </figure>
          </Parallax>
        </div>

        <p className="mt-20 max-w-[62ch] border-t border-hairline pt-6 text-[15px] leading-6 text-fg-muted">
          <MarkText>{sponsorPage.closing}</MarkText>
        </p>
      </section>
    </PageTransition>
  );
}
