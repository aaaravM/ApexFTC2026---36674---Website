// TEAM page data helpers — everything here is DERIVED from src/content/team.ts and site.ts
// (counts, filters, discipline → page links). Nothing is typed in by hand, so the page can't
// drift from the roster. Server- and client-safe (no hooks, no Date, no randomness).

import { pageBlurbs, site, type NavItem } from "@/content/site";
import {
  DISCIPLINES,
  displayName,
  hasPublicPhoto,
  rosterCounts,
  team,
  type Discipline,
  type TeamMember,
} from "@/content/team";
import { fmtFixed, fmtInt } from "@/lib/format";

/** "07" — zero-padded instrument readouts. */
export const pad2 = (n: number) => String(n).padStart(2, "0");

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];
/** 12 → "twelve" (falls back to digits above twenty). */
export const numberWord = (n: number) => WORDS[n] ?? fmtInt(n);
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 1-based roster position. By slug, not identity: members passed from a Server Component to a
 *  Client Component arrive as copies, so `team.indexOf(member)` would be -1 there. */
export const memberNumber = (m: Pick<TeamMember, "slug">) => team.findIndex((t) => t.slug === m.slug) + 1;
/** "06" */
export const frameLabel = (m: Pick<TeamMember, "slug">) => pad2(memberNumber(m));
/** "#06 / 12" — same as memberIndexLabel() in content/team.ts, but safe for client copies. */
export const indexLabel = (m: Pick<TeamMember, "slug">) => `#${frameLabel(m)} / ${pad2(team.length)}`;

/** The role line is only worth printing when it says more than the discipline chips. */
export const roleIsDisciplines = (m: TeamMember) =>
  m.role.trim().toLowerCase() === m.disciplines.join(" · ").toLowerCase();

export const founder = team.find((m) => m.founder);

export interface RosterStats {
  total: number;
  photos: number;
  bios: number;
  /** Sum of discipline assignments (one member can hold several). */
  assignments: number;
  /** Members on two or more disciplines. */
  multi: number;
  /** "1.9" disciplines per member. */
  perMember: string;
}

export function rosterStats(members: TeamMember[] = team): RosterStats {
  const assignments = members.reduce((n, m) => n + m.disciplines.length, 0);
  return {
    total: members.length,
    photos: members.filter(hasPublicPhoto).length,
    bios: members.filter((m) => !m.bioPending).length,
    assignments,
    multi: members.filter((m) => m.disciplines.length > 1).length,
    perMember: fmtFixed(members.length ? assignments / members.length : 0, 1),
  };
}

// ─── Filters (TEAM roster) ───────────────────────────────────────────────────

export type FilterId = "all" | Lowercase<Discipline>;

export interface FilterTab {
  id: FilterId;
  label: string;
  count: number;
  discipline?: Discipline;
}

export function filterTabs(): FilterTab[] {
  const counts = rosterCounts();
  return [
    { id: "all", label: "All", count: team.length },
    ...DISCIPLINES.map((d) => ({ id: d.toLowerCase() as FilterId, label: d, count: counts[d], discipline: d })),
  ];
}

export const disciplineOf = (id: FilterId): Discipline | undefined => DISCIPLINES.find((d) => d.toLowerCase() === id);

export const inFilter = (m: TeamMember, id: FilterId) =>
  id === "all" || m.disciplines.some((d) => d.toLowerCase() === id);

// ─── Where each discipline's work shows up on the site ───────────────────────
// Lead has no page of its own (it spans everything), so it maps to nothing.

const PAGE_FOR: Partial<Record<Discipline, NavItem["href"]>> = {
  CAD: "/cad",
  Code: "/code",
  Build: "/robot",
  Socials: "/outreach",
};

/** What the people in a discipline are called in a count ("7 on CAD"). */
const CREW: Record<Discipline, [string, string]> = {
  Lead: ["lead", "leads"],
  CAD: ["designer", "designers"],
  Code: ["programmer", "programmers"],
  Build: ["builder", "builders"],
  Socials: ["on socials", "on socials"],
};

export const crewLabel = (d: Discipline, n: number) => `${n} ${CREW[d][n === 1 ? 0 : 1]}`;

export interface WorkLink {
  discipline: Discipline;
  href: NavItem["href"];
  index: string;
  label: string;
  blurb: string;
}

export function workLinkFor(d: Discipline): WorkLink | undefined {
  const href = PAGE_FOR[d];
  if (!href) return undefined;
  const nav = site.nav.find((n) => n.href === href);
  if (!nav) return undefined;
  return { discipline: d, href, index: nav.index, label: nav.label, blurb: pageBlurbs[href] };
}

/** Every discipline that has a page, in site-nav order (02 outreach, 03 robot, 04 CAD, 05 code). */
export function workLinks(): WorkLink[] {
  return DISCIPLINES.map(workLinkFor)
    .filter((w): w is WorkLink => Boolean(w))
    .sort((a, b) => a.index.localeCompare(b.index));
}

/** A member's pages, in their own discipline order. */
export const memberWork = (m: TeamMember) => m.disciplines.map(workLinkFor).filter((w): w is WorkLink => Boolean(w));

/** "Twelve students across CAD, code, build and outreach — founded by Anish Pattanaik in 2026." */
export function teamLede(): string {
  const who = founder ? ` — founded by ${displayName(founder)} in ${site.rookieYear}` : "";
  return `${capitalize(numberWord(team.length))} students across CAD, code, build and outreach${who}.`;
}
