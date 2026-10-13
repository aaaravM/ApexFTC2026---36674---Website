"use client";

// Roster card — Cult UI cutout-card shell (src/components/ui/cutout-card.tsx), restyled as an
// engineering part tag: 0-radius panel, hairline frame, the mono index "#01 / 12" sits in a notch
// cut out of the top-left corner (the frame steps around it), FOUNDER pin top-right.
// Hover / keyboard focus: frame + notch turn pollen and the x-ray lens opens over the engraved
// print (see ./xray). The whole card is one link (stretched from the name), so screen readers
// hear just the name; the portrait is the shared element that morphs into /team/[slug].
// Motion (TEAM signature): the card tilts in with its row while the print develops out of dither
// and grain (./develop), the index decodes, the name rises, the discipline chips stamp down one by
// one; on hover the card leans a few degrees toward the pointer (fine pointers only, never under
// reduced motion) while the x-ray lens opens.

import { motion, useSpring } from "motion/react";
import {
  useRef,
  ViewTransition,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { Chip } from "@/components/site/chip";
import { TransitionLink } from "@/components/site/transition-link";
import { RollText, Scramble, TextReveal } from "@/components/motion";
import {
  CutoutCard,
  CutoutCardAction,
  CutoutCardContent,
  CutoutCardFooter,
  CutoutCardInsetLabel,
  CutoutCardMedia,
  CutoutCardPin,
} from "@/components/ui/cutout-card";
import { displayName, hasPublicPhoto, type TeamMember } from "@/content/team";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { indexLabel, roleIsDisciplines } from "./data";
import { Arrive, Grain } from "./develop";
import { Rise } from "./rise";
import { useXrayLens, XrayPortrait } from "./xray";
import "./team.css";

export const CARD_SIZES =
  "(min-width: 1280px) 22vw, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, (min-width: 380px) 46vw, 92vw";

export interface MemberCardProps {
  member: TeamMember;
  /** Above the fold → eager image loading. */
  eager?: boolean;
  /** Column position (desktop grid), staggers the name/chips after the card's own arrival. */
  column?: number;
}

/** Max lean toward the pointer, degrees. */
const LEAN = 5;
const LEAN_SPRING = { stiffness: 200, damping: 22, mass: 0.7 };

/** Pointer-follow 3D lean (mouse/pen only; settles flat on leave and the instant you press). */
function useLean() {
  const reduce = usePrefersReducedMotion();
  const rx = useSpring(0, LEAN_SPRING);
  const ry = useSpring(0, LEAN_SPRING);
  const flat = (jump?: boolean) => {
    if (jump) {
      rx.jump(0);
      ry.jump(0);
    } else {
      rx.set(0);
      ry.set(0);
    }
  };
  const handlers = {
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (reduce || e.pointerType === "touch") return;
      const b = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width - 0.5;
      const py = (e.clientY - b.top) / b.height - 0.5;
      ry.set(px * 2 * LEAN);
      rx.set(-py * 2 * LEAN);
    },
    onPointerLeave: () => flat(),
    // the portrait is about to morph into the member page — hand it over flat
    onPointerDown: () => flat(true),
  };
  return { rx, ry, handlers };
}

