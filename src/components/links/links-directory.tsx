"use client";

// LinksDirectory — the body of the Links page (DESIGN_SPEC §5 LINKS). The 20 verified links as a
// drawing-sheet reference list, grouped Season · Our team · Build · Learn, with a live filter.
//
//   • Filter: matches title, note, domain, group, "official" and "pdf"; every word must match.
//     Matches are marked like a highlighter, the count rolls, and 20 ticks (one per link, grouped)
//     show where in the list the matches are.
//   • Keyboard: ↓ or ↵ in the filter jumps into the list · ↑ ↓ Home End move between links ·
//     typing anywhere in the list goes back to the filter · Esc clears / returns to the filter.
//   • Desktop (≥1024): sticky rail = filter, count + ticks, group index with scroll-spy.
//     Phones/tablets: a sticky filter bar under the header.
//   • Each row is one link (stretched ::after) that opens in a new tab; the shared note
//     #links-newtab-note says so to screen readers. Reference numbers stay stable while filtering.
//   • Motion: each group's label decodes and its rule draws; rows rise in one after another with
//     their hairlines drawing (the first group plays on load, the rest when scrolled to — see
//     use-reveal.ts / links-motion.css); a title and then its domain roll to a duplicate and the ↗ swaps on hover.
//   • Reduced motion: no layout motion (MotionConfig) and ≤150ms crossfades; entrances static.
//
// Server-rendered with every link visible, so the page works before (and without) JavaScript.

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { LineDraw, Magnetic, RollText, Scramble, TextReveal } from "@/components/motion";
import { Button } from "@/components/site/button";
import { Chip } from "@/components/site/chip";
import { Kbd, ShortcutKbd } from "@/components/site/kbd";
import { OpenPaletteButton } from "@/components/site/open-palette-button";
import { RollingNumber } from "@/components/ui/rolling-number";
import { LINK_GROUPS, type LinkGroup } from "@/content/links";
import { useScrollTo } from "@/lib/hooks";
import { dur, ease, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { HighlightText } from "./highlight-text";
import { entryMatches, GROUP_META, LINK_ENTRIES, pad2, tokenize, TOTAL_LINKS, type LinkEntry } from "./link-data";
import { RevealSeq } from "./reveal-seq";

/** Example queries — each one returns a useful handful. */
const SUGGESTIONS = ["manual", "video", "odometry", "official"];

const ENTRIES_BY_GROUP = Object.fromEntries(
  LINK_GROUPS.map((g) => [g, LINK_ENTRIES.filter((e) => e.group === g)]),
) as Record<LinkGroup, LinkEntry[]>;

export function LinksDirectory({ notes }: { notes?: ReactNode }) {
  const [query, setQuery] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [active, setActive] = useState<LinkGroup | null>(null);
  /** The first group's rows play on load — only for the first render, never after filtering. */
  const [pristine, setPristine] = useState(true);
  const reduce = useReducedMotion();
  const scrollTo = useScrollTo();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<number, HTMLAnchorElement>());
  const typed = useRef(false);

  const tokens = useMemo(() => tokenize(query), [query]);
  const filtering = tokens.length > 0;
  const shown = useMemo(
    () => (filtering ? LINK_ENTRIES.filter((e) => entryMatches(e, tokens)) : LINK_ENTRIES),
    [filtering, tokens],
  );
  const shownSet = useMemo(() => new Set(shown.map((e) => e.n)), [shown]);
  const groups = useMemo(
    () =>
      LINK_GROUPS.map((group) => ({
        group,
        ...GROUP_META[group],
        total: ENTRIES_BY_GROUP[group].length,
        items: shown.filter((e) => e.group === group),
      })),
    [shown],
  );
  const visibleGroups = groups.filter((g) => g.items.length > 0);
  const visibleKey = visibleGroups.map((g) => g.id).join(",");

  // Screen-reader count, announced once typing pauses (never on first load).
  useEffect(() => {
    if (!typed.current) return;
    const q = query.trim();
    const msg = !filtering
      ? `Showing all ${TOTAL_LINKS} links.`
      : shown.length === 0
        ? `No links match “${q}”.`
        : `${shown.length} of ${TOTAL_LINKS} links match “${q}”.`;
    const id = window.setTimeout(() => setAnnouncement(msg), 450);
    return () => window.clearTimeout(id);
  }, [filtering, shown.length, query]);

  // Scroll-spy for the desktop index: the last group whose top has passed ~a third of the screen.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const root = listRef.current;
      if (!root) return;
      const line = window.innerHeight * 0.34;
      let current: LinkGroup | null = null;
      for (const g of LINK_GROUPS) {
        const el = root.querySelector<HTMLElement>(`#links-group-${GROUP_META[g].id}`);
        if (!el) continue;
        if (current === null || el.getBoundingClientRect().top <= line) current = g;
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [visibleKey]);

  const updateQuery = (next: string | ((q: string) => string)) => {
    typed.current = true;
    setPristine(false);
    setQuery(next);
  };

  /** Focus the filter with the caret at the end (after React has applied the new value). */
  const focusFilter = () => {
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
  };

  const focusRow = (index: number) => {
    const entry = shown[Math.max(0, Math.min(shown.length - 1, index))];
    if (entry) rowRefs.current.get(entry.n)?.focus();
  };

  const onFilterKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "ArrowDown" || e.key === "Enter") && shown.length > 0) {
      e.preventDefault();
      focusRow(0);
    } else if (e.key === "Escape" && query) {
      e.preventDefault();
      updateQuery("");
    }
  };

  const onListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const n = Number(target.dataset?.linksRow);
    if (!n) return; // only when a row link has focus
    const i = shown.findIndex((x) => x.n === n);
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case "ArrowDown":
        if (i < shown.length - 1) {
          e.preventDefault();
          focusRow(i + 1);
        }
        return;
      case "ArrowUp":
        e.preventDefault();
        if (i <= 0) focusFilter();
        else focusRow(i - 1);
        return;
      case "Home":
        e.preventDefault();
        focusRow(0);
        return;
      case "End":
        e.preventDefault();
        focusRow(shown.length - 1);
        return;
      case "Escape":
        e.preventDefault();
        focusFilter();
        return;
      case "Backspace":
        e.preventDefault();
        updateQuery((q) => q.slice(0, -1));
        focusFilter();
        return;
    }
    // Type-to-filter (only while a row has focus — WCAG 2.1.4 "active only on focus").
    if (e.key.length === 1 && e.key !== " " && e.key !== "/") {
      e.preventDefault();
      updateQuery((q) => q + e.key);
      focusFilter();
    }
  };

  const jumpTo = (id: string) => {
    const el = listRef.current?.querySelector<HTMLElement>(`#links-group-${id}`);
    if (!el) return;
    scrollTo(el, { offset: -96 });
    el.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  };

  const fade = reduce ? 0.12 : dur.small;
  const layoutTransition = { duration: 0.38, ease: ease.inOut };

  return (
    <section aria-label="Resource list" className="container-page pb-[var(--section-pad)]">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-[var(--gutter)]">
        {/* ── Filter: sticky bar on phones/tablets, sticky rail on desktop ───────────────────── */}
        <div
          className={cn(
            "sticky top-[var(--header-h)] z-30 -mx-[var(--page-margin)] border-b border-hairline bg-[var(--header-bg)] px-[var(--page-margin)] pt-3 pb-2.5 backdrop-blur-md backdrop-saturate-150",
            "lg:top-[calc(var(--header-h)+40px)] lg:col-span-3 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none lg:backdrop-saturate-100",
          )}
        >
          <div role="search" aria-label="Filter links">
            <label htmlFor="links-filter" className="type-label mb-3 hidden text-fg-muted lg:block">
              <Scramble text="[ Filter ]" immediate />
            </label>
            <div className="flex h-12 items-center gap-2.5 rounded-sm border border-border-ui bg-surface-1 pr-1.5 pl-3 transition-colors duration-[120ms] has-[input:focus-visible]:border-fg has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus">
              <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-fg-muted" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.25" />
                <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.25" />
              </svg>
              <input
                ref={inputRef}
                id="links-filter"
                type="search"
                value={query}
                onChange={(e) => updateQuery(e.target.value)}
                onKeyDown={onFilterKeyDown}
                placeholder={`Filter ${TOTAL_LINKS} links`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="search"
                aria-controls="links-list"
                aria-describedby="links-filter-hint"
                className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-fg placeholder:text-fg-muted focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              />
              <span aria-hidden="true" className="font-mono text-[11px] tracking-[0.04em] text-fg-muted tabular-nums lg:hidden">
                <span className={cn(filtering && "text-fg")}>{pad2(shown.length)}</span>/{TOTAL_LINKS}
              </span>
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    updateQuery("");
                    inputRef.current?.focus();
                  }}
                  className="inline-flex h-9 min-w-9 items-center justify-center rounded-sm text-fg-muted transition-colors duration-[120ms] hover:bg-surface-2 hover:text-fg"
                >
                  <Kbd className="pointer-events-none">Esc</Kbd>
                  <span className="sr-only">Clear the filter</span>
                </button>
              ) : (
                <span aria-hidden="true" className="hidden w-1 lg:block" />
              )}
            </div>
            <p id="links-filter-hint" className="sr-only">
              Filters the list as you type. Press Down Arrow to move into the results and Escape to clear.
            </p>
          </div>

          {/* phones: a thin strip of 20 ticks under the field */}
          <Ticks shown={shownSet} filtering={filtering} gap={2} groupGap={6} className="mt-2.5 h-[3px] lg:hidden" />

          {/* desktop rail */}
          <div className="hidden lg:block">
            <Suggestions onPick={(s) => (updateQuery(s), focusFilter())} active={query.trim().toLowerCase()} className="mt-3" />

            <div className="mt-10 flex items-end justify-between gap-4">
              <p aria-hidden="true" className="flex items-baseline gap-2 font-mono leading-none">
                <span className="text-[64px] font-light tracking-[-0.045em] text-fg tabular-nums">
                  <RollingNumber value={shown.length} format={pad2} stiffness={220} damping={28} />
                </span>
                <span className="text-[13px] text-fg-muted tabular-nums">/ {TOTAL_LINKS}</span>
              </p>
              <p className="type-label pb-1 text-right text-fg-muted">{filtering ? "Matching" : "Links"}</p>
            </div>
            <Ticks shown={shownSet} filtering={filtering} className="mt-4 h-5" />

            <GroupIndex groups={groups} active={active} filtering={filtering} onJump={jumpTo} className="mt-10" />

            <dl className="mt-8 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 font-mono text-[10px] leading-5 tracking-[0.08em] text-fg-muted uppercase">
              <dt className="flex gap-1">
                <Kbd>↓</Kbd>
              </dt>
              <dd>Into the list</dd>
              <dt className="flex gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
              </dt>
              <dd>Move</dd>
              <dt className="flex gap-1">
                <Kbd>↵</Kbd>
              </dt>
              <dd>Open in a new tab</dd>
              <dt className="flex gap-1">
                <Kbd>Esc</Kbd>
              </dt>
              <dd>Back to the filter · clear</dd>
            </dl>
          </div>
        </div>

        {/* ── The list ─────────────────────────────────────────────────────────────────────── */}
        <div
          id="links-list"
          ref={listRef}
          onKeyDown={onListKeyDown}
          className="relative mt-8 lg:col-span-9 lg:col-start-4 lg:mt-0 xl:col-span-8 xl:col-start-5"
        >
          {!filtering && <Suggestions onPick={(s) => (updateQuery(s), focusFilter())} active="" className="mb-8 lg:hidden" />}

          <LayoutGroup id="links-list">
            <AnimatePresence initial={false} mode="popLayout">
              {visibleGroups.map((g) => (
                <motion.section
                  key={g.group}
                  layout="position"
                  id={`links-group-${g.id}`}
                  aria-labelledby={`links-group-${g.id}-title`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: fade * 0.7, ease: ease.in } }}
                  transition={{ opacity: { duration: fade, ease: ease.out }, layout: layoutTransition }}
                  className="relative pb-16 sm:pb-24"
                >
                  <GroupHeader id={g.id} code={g.code} group={g.group} blurb={g.blurb} shown={g.items.length} total={g.total} filtering={filtering} />
                  <RevealList immediate={pristine && g.group === LINK_GROUPS[0]}>
                    <AnimatePresence initial={false} mode="popLayout">
                      {g.items.map((entry, i) => (
                        <motion.li
                          key={entry.url}
                          layout="position"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, transition: { duration: fade * 0.7, ease: ease.in } }}
                          transition={{ opacity: { duration: fade, ease: ease.out }, layout: layoutTransition }}
                          className="relative"
                        >
                          <Row
                            entry={entry}
                            index={i}
                            tokens={tokens}
                            linkRef={(el) => {
                              if (el) rowRefs.current.set(entry.n, el);
                              return () => {
                                rowRefs.current.delete(entry.n);
                              };
                            }}
                          />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </RevealList>
                </motion.section>
              ))}
              {visibleGroups.length === 0 && (
                <motion.div
                  key="links-empty"
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: fade * 0.7 } }}
                  transition={{ opacity: { duration: fade, ease: ease.out }, layout: layoutTransition }}
                  className="mb-16 sm:mb-24"
                >
                  <EmptyState
                    query={query.trim()}
                    onPick={(s) => (updateQuery(s), focusFilter())}
                    onClear={() => {
                      updateQuery("");
                      inputRef.current?.focus();
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>

          {notes}
        </div>
      </div>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────────────────────── */

/** A group's <ul>: its rows rise in one after another and their hairlines draw (use-reveal.ts). */
function RevealList({ immediate, children }: { immediate: boolean; children: ReactNode }) {
  return (
    <RevealSeq as="ul" immediate={immediate} delay={immediate ? 0.55 : 0.05} className="relative mt-6">
      <span aria-hidden="true" className="lk-rule absolute inset-x-0 top-0 h-px bg-hairline" />
      {children}
    </RevealSeq>
  );
}

function GroupHeader({
  id,
  code,
  group,
  blurb,
  shown,
  total,
  filtering,
}: {
  id: string;
  code: string;
  group: LinkGroup;
  blurb: string;
  shown: number;
  total: number;
  filtering: boolean;
}) {
  return (
    <header>
      <div className="flex items-center gap-4">
        <h2
          id={`links-group-${id}-title`}
          tabIndex={-1}
          className="type-label shrink-0 scroll-mt-28 rounded-[1px] text-fg-muted focus-visible:outline-offset-4"
        >
          <span aria-hidden="true">
            <Scramble text={`[ ${code} / ${group.toUpperCase()} ]`} hover />
          </span>
          <span className="sr-only">{group}</span>
        </h2>
        <LineDraw delay={0.1} className="flex-1 text-hairline" />
        <p className="type-label shrink-0 text-fg-muted tabular-nums">
          {filtering ? (
            <>
              <span className="text-fg">{pad2(shown)}</span> / {pad2(total)}
              <span className="sr-only"> links match</span>
            </>
          ) : (
            <>{pad2(total)} links</>
          )}
        </p>
      </div>
      <TextReveal
        as="p"
        mode="words"
        text={blurb}
        stagger={0.03}
        duration={0.7}
        delay={0.1}
        className="mt-4 max-w-[52ch] text-[15px] leading-6 text-fg-muted sm:text-[16px]"
      />
    </header>
  );
}

const ARROW_PATH = "M1.004 9.166 9.337.833m0 0v8.333m0-8.333H1.004";

function Row({
  entry,
  index,
  tokens,
  linkRef,
}: {
  entry: LinkEntry;
  index: number;
  tokens: string[];
  linkRef: (el: HTMLAnchorElement | null) => void | (() => void);
}) {
  const step = { "--i": index + 1 } as CSSProperties;
  return (
    <div
      data-lk-row=""
      style={step}
      className="lk-rise group/row relative grid grid-cols-[2rem_minmax(0,1fr)_0.75rem] gap-x-3 py-5 sm:grid-cols-[3rem_minmax(0,1fr)_0.875rem] sm:gap-x-4 sm:px-3 sm:py-6"
    >
      {/* the row's hairline, drawn with it */}
      <span aria-hidden="true" className="lk-rule absolute inset-x-0 bottom-0 h-px bg-hairline" />
      {/* hover / keyboard focus: the row fills from the left and a pollen tick marks it */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-surface-1 transition-[scale] duration-[220ms] ease-out group-hover/row:scale-x-100 group-has-[a:focus-visible]/row:scale-x-100 motion-reduce:transition-none"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-4 left-0 w-0.5 origin-top scale-y-0 bg-pollen-line transition-[scale] duration-[220ms] ease-out group-hover/row:scale-y-100 group-has-[a:focus-visible]/row:scale-y-100 motion-reduce:transition-none"
      />

      <span className="relative font-mono text-[11px] leading-[26px] text-fg-muted tabular-nums transition-colors duration-[120ms] group-hover/row:text-fg">
        {entry.ref}
      </span>

      <div className="relative min-w-0">
        <div className="flex items-baseline gap-3">
          <a
            ref={linkRef}
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            data-links-row={entry.n}
            aria-describedby="links-newtab-note"
            className="scroll-my-32 text-[17px] leading-[26px] font-[520] text-fg after:absolute after:inset-0 after:z-[1] after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus sm:text-[18px]"
          >
            {/* the title rolls up to a duplicate on hover / focus (links-motion.css) */}
            <span className="lk-roll">
              <span>
                <HighlightText text={entry.title} tokens={tokens} />
              </span>
              <span aria-hidden="true">
                <HighlightText text={entry.title} tokens={tokens} />
              </span>
            </span>
          </a>
          {/* dotted leader → domain, like a table of contents */}
          <span
            aria-hidden="true"
            className="mb-[0.42em] hidden h-0 min-w-6 flex-1 self-end border-b border-dotted border-hairline-strong transition-colors duration-[220ms] group-hover/row:border-border-ui sm:block"
          />
          {/* the domain rolls just after the title */}
          <span className="hidden shrink-0 font-mono text-[12px] text-fg-muted transition-colors duration-[220ms] group-hover/row:text-fg sm:inline">
            <span className="lk-roll lk-roll-late">
              <span>
                <HighlightText text={entry.domain} tokens={tokens} />
              </span>
              <span aria-hidden="true">
                <HighlightText text={entry.domain} tokens={tokens} />
              </span>
            </span>
          </span>
        </div>

        {/* phones: domain + tags under the title */}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] leading-5 text-fg-muted sm:hidden">
          <span>
            <HighlightText text={entry.domain} tokens={tokens} />
          </span>
          {entry.official && <span aria-hidden="true">·</span>}
          {entry.official && <span className="tracking-[0.08em] uppercase">Official</span>}
          {entry.pdf && <span aria-hidden="true">·</span>}
          {entry.pdf && <span className="tracking-[0.08em] uppercase">PDF</span>}
        </p>

        <div className="mt-2 flex items-start justify-between gap-6">
          <p className="max-w-[60ch] text-[15px] leading-6 text-fg-muted">
            <HighlightText text={entry.description} tokens={tokens} />
          </p>
          {(entry.official || entry.pdf) && (
            <span className="hidden shrink-0 gap-1.5 pt-px sm:flex">
              {entry.official && <Chip>Official</Chip>}
              {entry.pdf && <Chip>PDF</Chip>}
            </span>
          )}
        </div>
      </div>

      {/* ↗ — flies out up-right and a fresh one slides in from below-left */}
      <span
        aria-hidden="true"
        className="relative mt-[8px] size-[11px] overflow-clip text-fg-muted transition-colors duration-[220ms] group-hover/row:text-fg group-has-[a:focus-visible]/row:text-fg"
      >
        {[0, 1].map((k) => (
          <svg
            key={k}
            viewBox="0 0 10 10"
            fill="none"
            className={cn(
              "absolute inset-0 size-full transition-[translate] duration-[420ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none",
              k === 0
                ? "group-hover/row:translate-x-full group-hover/row:-translate-y-full group-has-[a:focus-visible]/row:translate-x-full group-has-[a:focus-visible]/row:-translate-y-full motion-reduce:translate-0!"
                : "-translate-x-full translate-y-full group-hover/row:translate-0 group-has-[a:focus-visible]/row:translate-0 motion-reduce:hidden",
            )}
          >
            <path d={ARROW_PATH} stroke="currentColor" strokeWidth="1.25" />
          </svg>
        ))}
      </span>
    </div>
  );
}

/** One tick per link, grouped; lit = matches the filter. Decorative (the count is announced). */
function Ticks({
  shown,
  filtering,
  className,
  gap = 3,
  groupGap = 8,
}: {
  shown: Set<number>;
  filtering: boolean;
  className?: string;
  /** px between ticks */
  gap?: number;
  /** px between groups */
  groupGap?: number;
}) {
  return (
    <div aria-hidden="true" className={cn("flex", className)} style={{ columnGap: groupGap }}>
      {LINK_GROUPS.map((g) => {
        const count = ENTRIES_BY_GROUP[g].length;
        return (
          // basis = this group's own gaps, grow = its tick count → every tick gets the same width
          <div key={g} className="flex h-full" style={{ flex: `${count} 1 ${(count - 1) * gap}px`, columnGap: gap }}>
            {ENTRIES_BY_GROUP[g].map((e) => {
              const on = shown.has(e.n);
              return (
                <span
                  key={e.n}
                  className={cn(
                    "h-full flex-1 origin-bottom transition-[scale,background-color] duration-[220ms] ease-out motion-reduce:transition-none",
                    on ? (filtering ? "bg-pollen-line" : "bg-fg-muted") : "scale-y-[0.3] bg-hairline-strong",
                  )}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function GroupIndex({
  groups,
  active,
  filtering,
  onJump,
  className,
}: {
  groups: { group: LinkGroup; id: string; code: string; total: number; items: LinkEntry[] }[];
  active: LinkGroup | null;
  filtering: boolean;
  onJump: (id: string) => void;
  className?: string;
}) {
  return (
    <nav aria-label="Link groups" className={className}>
      <Scramble as="p" text="[ Index ]" className="type-label text-fg-muted" />
      <LayoutGroup id="links-index">
        <ol className="mt-3 border-t border-hairline">
          {groups.map((g) => {
            const empty = g.items.length === 0;
            const isActive = active === g.group && !empty;
            return (
              <li key={g.group} className="relative border-b border-hairline">
                {isActive && (
                  <motion.span
                    layoutId="links-index-tick"
                    transition={spring.servo}
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-0.5 bg-pollen-line"
                  />
                )}
                <button
                  type="button"
                  disabled={empty}
                  onClick={() => onJump(g.id)}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "group/idx flex min-h-11 w-full items-baseline gap-3 py-3 pr-1 pl-3.5 text-left transition-colors duration-[120ms] disabled:cursor-default",
                    empty ? "opacity-40" : "hover:text-fg",
                  )}
                >
                  <span className="w-8 shrink-0 font-mono text-[10px] text-fg-muted tabular-nums">{g.code}</span>
                  <span
                    className={cn(
                      "flex-1 text-[14px] transition-colors duration-[120ms]",
                      isActive ? "text-fg" : "text-fg-muted group-hover/idx:text-fg",
                    )}
                  >
                    {g.group}
                  </span>
                  <span className="font-mono text-[11px] text-fg-muted tabular-nums">
                    {filtering ? (
                      <>
                        <span className={cn(!empty && "text-fg")}>{pad2(g.items.length)}</span>/{pad2(g.total)}
                      </>
                    ) : (
                      pad2(g.total)
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </LayoutGroup>
    </nav>
  );
}

function Suggestions({
  onPick,
  active,
  className,
}: {
  onPick: (s: string) => void;
  active: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center font-mono text-[11px] tracking-[0.04em]", className)}>
      <span className="type-label mr-2 text-fg-muted">Try</span>
      {SUGGESTIONS.map((s, i) => (
        <span key={s} className="inline-flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="px-1 text-hairline-strong">
              /
            </span>
          )}
          <button
            type="button"
            onClick={() => onPick(s)}
            aria-pressed={active === s}
            className={cn(
              "link-draw inline-flex h-7 items-center px-0.5 transition-colors duration-[120ms] hover:text-fg",
              active === s ? "text-fg [background-size:100%_1px]" : "text-fg-muted",
            )}
          >
            {s}
          </button>
        </span>
      ))}
    </div>
  );
}

function EmptyState({ query, onPick, onClear }: { query: string; onPick: (s: string) => void; onClear: () => void }) {
  return (
    <div className="relative border border-dashed border-hairline-strong p-6 sm:p-10">
      <div aria-hidden="true" className="hatch pointer-events-none absolute inset-0 text-fg-muted opacity-60" />
      <div className="relative">
        <p className="type-label text-fg-muted">[ No match ]</p>
        <p className="type-h3 mt-4 max-w-[30ch] break-words text-fg">Nothing on this list matches “{query}”.</p>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-6 text-fg-muted">
          Try one of these, or search the whole site — pages, people and robot subsystems.
        </p>
        <Suggestions onPick={onPick} active="" className="mt-5" />
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Magnetic>
            <Button onClick={onClear}>
              <RollText>Clear filter</RollText>
            </Button>
          </Magnetic>
          <Magnetic>
            <OpenPaletteButton variant="ghost">
              <RollText>Search the site</RollText> <ShortcutKbd className="ml-1" />
            </OpenPaletteButton>
          </Magnetic>
        </div>
      </div>
    </div>
  );
}
