"use client";

// Member page portrait (/team/[slug]) — the shared-element destination of the roster card
// (ViewTransition name `member-<slug>`, share="morph").
//   • photo: Cult UI dither-image "develop" — the engraved print starts as a 1-bit dither
//     (DitherImageFrame) and the clean print (DitherImageOverlay) develops top → bottom behind a
//     1px print head (CSS @property animation in team.css, so it starts at first paint and
//     replays whenever the page is shown again). Then the x-ray lens works here too, plus an
//     "Original photo" toggle for keyboard and touch (aria-pressed).
//   • no photo: the wings draw themselves on the PHOTO PENDING plate.
//   • reduced motion: developed print, no draw-on, toggle crossfades.

import { useRef, ViewTransition } from "react";
import { ApexWings } from "@/components/brand/apex-wings";
import { buttonClasses } from "@/components/site/button";
import {
  DitherImageContent,
  DitherImageFrame,
  DitherImageOverlay,
  DitherImageReveal,
} from "@/components/ui/dither-image";
import { displayName, engravedSrc, hasPublicPhoto, type TeamMember } from "@/content/team";
import { cn } from "@/lib/utils";
import { frameLabel } from "./data";
import { useXrayLens, XrayLayer, type LensMode } from "./xray";
import "./team.css";

const HERO_SIZES = "(min-width: 1024px) 38vw, (min-width: 768px) 42vw, 100vw";

const CAPTION: Record<LensMode, string> = {
  off: "Engraved print",
  pointer: "X-ray lens",
  focus: "X-ray lens",
  full: "Original photo",
};

export function MemberHero({ member }: { member: TeamMember }) {
  // the colour original — only with photo consent (hasPublicPhoto)
  const original = hasPublicPhoto(member) ? member.photo.src : null;
  const photo = original !== null;
  const mediaRef = useRef<HTMLDivElement>(null);
  const lens = useXrayLens(mediaRef, {
    focal: member.photo?.focal,
    enabled: photo,
    hover: 0.24,
    focus: 0.34,
  });
  const full = lens.mode === "full";
  const name = displayName(member);

  return (
    // On desktop the print + caption always fit the first screen (4:5 → width = 0.8 × height).
    <figure className="m-0 md:max-w-[calc((100svh-276px)*0.8)]">
      <ViewTransition name={`member-${member.slug}`} share="morph" default="none">
        <div
          ref={mediaRef}
          className="relative aspect-[4/5] w-full overflow-hidden border border-hairline bg-surface-2"
          onPointerEnter={lens.handlers.onPointerEnter}
          onPointerMove={lens.handlers.onPointerMove}
          onPointerLeave={lens.handlers.onPointerLeave}
        >
          {original ? (
            <>
              <DitherImageReveal className="team-develop absolute inset-0">
                <DitherImageFrame size="lg" brightness={0.92} aspectRatio="4 / 5" className="h-full">
                  <DitherImageContent
                    src={engravedSrc(member)}
                    alt=""
                    fill
                    quality={90}
                    sizes={HERO_SIZES}
                    loading="eager"
                    fetchPriority="high"
                  />
                </DitherImageFrame>
                <span aria-hidden="true" className="team-dither-tint" />
                <span aria-hidden="true" className="team-dither-lift" />
                <DitherImageOverlay
                  src={engravedSrc(member)}
                  alt={`Portrait of ${name}`}
                  fill
                  quality={90}
                  sizes={HERO_SIZES}
                  loading="eager"
                  fetchPriority="high"
                  maskClassName="team-develop-mask"
                />
                <span aria-hidden="true" className="team-scan bg-pollen-line" />
              </DitherImageReveal>
              <XrayLayer src={original} lens={lens} sizes={HERO_SIZES} />
            </>
          ) : (
            <div className="team-plate-draw absolute inset-0 flex items-center justify-center text-wing">
              <div aria-hidden="true" className="hatch absolute inset-0 text-fg opacity-40" />
              <ApexWings animate="draw" className="relative w-[46%] opacity-80" />
              <p className="absolute inset-x-0 bottom-4 text-center font-mono text-[11px] tracking-[0.1em] text-fg-muted uppercase">
                Photo pending
              </p>
            </div>
          )}
        </div>
      </ViewTransition>

      <figcaption className="mt-3 flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="font-mono text-[11px] leading-5 tracking-[0.08em] text-fg-muted uppercase">
          Fig. {frameLabel(member)} — {photo ? CAPTION[lens.mode] : "Photo pending"}
        </span>
        {photo && (
          <button
            type="button"
            aria-pressed={full}
            onClick={() => lens.setFull(!full)}
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              className: cn(
                "gap-2 font-mono text-[11px] tracking-[0.08em] uppercase",
                full && "border-border-ui text-fg",
              ),
            })}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-block size-2.5 rounded-full border border-current transition-colors duration-[120ms]",
                full ? "bg-pollen-line border-pollen-line" : "bg-transparent",
              )}
            />
            Original photo
          </button>
        )}
      </figcaption>
    </figure>
  );
}