export function MemberCard({ member, eager, column = 0 }: MemberCardProps) {
  const photo = hasPublicPhoto(member);
  const mediaRef = useRef<HTMLDivElement>(null);
  const lens = useXrayLens(mediaRef, {
    focal: member.photo?.focal,
    enabled: photo,
  });
  const name = displayName(member);
  const lensOn = lens.mode !== "off";
  const lean = useLean();

  return (
    <Arrive>
      <motion.div
        className="h-full"
        style={{
          rotateX: lean.rx,
          rotateY: lean.ry,
          transformPerspective: 900,
        }}
        {...lean.handlers}
      >
        <CutoutCard
          className={cn(
            "team-card group/cutout relative flex h-full flex-col rounded-none border border-[var(--card-line)] bg-surface-1 text-fg",
            "transition-[border-color] duration-[220ms] ease-out",
            // keyboard focus lands on the stretched link; draw the ring around the whole card instead
            "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[var(--focus)] has-[a:focus-visible]:outline-solid",
          )}
          {...lens.handlers}
        >
          <ViewTransition
            name={`member-${member.slug}`}
            share="morph"
            default="none"
          >
            <CutoutCardMedia className="aspect-[4/5] bg-surface-2">
              <div ref={mediaRef} className="absolute inset-0">
                <XrayPortrait
                  member={member}
                  lens={lens}
                  sizes={CARD_SIZES}
                  eager={eager}
                  develop
                  className="h-full"
                />
                <Grain />
              </div>
              {photo && (
                <p
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute bottom-0 left-0 bg-bg/85 px-2 py-1 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg uppercase transition-[opacity,translate] duration-[220ms] ease-out motion-reduce:transition-none",
                    lensOn
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-0",
                  )}
                >
                  X-ray · original photo
                </p>
              )}
            </CutoutCardMedia>
          </ViewTransition>

          {/* the notch: covers the frame's corner and carries its own right/bottom edge */}
          <CutoutCardInsetLabel className="-top-px -left-px z-10 border-r border-b border-[var(--card-line)] bg-bg py-1.5 pr-2.5 pl-2 font-mono text-[10px] leading-none tracking-[0.08em] text-fg-muted tabular-nums transition-[border-color] duration-[220ms] ease-out">
            <Scramble text={indexLabel(member)} duration={0.7} />
          </CutoutCardInsetLabel>

          {member.founder && (
            <CutoutCardPin className="top-2.5 right-2.5 z-10">
              <Chip tone="pollen">Founder</Chip>
            </CutoutCardPin>
          )}

          <CutoutCardContent className="flex flex-1 flex-col p-0">
            <div className="px-4 pt-4 pb-5 sm:px-5 sm:pt-5">
              <h3 className="font-display text-[clamp(18px,1.25vw+4px,22px)] leading-[1.1] font-[560] [font-stretch:108%]">
                <TransitionLink
                  href={`/team/${member.slug}`}
                  prefetch
                  className="outline-none after:absolute after:inset-0 after:z-20 after:content-['']"
                >
                  <TextReveal
                    text={name}
                    delay={0.3 + column * 0.08}
                    stagger={0.018}
                    duration={0.8}
                  />
                </TransitionLink>
              </h3>
              {!roleIsDisciplines(member) && (
                <p className="mt-1.5 font-mono text-[11px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
                  {member.role}
                </p>
              )}
              <Rise
                variant="stamp"
                className="mt-3 flex flex-wrap gap-1.5"
                aria-label="Disciplines"
                delay={0.65 + column * 0.08}
              >
                {member.disciplines.map((d, i) => (
                  <li key={d} style={{ "--i": i } as CSSProperties}>
                    <Chip>{d}</Chip>
                  </li>
                ))}
              </Rise>
            </div>
            {/* what the profile holds: the student's bio, or the honest pending state */}
            <CutoutCardFooter className="mt-auto gap-2 border-t border-hairline px-4 py-3 sm:gap-3 sm:px-5">
              {member.bioPending ? (
                <span className="type-label flex items-center gap-1.5 whitespace-nowrap text-fg-muted sm:gap-2">
                  <span
                    aria-hidden="true"
                    className="hatch inline-block size-2.5 border border-dashed border-hairline-strong"
                  />
                  <RollText>Bio pending</RollText>
                </span>
              ) : (
                <span className="type-label flex items-center gap-1.5 whitespace-nowrap text-fg sm:gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block size-2.5 bg-fg"
                  />
                  <RollText>Read bio</RollText>
                </span>
              )}
              <CutoutCardAction
                aria-hidden="true"
                className="static shrink-0 font-mono text-[13px] leading-4 text-fg"
              >
                →
              </CutoutCardAction>
            </CutoutCardFooter>
          </CutoutCardContent>
        </CutoutCard>
      </motion.div>
    </Arrive>
  );
}
