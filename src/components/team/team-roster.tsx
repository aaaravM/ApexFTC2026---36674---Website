"use client";

// TEAM roster: Watermelon continuous-tabs filter (ALL · LEAD · CAD · CODE · BUILD · SOCIALS, real
// tablist semantics) in a sticky bar, the cutout-card grid that reflows with motion `layout`
// (heavy spring; cards that leave pop out of the flow and fade), a rolling "SHOWING 07 / 12"
// readout + a polite live region, and the role matrix below, which follows the same filter.
// Also answers the header contact sheet's jumps (JUMP_EVENT). All data: src/content/team.ts.

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { RollingNumber } from "@/components/ui/rolling-number";
import ContinuousTabs from "@/components/watermelon/continuous-tabs";
import { team } from "@/content/team";
import { useFinePointer, useScrollTo } from "@/lib/hooks";
import { dur, ease, spring } from "@/lib/motion";
import { filterTabs, inFilter, pad2, type FilterId } from "./data";
import { JUMP_EVENT, type JumpDetail } from "./header-sheet";
import { MemberCard } from "./member-card";
import { RoleMatrix } from "./role-matrix";

const TABS = filterTabs();

/** Document Y of an element's layout box — offsetTop ignores the transforms of in-flight layout
 *  animations (getBoundingClientRect would not), and we add our own offset (no scroll-margin). */
function layoutTop(el: HTMLElement) {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
  return y;
}
/** The first two desktop rows load eagerly (row 1 is at the fold; row 2 holds the 5th photo). */
const EAGER = 8;

export function TeamRoster() {
  const [filter, setFilter] = useState<FilterId>("all");
  const reduce = useReducedMotion() ?? false;
  const fine = useFinePointer();
  const scrollTo = useScrollTo();
  const barRef = useRef<HTMLDivElement>(null);
  const visible = team.filter((m) => inFilter(m, filter));
  const tab = TABS.find((t) => t.id === filter) ?? TABS[0];
  const fade = { duration: reduce ? 0.12 : dur.small, ease: ease.out };

  // Header contact sheet → show (un-filter if needed), scroll to and ping that member's card.
  useEffect(() => {
    let timer = 0;
    const onJump = (e: Event) => {
      const { slug, keyboard } = (e as CustomEvent<JumpDetail>).detail;
      const member = team.find((m) => m.slug === slug);
      if (!member) return;
      if (!inFilter(member, filter)) setFilter("all");
      // two frames: let the un-filtered grid commit and lay out before measuring
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const li = document.getElementById(`team-card-${slug}`);
          if (!li) return;
          const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 56;
          const barH = barRef.current?.getBoundingClientRect().height ?? 0;
          scrollTo(Math.max(0, layoutTop(li) - headerH - barH - 20));
          delete li.dataset.teamPing;
          void li.offsetWidth; // restart the ping animation
          li.dataset.teamPing = "";
          window.clearTimeout(timer);
          timer = window.setTimeout(() => delete li.dataset.teamPing, 1400);
          if (keyboard)
            li.querySelector<HTMLAnchorElement>("a[href^='/team/']")?.focus({
              preventScroll: true,
            });
        }),
      );
    };
    window.addEventListener(JUMP_EVENT, onJump);
    return () => {
      window.removeEventListener(JUMP_EVENT, onJump);
      window.clearTimeout(timer);
    };
  }, [filter, scrollTo]);

  return (
    // One wrapper for the roster AND the matrix, so the sticky filter stays in reach for both.
    <div>
      {/* Sticky filter bar (under the 56px header) */}
      <div
        ref={barRef}
        className="sticky top-[var(--header-h)] z-30 border-y border-hairline bg-bg/85 backdrop-blur-md"
      >
        <div className="container-page flex items-center justify-between gap-x-6 py-2.5">
          <div className="team-filter min-w-0 max-w-full">
            <ContinuousTabs
              aria-label="Filter the roster by discipline"
              panelId="team-grid"
              tabs={TABS}
              value={filter}
              onValueChange={(id) => setFilter(id as FilterId)}
              className="max-w-full"
            />
          </div>
          <p className="type-label hidden shrink-0 items-center gap-3 text-fg-muted sm:flex">
            <span className="hidden lg:inline">
              {fine ? "Hover a portrait to x-ray the original" : "Tap a card for the full profile"}
            </span>
            <span aria-hidden="true" className="hidden h-3 w-px bg-hairline lg:inline-block" />
            <span>
              Showing <RollingNumber value={visible.length} format={pad2} className="text-fg" label="Members shown" /> /{" "}
              {pad2(team.length)}
            </span>
          </p>
        </div>
      </div>

      <section aria-labelledby="team-roster-title">
        <h2 id="team-roster-title" className="sr-only">
          Roster
        </h2>
        <div
          id="team-grid"
          role="tabpanel"
          aria-label={filter === "all" ? "All members" : `${tab.label} members`}
          className="container-page relative mt-8 sm:mt-10"
        >
          <motion.ul className="relative grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[calc(var(--gutter)*1.5)] min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((m, i) => (
                <motion.li
                  key={m.slug}
                  layout="position"
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: reduce ? 1 : 0.9,
                    transition: { ...fade, duration: fade.duration * 0.7 },
                  }}
                  transition={{
                    layout: spring.heavy,
                    opacity: fade,
                    scale: spring.servo,
                  }}
                  id={`team-card-${m.slug}`}
                  className="min-w-0 scroll-mt-[calc(var(--header-h)+96px)]"
                >
                  <MemberCard member={m} eager={filter === "all" && i < EAGER} column={i % 4} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
          {visible.length === 0 && (
            <p className="type-label border border-dashed border-hairline-strong p-6 text-fg-muted">
              No one on this discipline yet.
            </p>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {filter === "all"
            ? `Showing all ${team.length} members.`
            : `Showing ${visible.length} of ${team.length} members: ${tab.label}.`}
        </p>
      </section>

      <RoleMatrix active={filter} />
    </div>
  );
}
