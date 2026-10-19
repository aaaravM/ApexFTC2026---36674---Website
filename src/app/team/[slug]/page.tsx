// TEAM MEMBER — /team/[slug] (DESIGN_SPEC §5 TEAM).
// The roster card's portrait morphs into this page's print (ViewTransition `member-<slug>`), which
// then "develops" from a 1-bit dither (Cult UI dither-image). Name, discipline strip, title block,
// bio (or the designed BIO PENDING state — we never write a student's bio for them), where their
// work shows up, prev / next + ←/→ keys, and the contact sheet of all 12.
// Static per member: generateStaticParams (no dynamicParams export — cacheComponents forbids it).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { RollText, Scramble, ScrollProgress, TextReveal } from "@/components/motion";
import { TitleBlock } from "@/components/site/page-header";
import { PageTransition } from "@/components/site/page-transition";
import { Pending } from "@/components/site/pending";
import { TransitionLink } from "@/components/site/transition-link";
import { frameLabel, memberWork, pad2, roleIsDisciplines } from "@/components/team/data";
import { DisciplineStrip } from "@/components/team/discipline-strip";
import { MemberHero } from "@/components/team/member-hero";
import { MemberSteps } from "@/components/team/member-steps";
import { Rise } from "@/components/team/rise";
import { SectionTag } from "@/components/team/section-tag";
import { SettleOnHide } from "@/components/team/settle-on-hide";
import { site } from "@/content/site";
import { displayName, firstName, getMember, hasPublicPhoto, team } from "@/content/team";

// This page is the destination of the team-card → portrait shared-element morph, which only
// forms when the page commits in one go (no Suspense fallback). So navigations here may block
// on the (static, prerendered) payload instead of streaming a URL-agnostic shell first.
// Silences the dev-only "URL data outside of Suspense" insight; ensureStatic still applies.
export const instant = false;

/** Characters in the longest word of a name (sizes the title so a long surname never overruns). */
const longestWord = (name: string) => Math.max(...name.split(/\s+/).map((w) => w.length));

export function generateStaticParams() {
  return team.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/team/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const m = getMember(slug);
  if (!m) return { title: "Team member" };
  return {
    title: displayName(m),
    description: `${displayName(m)} — ${m.role}, ${site.name} (FTC Team ${site.teamNumber}, ${site.locationShort}).`,
  };
}

export default async function MemberPage({ params }: PageProps<"/team/[slug]">) {
  const { slug } = await params;
  const m = getMember(slug);
  if (!m) notFound();

  const name = displayName(m);
  const n = frameLabel(m);
  const total = pad2(team.length);
  const work = memberWork(m);
  const id = (part: string) => `member-${m.slug}-${part}`; // hidden routes stay mounted → unique ids

  return (
    <>
      <ScrollProgress />
      <PageTransition>
        <SettleOnHide>
          <article
            aria-labelledby={id("name")}
            className="container-page pt-[calc(var(--header-h)+clamp(20px,3.5vw,48px))]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-hairline pb-4">
              <TransitionLink
                href={`/team#team-card-${m.slug}`}
                direction="back"
                className="group inline-flex min-h-10 items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase transition-colors duration-[120ms] hover:text-fg"
              >
                <span
                  aria-hidden="true"
                  className="transition-transform duration-[220ms] ease-out group-hover:-translate-x-1 motion-reduce:transition-none"
                >
                  ←
                </span>
                <RollText>All members</RollText>
              </TransitionLink>
              <Scramble
                as="p"
                text={`Team / #${n} of ${total}`}
                immediate
                className="font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase tabular-nums"
              />
            </div>

            <div className="mt-8 grid gap-x-[var(--gutter)] gap-y-10 md:mt-10 md:grid-cols-12">
              <div className="md:col-span-5">
                <div className="md:sticky md:top-[calc(var(--header-h)+24px)]">
                  <MemberHero member={m} />
                </div>
              </div>

              <div className="@container min-w-0 md:col-span-7 lg:col-span-6 lg:col-start-7">
                <SectionTag code="01" label={`TEAM · #${n} OF ${total}`} immediate />
                {/* A long surname can't break, so cap the size so the longest word fits the column
                    (Hubot at this stretch/weight averages ~0.54em per glyph; 0.6 leaves headroom).
                    Short names keep the normal display size. */}
                <h1
                  id={id("name")}
                  className="type-display mt-6 sm:mt-8"
                  style={{ fontSize: `min(clamp(44px, 7.2vw, 112px), ${(100 / (longestWord(name) * 0.6)).toFixed(2)}cqi)` }}
                >
                  <TextReveal text={name} immediate delay={0.12} />
                </h1>
                {!roleIsDisciplines(m) && (
                  <Scramble
                    as="p"
                    text={m.role}
                    immediate
                    duration={0.8}
                    className="mt-4 block font-mono text-[12px] tracking-[0.08em] text-fg uppercase"
                  />
                )}
                <DisciplineStrip member={m} className="mt-8" />
                <TitleBlock
                  className="mt-6"
                  items={[
                    { label: "Index", value: `#${n} / ${total}` },
                    { label: "Team", value: `FTC ${site.teamNumber}` },
                    { label: "Season", value: `${site.season.years} · rookie` },
                    {
                      label: "Photo",
                      value: hasPublicPhoto(m) ? "Published" : "Pending",
                    },
                    {
                      label: "Bio",
                      value: m.bioPending ? "Pending" : "Written",
                    },
                  ]}
                />

                <section aria-labelledby={id("bio")} className="mt-14 sm:mt-16">
                  <SectionTag label="BIO" as="h2" id={id("bio")} />
                  {m.bioPending ? (
                    <Pending
                      className="mt-6"
                      label="Bio pending"
                      note={`${firstName(m)} hasn't written a bio yet. We only publish what students write themselves — this space fills in when they do.`}
                    />
                  ) : (
                    <TextReveal
                      as="p"
                      mode="words"
                      text={m.bio}
                      stagger={0.018}
                      className="type-lede mt-6 max-w-[60ch] text-fg"
                    />
                  )}
                </section>

                {work.length > 0 && (
                  <section aria-labelledby={id("work")} className="mt-14 sm:mt-16">
                    <SectionTag label="SEE THE WORK" as="h2" id={id("work")} />
                    <Rise className="mt-6 border-t border-hairline">
                      {work.map((w, i) => (
                        <li key={w.href} className="border-b border-hairline" style={{ "--i": i } as CSSProperties}>
                          <TransitionLink
                            href={w.href}
                            className="group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-x-4 py-4"
                          >
                            <span className="font-mono text-[11px] tracking-[0.08em] text-fg-muted tabular-nums">
                              {w.index}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[17px] leading-6 font-medium text-fg transition-colors duration-[120ms] group-hover:text-pollen-text group-focus-visible:text-pollen-text">
                                <RollText>{w.label}</RollText>
                                <span className="ml-2 font-mono text-[10px] font-normal tracking-[0.08em] text-fg-muted uppercase">
                                  {w.discipline}
                                </span>
                              </span>
                              <span className="mt-0.5 block text-[14px] leading-6 text-fg-muted">{w.blurb}</span>
                            </span>
                            <span
                              aria-hidden="true"
                              className="font-mono text-[14px] text-fg transition-transform duration-[220ms] ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none"
                            >
                              →
                            </span>
                          </TransitionLink>
                        </li>
                      ))}
                    </Rise>
                  </section>
                )}
              </div>
            </div>

            <MemberSteps member={m} />
          </article>
        </SettleOnHide>
      </PageTransition>
    </>
  );
}
