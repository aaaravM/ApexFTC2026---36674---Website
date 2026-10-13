// HomeSponsor — DESIGN_SPEC §5.5 sponsor band: "Become a Founding Partner" with the REAL packet
// tiers (no sponsor has signed yet → every slot is OPEN). Each tier is a way into its section of
// /sponsors.
// Motion (its own, USER-REQUIREMENTS #7c): the label decodes; the title's width axis opens (the
// wings spreading); the lede settles in; tier names decode; the thresholds roll up on odometer
// wheels; the OPEN SLOT chips stamp down one after another; hovering / focusing a tier traces its
// open slot with a marching dashed outline. CTAs roll their labels and lean toward the cursor.

import type { CSSProperties } from "react";
import { Magnetic, RollText, Scramble, StretchIn } from "@/components/motion";
import { ButtonLink } from "@/components/site/button";
import { Chip } from "@/components/site/chip";
import { TransitionLink } from "@/components/site/transition-link";
import { budget, sponsorPage, sponsors, tiers } from "@/content/sponsors";
import { site } from "@/content/site";
import { fmtUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Odometer } from "./odometer";
import { Arm } from "./section-motion";

/** "Become a Founding Partner." → ["Become a", "Founding Partner."] so the width animation never re-wraps. */
function titleLines(title: string) {
  const words = title.split(" ");
  return words.length > 3 ? [words.slice(0, -2).join(" "), words.slice(-2).join(" ")] : [title];
}

export function HomeSponsor() {
  return (
    <section id="home-sponsor" className="container-page pb-[var(--section-pad)]" aria-labelledby="home-sponsor-title">
      <div className="border border-hairline bg-surface-1">
        <div className="grid lg:grid-cols-12">
          <div className="border-b border-hairline p-[clamp(20px,3vw,40px)] lg:col-span-5 lg:border-r lg:border-b-0">
            <Scramble as="p" text="[ S / SPONSORS ]" className="type-label text-fg-muted" />
            <h2 id="home-sponsor-title" className="type-h2 mt-[clamp(18px,2.4vw,28px)] text-fg">
              <StretchIn from="72%" to="108%" className="block">
                {titleLines(sponsorPage.title).map((line) => (
                  <span key={line} className="block whitespace-nowrap">
                    {line}
                  </span>
                ))}
              </StretchIn>
            </h2>
            <Arm as="p" className="home-fade type-body mt-4 text-fg-muted" style={{ "--fd": "0.45s" } as CSSProperties}>
              {sponsorPage.lede}
            </Arm>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Magnetic>
                <ButtonLink href={site.links.sponsorPacket} external>
                  <RollText>View the sponsorship packet</RollText>
                </ButtonLink>
              </Magnetic>
              <Magnetic>
                <ButtonLink href="/sponsors" variant="secondary">
                  <RollText>Tiers and budget</RollText>
                </ButtonLink>
              </Magnetic>
            </div>
          </div>

          <Arm as="ul" className="home-tiers grid grid-cols-2 lg:col-span-7" inset={0.08}>
            {tiers.map((t, i) => {
              const taken = sponsors.filter((s) => s.tier === t.id).length;
              return (
                <li
                  key={t.id}
                  className={cn("min-w-0 border-hairline", i % 2 === 0 && "border-r", i < 2 && "border-b")}
                  style={{ "--k": i } as CSSProperties}
                >
                  <TransitionLink
                    href={`/sponsors#sponsors-tier-${t.id}`}
                    className="home-tier relative flex h-full min-h-[148px] flex-col justify-between gap-6 p-[clamp(18px,2.4vw,32px)] outline-offset-[-2px] transition-colors duration-[120ms] hover:bg-surface-2 focus-visible:bg-surface-2"
                  >
                    <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                      <Scramble text={t.name} className="type-label text-fg-muted" />
                      <Chip tone="pending" className="home-stamp">
                        {taken ? `${taken} partner${taken > 1 ? "s" : ""}` : "Open slot"}
                      </Chip>
                    </span>
                    {t.minUsd ? (
                      <span className="font-mono text-[clamp(28px,3vw,44px)] leading-none font-light tracking-[-0.03em] text-fg">
                        <Odometer value={t.minUsd} prefix="$" />
                        <span className="text-fg-muted">{t.amount.replace(/^[^+]*/, "")}</span>
                      </span>
                    ) : (
                      <Scramble text={t.amount} duration={0.9} className="font-mono text-[13px] leading-5 tracking-[0.04em] whitespace-normal text-fg uppercase" />
                    )}
                  </TransitionLink>
                </li>
              );
            })}
          </Arm>
        </div>
        <p className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-hairline px-[clamp(20px,3vw,40px)] py-3 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
          <span>
            {budget.label} · {fmtUsd(budget.rangeUsd[0])}–{fmtUsd(budget.rangeUsd[1])}
          </span>
          <span>Source · Team 36674 sponsorship proposal</span>
        </p>
      </div>
    </section>
  );
}
