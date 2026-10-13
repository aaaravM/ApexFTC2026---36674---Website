"use client";

// OutreachLog — the activity log on /outreach (DESIGN_SPEC §5 OUTREACH).
//
// Each entry is a "mission" row: mono ID (OUT-001…), type (Workshop / Event / Mentorship /
// Community), title, one-liner, tags, and a small record block — DATE · REACH · TERM — that reads
// PENDING until the team logs it in src/content/outreach.ts (nothing here is ever estimated).
// The log ends with an open row, the next ID in sequence, that hands off to the booking section.
//
// Motion explains two things only:
//   • the filter (watermelon continuous-tabs): rows leave, the rest slide into place (servo spring);
//   • reading position: a hairline rail runs node to node down the log; each segment draws in as
//     its row passes the reading line, so the line arrives at the open entry as you finish reading.
//     (Per-row segments, not one stretched SVG: a stretched non-scaling stroke breaks pathLength
//     dashes in Chromium.)
//   • arrival (plays once per row as it scrolls in): the row slides in from the left (Entrance),
//     the ID number and type decode, the
//     title rises, the tags step in and the DATE · REACH · TERM block wipes in like a plotter pass.
// Reduced motion: MotionConfig (root) drops the transforms/layout moves; the rail is drawn statically.
// DOM ids are prefixed "outreach-" (hidden routes stay mounted under cacheComponents).

import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useScroll, type Transition } from "motion/react";
import { useRef, useState, type RefObject } from "react";
import { ImageWipe, Scramble, TextReveal } from "@/components/motion";
import { Entrance } from "./entrance";
import { Stagger, StaggerItem } from "./motion-safe";
import { Chip } from "@/components/site/chip";
import ContinuousTabs from "@/components/watermelon/continuous-tabs";
import { OUTREACH_KINDS, outreachLog, type OutreachEntry, type OutreachKind } from "@/content/outreach";
import { fmtInt } from "@/lib/format";
import { dur, ease, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { JumpLink } from "./jump-link";

const ALL = "all";
const kindId = (k: OutreachKind) => k.toLowerCase();

const TABS = [
  { id: ALL, label: "All", count: outreachLog.length },
  ...OUTREACH_KINDS.map((k) => ({
    id: kindId(k),
    label: k,
    count: outreachLog.filter((e) => e.kind === k).length,
  })),
];

/** The next ID in sequence ("OUT-005"), computed from the log so it stays right as entries are added. */
const NEXT_ID = (() => {
  const max = outreachLog.reduce((m, e) => Math.max(m, Number(e.id.replace(/\D/g, "")) || 0), 0);
  return `OUT-${String(max + 1).padStart(3, "0")}`;
})();

const rowTransition: Transition = {
  opacity: { duration: dur.medium, ease: ease.out },
  y: { duration: dur.medium, ease: ease.out },
  layout: spring.servo,
};
const rowExit = {
  opacity: 0,
  transition: { duration: dur.medium * 0.7, ease: ease.in },
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function OutreachLog({ className }: { className?: string }) {
  const [filter, setFilter] = useState<string>(ALL);
  const shown = filter === ALL ? outreachLog : outreachLog.filter((e) => kindId(e.kind) === filter);
  const activeLabel = TABS.find((t) => t.id === filter)?.label ?? "All";
  const total = outreachLog.length;
  const status =
    filter === ALL
      ? `Showing all ${plural(total, "entry", "entries")}.`
      : `Showing ${plural(shown.length, `${activeLabel} entry`, `${activeLabel} entries`)} of ${total}.`;

  return (
    <div className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-baseline font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase tabular-nums" aria-hidden="true">
          <NumberFlow value={shown.length} format={{ minimumIntegerDigits: 2 }} locales="en-US" className="text-fg" />
          <span className="whitespace-pre"> / {String(total).padStart(2, "0")} entries</span>
        </p>
        <ContinuousTabs
          tabs={TABS}
          value={filter}
          onValueChange={setFilter}
          panelId="outreach-log-list"
          aria-label="Filter the activity log by type"
          className="self-start max-sm:flex-wrap sm:self-auto"
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      <div id="outreach-log-list" role="region" aria-label="Outreach entries" className="relative mt-8 sm:mt-10">
        <ol className="relative">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((entry) => (
              <motion.li
                key={entry.id}
                layout="position"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={rowExit}
                transition={rowTransition}
              >
                <LogEntry entry={entry} />
              </motion.li>
            ))}
          </AnimatePresence>
          <motion.li layout="position" transition={rowTransition}>
            <NextEntry />
          </motion.li>
        </ol>
      </div>
    </div>
  );
}

/* ─── rows ──────────────────────────────────────────────────────────────────── */

const rowGrid =
  "grid grid-cols-[56px_minmax(0,1fr)] gap-x-4 py-8 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-x-6 lg:grid-cols-12 lg:gap-x-[var(--gutter)] lg:py-10";

/**
 * The rail from this row's node to the next row's node (rows are stacked, so that's the row's own
 * height). The drawn line follows the reading line at 62% of the viewport.
 */
function RailSegment({ target }: { target: RefObject<HTMLElement | null> }) {
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start 0.62", "end 0.62"],
  });
  const place = "absolute top-[38px] bottom-[-38px] left-[3px] w-px lg:top-[46px] lg:bottom-[-46px]";
  return (
    <>
      <span aria-hidden="true" className={cn(place, "bg-hairline")} />
      {/* Same markup on server and client (no useReducedMotion branch → no hydration diff);
          reduced motion overrides the scroll-driven scale in CSS and shows the whole line. */}
      <motion.span
        aria-hidden="true"
        className={cn(place, "origin-top bg-fg-muted motion-reduce:[transform:none]!")}
        style={{ scaleY: scrollYProgress }}
      />
    </>
  );
}

