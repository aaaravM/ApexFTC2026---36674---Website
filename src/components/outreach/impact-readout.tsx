// ImpactReadout — the honest impact strip on /outreach (DESIGN_SPEC §5: "—" placeholders labelled
// "Logged after our first season report"; no invented numbers).
//
// Four readouts in an instrument panel. A metric with no value shows "—" and an unlit status LED;
// once a value is entered in src/content/outreach.ts (`impactMetrics[].value`) it prints the
// number and the LED lights. The labels use the official FIRST Outreach Terms words (Reached,
// Hosted, Mentored, Published Resources); the definitions are linked, never paraphrased.
// Motion: label decodes, heading rises, the four readouts step in and each empty one DRAWS its
// "—" rule left to right, one after another (a logged value counts up instead).
// Server-safe.

import { Mark } from "@/components/brand/mark";
import { CountUp, LineDraw, TextReveal } from "@/components/motion";
import { Stagger, StaggerItem } from "./motion-safe";
import { impactMetrics } from "@/content/outreach";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { MotionLabel } from "./motion-bits";

/** Official PDF (verified 2026-10-12, research/biobuzz-first.md §4). */
const OUTREACH_TERMS_PDF = "https://www.firstinspires.org/hubfs/web/program/ftc/outreach-terms-and-definitions.pdf";

export function ImpactReadout({ code = "02.2" }: { code?: string }) {
  const notes = Array.from(new Set(impactMetrics.map((m) => m.note)));
  const sharedNote = notes.length === 1 ? notes[0] : undefined;
  const logged = impactMetrics.filter((m) => m.value !== null).length;
  const heading = sharedNote ? (/[.!?]$/.test(sharedNote) ? sharedNote : `${sharedNote}.`) : "Impact.";

  return (
    <section
      id="outreach-impact"
      aria-labelledby="outreach-impact-title"
      className="container-page scroll-mt-[calc(var(--header-h)+24px)] pb-[var(--section-pad)]"
    >
      <MotionLabel code={code} label="IMPACT" />

      <div className="mt-10 grid gap-y-6 lg:grid-cols-12 lg:gap-x-[var(--gutter)]">
        <h2 id="outreach-impact-title" className="type-h2 max-w-[18ch] lg:col-span-7">
          <TextReveal text={heading} />
        </h2>
        <p className="type-body text-fg-muted lg:col-span-4 lg:col-start-9 lg:self-end">
          Counts use the official <Mark id="first" /> Outreach Terms. People reached is a low-end estimate, published with how it was
          counted.
        </p>
      </div>

      <Stagger as="dl" amount={0.3} className="mt-12 grid grid-cols-2 gap-px border border-hairline bg-hairline lg:mt-16 lg:grid-cols-4">
        {impactMetrics.map((m, i) => {
          const empty = m.value === null;
          return (
            <div key={m.label} className="flex min-h-[148px] flex-col justify-between gap-6 bg-bg p-4 sm:min-h-[196px] sm:gap-8 sm:p-6">
              <StaggerItem as="dt" className="flex items-start justify-between gap-3">
                <span className="type-label max-w-[14ch] text-fg-muted">{m.label}</span>
                <span
                  aria-hidden="true"
                  className={cn("mt-1 size-1.5 shrink-0 rounded-full", empty ? "border border-border-ui" : "bg-fg")}
                />
              </StaggerItem>
              <StaggerItem as="dd">
                {empty ? (
                  <>
                    {/* hairline-weight dash: an empty readout, not a loading bar */}
                    <span aria-hidden="true" className="type-figure flex h-[1em] items-center">
                      <LineDraw className="w-[0.85em] text-fg-muted" delay={0.25 + i * 0.12} />
                    </span>
                    <span className="mt-3 block font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
                      Not logged yet
                    </span>
                  </>
                ) : (
                  <CountUp value={m.value ?? 0} className="type-figure block text-fg" />
                )}
                {!sharedNote && <span className="mt-2 block text-[13px] leading-5 text-fg-muted">{m.note}</span>}
              </StaggerItem>
            </div>
          );
        })}
      </Stagger>

      <div className="mt-4 flex flex-col gap-2 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase sm:flex-row sm:items-center sm:justify-between">
        <p className="tabular-nums">
          {logged} / {impactMetrics.length} logged · season {site.season.years}
        </p>
        <a
          href={OUTREACH_TERMS_PDF}
          target="_blank"
          rel="noopener noreferrer"
          className="link-draw self-start pb-0.5 text-fg-muted hover:text-fg focus-visible:text-fg sm:self-auto"
        >
          <Mark id="first" /> Outreach Terms &amp; Definitions (PDF) <span aria-hidden="true">↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}
