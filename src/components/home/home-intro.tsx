// HomeIntro — the first screen (USER-REQUIREMENTS #4a): the team name alone, huge, with the wings
// mark above it and one mono line of facts. Server-rendered real text: the H1 is "Apex Robotics"
// (sr-only copy); the visible wordmark is split into letters so home-story.tsx can pull them into
// the robot on scroll.
//
// Each letter is two layers so the load animation and the scroll scrub never fight:
//   [data-letter]        the outer span — the scroll collapse writes its transform/opacity/filter
//   .home-letter-mask    a clip box (room for the glyph's overhang)
//   .home-letter-rise    rises out of the mask on first paint (pure CSS, letter by letter — the
//                        page-H1 entrance every page has), so it starts before hydration
// The meta line decodes like a telemetry readout (home-story.tsx) after the name has landed, and
// the scroll cue arrives last. Reduced motion: everything static (home.css).
// Wordmark sizing = the shared `type-wordmark` utilities (two lines on phones, one from md up).

import type { CSSProperties } from "react";
import { ApexWings } from "@/components/brand/apex-wings";
import { Mark } from "@/components/brand/mark";
import { site } from "@/content/site";

function Letters({ word, from }: { word: string; from: number }) {
  return (
    <>
      {Array.from(word).map((ch, k) => {
        const i = from + k;
        return (
          <span key={i} data-letter="" data-index={i} className="home-letter">
            <span className="home-letter-mask">
              <span className="home-letter-rise" style={{ "--i": i } as CSSProperties}>
                {ch}
              </span>
            </span>
          </span>
        );
      })}
    </>
  );
}

export function HomeIntro() {
  return (
    <>
      <div data-home-wings="" className="text-wing">
        <ApexWings animate="draw" className="w-[clamp(84px,9vw,128px)]" />
      </div>
      <h1 id="home-title" className="type-wordmark mt-[clamp(20px,3.2vh,36px)] w-full px-[var(--page-margin)] text-fg md:wordmark-one-line">
        <span className="sr-only">Apex Robotics</span>
        <span aria-hidden="true" className="inline-block whitespace-nowrap">
          <Letters word="APEX" from={0} />
        </span>{" "}
        <span aria-hidden="true" className="block whitespace-nowrap md:inline-block">
          <Letters word="ROBOTICS" from={4} />
        </span>
      </h1>
      <p
        data-home-meta=""
        className="mt-[clamp(20px,3.4vh,36px)] max-w-[min(92vw,44rem)] px-4 font-mono text-[11px] leading-5 tracking-[0.08em] text-fg-muted uppercase"
      >
        <span data-home-decode="" className="home-intro-in inline-block" style={{ "--d": "0.62s" } as CSSProperties}>
          <Mark id="ftc" in="heading" /> <span aria-hidden="true">·</span> Team {site.teamNumber} <span aria-hidden="true">·</span>{" "}
          {site.locationShort} <span aria-hidden="true">·</span> <Mark id="biobuzz" in="heading" /> {site.season.years}
        </span>
      </p>
      <div data-home-cue="" aria-hidden="true" className="mt-[clamp(40px,9vh,96px)]">
        <span className="home-intro-in flex flex-col items-center gap-3" style={{ "--d": "1.25s" } as CSSProperties}>
          <span className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase">Scroll</span>
          <span className="home-cue-line" />
        </span>
      </div>
    </>
  );
}