function LogEntry({ entry }: { entry: OutreachEntry }) {
  const ref = useRef<HTMLElement>(null);
  const slug = entry.id.toLowerCase();
  const [prefix, num] = splitId(entry.id);
  return (
    <article ref={ref} id={`outreach-${slug}`} aria-labelledby={`outreach-${slug}-title`} className="relative pl-7 sm:pl-10">
      <RailSegment target={ref} />
      <span aria-hidden="true" className="absolute top-[35px] left-0 size-[7px] rounded-full border border-border-ui bg-bg lg:top-[43px]" />
      <Entrance preset="slide-left" self className={cn(rowGrid, "border-t border-hairline")}>
        <p className="lg:col-span-2">
          <span className="block font-mono text-[10px] leading-[14px] tracking-[0.08em] text-fg-muted">{prefix}</span>
          <Scramble
            text={num}
            duration={0.7}
            className="mt-1 block font-mono text-[30px] leading-none font-light tracking-[-0.03em] text-fg tabular-nums sm:text-[44px]"
          />
        </p>

        <div className="min-w-0 lg:col-span-6">
          <Scramble as="p" text={entry.kind.toUpperCase()} className="type-label leading-[14px] text-fg-muted" />
          <h3 id={`outreach-${slug}-title`} className="type-h3 mt-3">
            <TextReveal text={entry.title} mode="words" stagger={0.05} duration={0.75} />
          </h3>
          <p className="type-body mt-3 text-fg-muted">{entry.summary}</p>
          <Stagger as="ul" className="mt-5 flex flex-wrap gap-1.5" amount={0.5} delay={0.2}>
            {entry.tags.map((t) => (
              <StaggerItem as="li" key={t}>
                <Chip>{t}</Chip>
              </StaggerItem>
            ))}
            {entry.recurring && (
              <StaggerItem as="li">
                <Chip tone="strong">Recurring</Chip>
              </StaggerItem>
            )}
          </Stagger>
        </div>

        <div className="col-span-2 mt-7 sm:col-span-1 sm:col-start-2 lg:col-span-4 lg:col-start-9 lg:mt-0">
          <ImageWipe from="left" delay={0.15}>
            <RecordFields
              cells={[
                { label: "Date", value: entry.date },
                {
                  label: "Reach",
                  value: entry.reach ? `≥ ${fmtInt(entry.reach.count)}` : undefined,
                },
                { label: "Term", value: entry.term },
              ]}
            />
          </ImageWipe>
          {entry.reach?.method && (
            <p className="mt-2 font-mono text-[10px] leading-4 tracking-[0.06em] text-fg-muted uppercase">
              Reach counted by: <span className="normal-case">{entry.reach.method}</span>
            </p>
          )}
        </div>
      </Entrance>
    </article>
  );
}

