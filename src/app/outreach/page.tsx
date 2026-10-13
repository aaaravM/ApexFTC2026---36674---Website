// OUTREACH — "Engineering in the community." (DESIGN_SPEC §5 OUTREACH)
//
//   02.1 ACTIVITY LOG   OUT-001…004 (Workshop / Event / Mentorship / Community), filterable, each
//                       with a DATE · REACH · TERM record that reads PENDING until logged; the log
//                       ends on the next open ID, which hands off to booking.
//   02.2 IMPACT         four readouts, "—" until the first season report (never estimated here).
//   02.3 BOOK           demo / workshop / mentorship session + contact (packet until a team inbox).
//
// Everything comes from src/content/outreach.ts — add a date, a reach count or an Outreach Term
// there and the record cells, the title block and the impact readouts update themselves.
//
// Motion (the team asked for more, kept monochrome): the H1 rises letter by letter on load, labels
// decode, rules draw, section headings rise in, log rows and readouts arrive in sequence, the
// booking panel wipes in; a pollen hairline under the header tracks reading progress.

import type { Metadata } from "next";
import { Mark } from "@/components/brand/mark";
import { ScrollProgress, TextReveal } from "@/components/motion";
import { BookPanel } from "@/components/outreach/book-panel";
import { ImpactReadout } from "@/components/outreach/impact-readout";
import { JumpLink } from "@/components/outreach/jump-link";
import { MotionHeader, MotionLabel } from "@/components/outreach/motion-bits";
import { OutreachLog } from "@/components/outreach/outreach-log";
import { PageTransition } from "@/components/site/page-transition";
import { outreach, outreachLog } from "@/content/outreach";
import { fmtInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "Outreach",
  description: outreach.lede,
};

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
const countWord = (n: number) => WORDS[n] ?? fmtInt(n);

/** Content strings say "FTC"; print the first one as FTC® (first-use tracking lives in <Mark/>). */
function withFtcMark(text: string) {
  const i = text.indexOf("FTC");
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <Mark id="ftc-short" />
      {text.slice(i + 3)}
    </>
  );
}

export default function OutreachPage() {
  const total = outreachLog.length;
  const dated = outreachLog.filter((e) => e.date).length;
  const reach = outreachLog.reduce((sum, e) => sum + (e.reach?.count ?? 0), 0);

  return (
    <PageTransition>
      <ScrollProgress />
      <MotionHeader
        index="02"
        section="OUTREACH"
        title={outreach.title}
        lede={withFtcMark(outreach.lede)}
        titleId="outreach-title"
        meta={[
          { label: "ENTRIES", value: String(total).padStart(2, "0") },
          {
            label: "DATES",
            value: dated === 0 ? "PENDING" : `${dated} / ${total}`,
          },
          {
            label: "REACH",
            value: reach > 0 ? `≥ ${fmtInt(reach)}` : "PENDING",
          },
        ]}
      >
        <JumpLink href="#outreach-book" variant="primary">
          Book a session
        </JumpLink>
        <JumpLink href="#outreach-log">Read the log</JumpLink>
      </MotionHeader>

      <section
        id="outreach-log"
        aria-labelledby="outreach-log-title"
        className="container-page scroll-mt-[calc(var(--header-h)+24px)] pb-[var(--section-pad)]"
      >
        <MotionLabel code="02.1" label="ACTIVITY LOG" />
        <div className="mt-10 grid gap-y-6 lg:grid-cols-12 lg:gap-x-[var(--gutter)]">
          <h2 id="outreach-log-title" className="type-h2 lg:col-span-7">
            <TextReveal text={total === 1 ? "One entry so far." : `${countWord(total)} entries so far.`} />
          </h2>
          <p className="type-body text-fg-muted lg:col-span-4 lg:col-start-9 lg:self-end">
            Every entry gets an ID when it goes in the log. Its date, reach and Outreach Term are filled in as they are logged — until then
            they read pending.
          </p>
        </div>
        <OutreachLog className="mt-12 lg:mt-16" />
      </section>

      <ImpactReadout />
      <BookPanel />
    </PageTransition>
  );
}
