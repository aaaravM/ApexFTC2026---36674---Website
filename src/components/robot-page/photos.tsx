// PHOTOS (USER-REQUIREMENTS #3): the Meet the Robot gallery. While `robotPhotos` in
// src/content/robot.ts is empty it shows a designed empty contact sheet —
// "ROBOT PHOTOS PENDING — FIRST BUILD SEASON". Add files to /public/robot/ and list them there;
// the gallery appears with no code changes. Then the page's way out: code, CAD, more code.
// Server component.

import Image from "next/image";
import { ImageWipe, Magnetic, RollText, TextReveal } from "@/components/motion";
import { ButtonLink } from "@/components/site/button";
import { robot, robotPhotos } from "@/content/robot";
import { Armed } from "./armed";
import { fx } from "./fx";
import { RobotTag } from "./tag";
import "./robot-page.css";

/**
 * The empty contact sheet. Motion: like frames being set up on a light table — the registration
 * marks grow out of each frame's corners, then the dashed outline and the pending hatch appear,
 * then the frame number; frame by frame, left to right.
 */
function EmptySheet() {
  return (
    <div className="mt-12">
      <Armed className="grid grid-cols-2 gap-[var(--gutter)] md:grid-cols-4">
        {[1, 2, 3, 4].map((n, i) => {
          const at = i * 0.14;
          return (
            <div key={n} className="relative aspect-[4/3] text-fg-muted">
              <span aria-hidden="true" className="rp-fx-fade absolute inset-0 border border-dashed border-hairline-strong" style={fx(at + 0.3, 0.45)} />
              <span aria-hidden="true" className="rp-fx-fade hatch absolute inset-0 opacity-50" style={fx(at + 0.45, 0.6)} />
              <span aria-hidden="true" className="rp-ticks rp-fx-ticks absolute inset-0" style={fx(at, 0.5)} />
              <span
                className="rp-fx-fade absolute top-2 left-2.5 font-mono text-[9px] leading-3 tracking-[0.08em] text-fg-muted uppercase tabular-nums sm:top-3 sm:left-3.5 sm:text-[10px]"
                style={fx(at + 0.55, 0.12, { ease: "steps(1, start)" })}
              >
                Frame {String(n).padStart(2, "0")}
              </span>
              <span
                className="rp-fx-fade absolute right-2.5 bottom-2 hidden font-mono text-[10px] leading-3 tracking-[0.08em] text-fg-muted uppercase sm:right-3.5 sm:bottom-3 sm:block"
                style={fx(at + 0.65, 0.12, { ease: "steps(1, start)" })}
              >
                Pending
              </span>
            </div>
          );
        })}
      </Armed>
      <p className="type-label mt-6 flex items-center gap-2 text-fg-muted">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-border-ui" />
        Robot photos pending — first build season
      </p>
    </div>
  );
}

function Gallery() {
  return (
    <ul className="mt-12 grid gap-x-[var(--gutter)] gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {robotPhotos.map((p, i) => (
        <li key={p.src}>
          <figure>
            <ImageWipe delay={(i % 3) * 0.1} className="relative aspect-[4/3] bg-surface-2">
              <Image src={p.src} alt={p.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
            </ImageWipe>
            {(p.caption || p.date) && (
              <figcaption className="mt-3 flex items-baseline justify-between gap-4 font-mono text-[11px] leading-5 tracking-[0.04em] text-fg-muted">
                <span className="min-w-0">{p.caption}</span>
                {p.date && <span className="shrink-0 tabular-nums">{p.date}</span>}
              </figcaption>
            )}
          </figure>
        </li>
      ))}
    </ul>
  );
}

export function RobotPhotos() {
  const empty = robotPhotos.length === 0;
  return (
    <section aria-labelledby="robot-photos-title" className="container-page relative pb-[var(--section-pad)]">
      {/* jump target for the section navigator: starts 80px above the section, so a jump lands the
          label below the floating navigator (it sits under the header on desktop) */}
      <span id="robot-photos" aria-hidden="true" className="pointer-events-none absolute -top-20 bottom-0 left-0 w-px scroll-mt-[var(--header-h)]" />
      <RobotTag code="11" label="PHOTOS" />
      <div className="mt-8 grid gap-x-[var(--gutter)] gap-y-5 lg:grid-cols-12 lg:items-end">
        <TextReveal as="h2" id="robot-photos-title" text="Build photos." className="type-h2 lg:col-span-6" />
        <p className="type-body text-fg-muted lg:col-span-5 lg:col-start-8">
          {empty
            ? "APEX-R1 is being built this season. Photos go up here as it comes together — until then, the 3D model above is drawn from the team's code."
            : "APEX-R1 as it comes together this season."}
        </p>
      </div>
      {empty ? <EmptySheet /> : <Gallery />}

      <div className="mt-20 flex flex-wrap items-center gap-x-8 gap-y-5 border-t border-hairline pt-10">
        <Magnetic>
          <ButtonLink href={robot.repo} external size="lg">
            <RollText>Robot code on GitHub</RollText>
          </ButtonLink>
        </Magnetic>
        <Magnetic>
          <ButtonLink href="/cad" variant="secondary">
            <RollText>See the CAD</RollText>
          </ButtonLink>
        </Magnetic>
        <Magnetic>
          <ButtonLink href="/code" variant="secondary">
            <RollText>Read the code</RollText>
          </ButtonLink>
        </Magnetic>
      </div>
    </section>
  );
}
