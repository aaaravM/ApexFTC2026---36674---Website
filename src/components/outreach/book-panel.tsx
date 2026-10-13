// BookPanel — "Bring Apex to your school or event." (DESIGN_SPEC §5 OUTREACH CTA).
//
// The three things the team offers come straight from the CTA copy (a demo, a workshop, a mentorship
// session); each points at the log entry of that type ("SEE OUT-002"), drawing-sheet style.
// Contact: the team inbox (`site.links.email`) when it exists; until then the sponsorship packet,
// with the content's "coming soon" line. Never a student's personal address (FIRST YPP).
// The engraved wings fill the open side of the panel on wide screens (decorative, static).
// Motion: the heading rises, the three formats step in, the wings ENGRAVE themselves feather by
// feather (stroke draw), and the contact button rolls its label / leans toward the pointer. Server-safe.

import { Magnetic, RollText, TextReveal } from "@/components/motion";
import { Stagger, StaggerItem } from "./motion-safe";
import { buttonClasses } from "@/components/site/button";
import { Pending } from "@/components/site/pending";
import { outreach, outreachLog, type OutreachKind } from "@/content/outreach";
import { site } from "@/content/site";
import { MotionButtonLink, MotionLabel } from "./motion-bits";
import { WingsEngraving } from "./wings-engraving";

/** The CTA copy names these three: "book a demo, workshop, or mentorship session". */
const FORMATS: { label: string; kind: OutreachKind }[] = [
  { label: "Demo", kind: "Event" },
  { label: "Workshop", kind: "Workshop" },
  { label: "Mentorship session", kind: "Mentorship" },
];

export function BookPanel({ code = "02.3" }: { code?: string }) {
  const email = site.links.email;
  const formats = FORMATS.map((f) => ({
    ...f,
    ref: outreachLog.find((e) => e.kind === f.kind),
  }));

  return (
    <section
      id="outreach-book"
      aria-labelledby="outreach-book-title"
      className="container-page scroll-mt-[calc(var(--header-h)+24px)] pb-[var(--section-pad)]"
    >
      <MotionLabel code={code} label="BOOK" />

      <div className="relative mt-10 overflow-hidden border border-hairline bg-surface-1">
        <div className="pointer-events-none absolute top-1/2 right-[5%] w-[36%] max-w-[560px] -translate-y-1/2 max-lg:hidden">
          <WingsEngraving draw className="block w-full text-hairline-strong" />
        </div>

        <div className="relative grid p-5 sm:p-10 lg:grid-cols-12 lg:gap-x-[var(--gutter)] lg:p-14">
          <div className="lg:col-span-7">
            <h2 id="outreach-book-title" className="type-h2 max-w-[15ch]">
              <TextReveal text={outreach.cta.title} delay={0.3} />
            </h2>
            <p className="type-lede mt-6">{outreach.cta.body}</p>

            <Stagger as="ol" className="mt-10 border-t border-hairline" delay={0.2} aria-label="What you can book">
              {formats.map((f, i) => (
                <StaggerItem
                  as="li"
                  key={f.label}
                  className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 border-b border-hairline py-4 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-4"
                >
                  <span className="pt-1 font-mono text-[11px] leading-4 text-fg-muted tabular-nums sm:pt-0" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[17px] leading-6 font-medium text-fg">{f.label}</span>
                  {f.ref && (
                    <span className="col-start-2 mt-1 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase sm:col-start-3 sm:mt-0 sm:text-right">
                      See {f.ref.id} · {f.ref.title}
                    </span>
                  )}
                </StaggerItem>
              ))}
            </Stagger>

            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-4">
              {email ? (
                <Magnetic>
                  <a href={`mailto:${email}`} className={buttonClasses({ size: "lg" })}>
                    <RollText>Email the team</RollText>
                  </a>
                </Magnetic>
              ) : (
                <>
                  <MotionButtonLink href={site.links.sponsorPacket} external size="lg">
                    Contact via the packet
                  </MotionButtonLink>
                  <Pending inline label="Team inbox · coming soon" />
                </>
              )}
            </div>
            {!email && <p className="mt-5 max-w-[52ch] text-[14px] leading-6 text-fg-muted">{outreach.cta.pendingContact}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