/** The open row: the next ID in sequence, outlined because it hasn't been written yet. */
function NextEntry() {
  const [prefix, num] = splitId(NEXT_ID);
  return (
    <article id="outreach-next" aria-labelledby="outreach-next-title" className="relative pl-7 sm:pl-10">
      <span
        aria-hidden="true"
        className="absolute top-[34px] left-[-1px] size-[9px] rounded-full border border-pollen-line bg-bg lg:top-[42px]"
      >
        <span className="animate-led-pulse absolute inset-[2px] rounded-full bg-pollen-line" />
      </span>
      <div className={cn(rowGrid, "border-y border-dashed border-hairline-strong")}>
        <p className="lg:col-span-2">
          <span className="block font-mono text-[10px] leading-[14px] tracking-[0.08em] text-fg-muted">{prefix}</span>
          <span className="mt-1 block font-mono text-[30px] leading-none font-light tracking-[-0.03em] text-transparent tabular-nums [-webkit-text-stroke:1px_var(--border-ui)] sm:text-[44px]">
            {num}
          </span>
        </p>

        <div className="min-w-0 lg:col-span-6">
          <p className="type-label leading-[14px] text-pollen-text">Next entry · open</p>
          <h3 id="outreach-next-title" className="type-h3 mt-3">
            Open for booking.
          </h3>
          <p className="type-body mt-3 text-fg-muted">A demo, a workshop or a mentorship session — at your school or event.</p>
          <JumpLink href="#outreach-book" className="mt-5">
            How to book
          </JumpLink>
        </div>

        <div className="col-span-2 mt-7 sm:col-span-1 sm:col-start-2 lg:col-span-4 lg:col-start-9 lg:mt-0">
          <RecordFields
            open
            cells={[
              { label: "Date", value: undefined },
              { label: "Reach", value: undefined },
              { label: "Term", value: undefined },
            ]}
          />
        </div>
      </div>
    </article>
  );
}

/** "OUT-005" → ["OUT-", "005"] */
function splitId(id: string): [string, string] {
  const m = /^(.*?)(\d+)$/.exec(id);
  return m ? [m[1], m[2]] : ["", id];
}

/**
 * DATE · REACH · TERM as a three-cell title block. Missing values read PENDING on a hatched cell
 * (`open` rows read "—": nothing to log yet).
 */
function RecordFields({ cells, open }: { cells: { label: string; value?: string }[]; open?: boolean }) {
  return (
    <dl className="grid grid-cols-3 border-t border-l border-hairline">
      {cells.map((c) => {
        const missing = !c.value;
        return (
          <div
            key={c.label}
            className={cn(
              "min-w-0 border-r border-b border-hairline px-3 py-2",
              missing && !open && "hatch text-fg-muted",
              open && "border-dashed",
            )}
          >
            <dt className="font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">{c.label}</dt>
            <dd
              className={cn(
                "truncate font-mono text-[12px] leading-5 tracking-[0.02em] uppercase tabular-nums",
                missing ? "text-fg-muted" : "text-fg",
              )}
            >
              {c.value ?? (open ? "—" : "Pending")}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
