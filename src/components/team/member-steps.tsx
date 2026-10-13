// Member page footer: previous / next member (directional page slides), the keyboard hint, and
// the CONTACT SHEET — all 12 frames as a film strip, the current one marked — so the whole roster
// is one click away. Server component (the ←/→ listener is the small client MemberKeys).

import Image from "next/image";
import type { CSSProperties } from "react";
import { Kbd } from "@/components/site/kbd";
import { PortraitPlate } from "@/components/site/member-portrait";
import { TransitionLink } from "@/components/site/transition-link";
import { displayName, engravedSrc, hasPublicPhoto, neighbours, team, type TeamMember } from "@/content/team";
import { cn } from "@/lib/utils";
import { frameLabel, pad2 } from "./data";
import { Arrive, Grain } from "./develop";
import { MemberKeys } from "./member-keys";
import { Rise } from "./rise";
import { SectionTag } from "./section-tag";

function Thumb({ member, sizes, className }: { member: TeamMember; sizes: string; className?: string }) {
  if (!hasPublicPhoto(member)) return <PortraitPlate quiet className={className} />;
  return (
    <div className={cn("relative aspect-[4/5] w-full overflow-hidden bg-surface-2", className)}>
      <Image src={engravedSrc(member)} alt="" fill sizes={sizes} className="team-print object-cover" />
    </div>
  );
}

function StepLink({ member, dir }: { member: TeamMember; dir: "prev" | "next" }) {
  const next = dir === "next";
  return (
    <TransitionLink
      href={`/team/${member.slug}`}
      direction={next ? "forward" : "back"}
      rel={next ? "next" : "prev"}
      className={cn(
        "group flex items-center gap-4 py-6 sm:gap-5 sm:py-8",
        next ? "flex-row-reverse pl-4 text-right sm:pl-8" : "pr-4 sm:pr-8",
      )}
    >
      <span className="hidden w-16 shrink-0 border border-hairline transition-colors duration-[220ms] group-hover:border-border-ui group-focus-visible:border-border-ui sm:block sm:w-20">
        <Arrive tilt={false} delay={0.1} spread={0}>
          <span className="relative block">
            <Thumb member={member} sizes="80px" className={hasPublicPhoto(member) ? undefined : "team-plate"} />
            <Grain />
          </span>
        </Arrive>
      </span>
      <span className="min-w-0">
        <span className="type-label block whitespace-nowrap text-fg-muted">
          {next ? (
            <>
              Next · #{frameLabel(member)} <span aria-hidden="true">→</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">←</span> Previous · #{frameLabel(member)}
            </>
          )}
        </span>
        <span className="mt-2 block font-display text-[clamp(18px,1.6vw+6px,28px)] leading-tight font-[560] [font-stretch:108%]">
          <span className="link-draw group-hover:[background-size:100%_1px] group-focus-visible:[background-size:100%_1px]">
            {displayName(member)}
          </span>
        </span>
        <span className="mt-1 block font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">
          {member.disciplines.join(" · ")}
        </span>
      </span>
    </TransitionLink>
  );
}

export function MemberSteps({ member }: { member: TeamMember }) {
  const { prev, next } = neighbours(member.slug);
  const current = team.findIndex((t) => t.slug === member.slug);
  return (
    <nav aria-label="Team members" className="mt-[clamp(72px,10vw,140px)] pb-[clamp(56px,7vw,96px)]">
      <div className="grid grid-cols-2 divide-x divide-hairline border-y border-hairline">
        <StepLink member={prev} dir="prev" />
        <StepLink member={next} dir="next" />
      </div>
      <p className="mt-4 hidden items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase [@media(hover:hover)_and_(pointer:fine)]:flex">
        <Kbd>←</Kbd>
        <Kbd>→</Kbd>
        step through the roster
      </p>

      <div className="mt-14 sm:mt-20">
        <SectionTag label={`CONTACT SHEET · ${pad2(team.length)} FRAMES`} />
        <Rise
          as="ol"
          className="-mx-[var(--page-margin)] mt-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-[var(--page-margin)] pb-2 sm:mx-0 sm:grid sm:grid-cols-6 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-12"
          data-lenis-prevent=""
        >
          {team.map((m, i) => {
            const here = i === current;
            return (
              <li
                key={m.slug}
                className="w-[22vw] max-w-[96px] shrink-0 snap-start sm:w-auto sm:max-w-none"
                style={{ "--i": i } as CSSProperties}
              >
                <TransitionLink
                  href={`/team/${m.slug}`}
                  direction={i < current ? "back" : "forward"}
                  aria-current={here ? "page" : undefined}
                  aria-label={`#${pad2(i + 1)} ${displayName(m)}`}
                  className="group block"
                >
                  <span
                    className={cn(
                      "mb-1.5 flex items-center justify-between font-mono text-[10px] leading-4 tracking-[0.06em] tabular-nums",
                      here ? "text-pollen-text" : "text-fg-muted group-hover:text-fg",
                    )}
                  >
                    {pad2(i + 1)}
                    {here && <span aria-hidden="true">▲</span>}
                  </span>
                  <span
                    className={cn(
                      "block border transition-[border-color,opacity] duration-[220ms] ease-out",
                      here
                        ? "border-pollen-line"
                        : "border-hairline opacity-70 group-hover:border-border-ui group-hover:opacity-100 group-focus-visible:opacity-100",
                    )}
                  >
                    <Thumb member={m} sizes="96px" />
                  </span>
                </TransitionLink>
              </li>
            );
          })}
        </Rise>
      </div>
      <MemberKeys prev={prev.slug} next={next.slug} />
    </nav>
  );
}
