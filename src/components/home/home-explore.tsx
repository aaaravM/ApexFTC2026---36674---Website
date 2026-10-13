// HomeExplore — DESIGN_SPEC §5.5: the rest of the site as a numbered drawing-sheet index
// (DWG-001 … DWG-007, the same numbers every page's title block uses). The Founding Partner band
// that follows is home-sponsor.tsx.
// Motion (its own, USER-REQUIREMENTS #7c): the label decodes while its rule opens from the centre
// and the sheet count decodes; the heading is plotted letter by letter behind a pen caret; the
// sheets fan out from a stack (each sheet number re-plots as it lands); hovering / focusing a
// sheet frames it with registration marks, re-plots its number, rolls its name and nudges the arrow.
//
// The Robot Lab (/lab/robot) is public with a link (USER-REQUIREMENTS #8, the team's final decision):
// it closes the index as LAB-001, set apart by a dashed rule.

import type { CSSProperties } from "react";
import { RollText } from "@/components/motion";
import { TransitionLink } from "@/components/site/transition-link";
import { pageBlurbs, site } from "@/content/site";
import { MotionLabel } from "./motion-label";
import { Arm, PlotText, SheetStack } from "./section-motion";

const row =
  "home-sheet group relative grid grid-cols-[4.75rem_1fr_auto] items-baseline gap-x-4 gap-y-1 py-[18px] outline-offset-[-2px] transition-colors duration-[120ms] hover:bg-surface-1 focus-visible:bg-surface-1 sm:grid-cols-[5.5rem_minmax(10rem,13rem)_1fr_auto] sm:px-3";
const num = "font-mono text-[11px] tracking-[0.08em] text-fg-muted tabular-nums transition-colors group-hover:text-fg";
const name = "font-display text-[clamp(19px,1.6vw,23px)] leading-tight font-medium text-fg [font-stretch:112%]";
const blurb = "col-start-2 row-start-2 text-[14.5px] leading-6 text-fg-muted sm:col-start-3 sm:row-start-1";
const arrow =
  "col-start-3 row-start-1 font-mono text-[13px] text-fg-muted transition-[translate,color] duration-[220ms] ease-out group-hover:translate-x-1 group-hover:text-fg sm:col-start-4 motion-reduce:transition-none";

export function HomeExplore() {
  const sheets = site.nav.length;
  return (
    <section id="home-explore" className="container-page pb-[var(--section-pad)]" aria-labelledby="home-explore-title">
      <MotionLabel code="I" label="INDEX" origin="center" meta={`${String(sheets).padStart(2, "0")} SHEETS`} />
      <div className="mt-[clamp(28px,4vw,48px)] grid gap-x-[var(--gutter)] gap-y-10 lg:grid-cols-12">
        <div className="home-parallax lg:col-span-4">
          <PlotText as="h2" id="home-explore-title" text="The drawing set." className="type-h2 text-fg" />
          <Arm as="p" className="home-fade type-body mt-4 text-fg-muted" style={{ "--fd": "0.85s" } as CSSProperties}>
            Every page of this site is a sheet. Pick one.
          </Arm>
        </div>
        <SheetStack className="border-t border-hairline lg:col-span-8">
          {site.nav.map((n, k) => {
            const dwg = `DWG-0${n.index}`;
            return (
              <li key={n.href} className="border-b border-hairline" style={{ "--k": k } as CSSProperties}>
                <TransitionLink href={n.href} className={row}>
                  <span className={num}>
                    <span className="sr-only">{dwg}</span>
                    <span aria-hidden="true" data-dwg="">
                      {dwg}
                    </span>
                  </span>
                  <span className={name}>
                    <RollText>{n.label}</RollText>
                  </span>
                  <span className={blurb}>{pageBlurbs[n.href]}</span>
                  <span aria-hidden="true" className={arrow}>
                    →
                  </span>
                </TransitionLink>
              </li>
            );
          })}
          <li className="border-b border-dashed border-border-ui" style={{ "--k": sheets } as CSSProperties}>
            <TransitionLink href="/lab/robot" className={row}>
              <span className={num}>
                <span className="sr-only">LAB-001</span>
                <span aria-hidden="true" data-dwg="">
                  LAB-001
                </span>
              </span>
              <span className={name}>
                <RollText>Robot Lab</RollText>
              </span>
              <span className={blurb}>APEX-R1 on the bench: orbit the model, explode it, change the look.</span>
              <span aria-hidden="true" className={arrow}>
                →
              </span>
            </TransitionLink>
          </li>
        </SheetStack>
      </div>
    </section>
  );
}
