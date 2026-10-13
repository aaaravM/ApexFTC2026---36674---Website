// Derived data for the Links page (src/app/links/page.tsx): running reference numbers, display
// domains, a search index and the group headings. The links themselves live in
// src/content/links.ts — add, remove or reword them THERE; everything here follows automatically.

import { domainOf, LINK_GROUPS, links, type LinkGroup, type ResourceLink } from "@/content/links";

/** When every link on the page was last opened and checked (status + page title) — see links.ts. */
export const LINKS_CHECKED = "2026-10-12";

/**
 * Links that open a PDF instead of a web page. Checked 2026-10-12 (research/biobuzz-first.md §4:
 * the manual serves BIOBUZZ_Competition_Manual_TU04.pdf, tu-combined the combined Team Update PDF).
 * TODO(integration): move this to a `format: "pdf"` field on ResourceLink in src/content/links.ts.
 */
const PDF_URLS = new Set(["https://ftc.game/manual", "https://ftc.game/tu-combined"]);

/** Section code, DOM-id slug and a one-line description per group (page 07 → 07.1 … 07.4). */
export const GROUP_META: Record<LinkGroup, { code: string; id: string; blurb: string }> = {
  Season: { code: "07.1", id: "season", blurb: "The game, the rules and where the rules change." },
  "Our team": { code: "07.2", id: "our-team", blurb: "Our official record, our match stats and our robot code." },
  Build: { code: "07.3", id: "build", blurb: "The SDK, sensors and tuning tools APEX-R1 is built on." },
  Learn: { code: "07.4", id: "learn", blurb: "Where we learned to build, program and model." },
};

export interface LinkEntry extends ResourceLink {
  /** Running reference number across all groups, 1-based (stable while filtering). */
  n: number;
  /** "01" … "20" */
  ref: string;
  /** "ftc.game" */
  domain: string;
  pdf: boolean;
  /** Normalised text the filter searches. */
  haystack: string;
}

/** Lower-case, accents stripped, ™/® removed — applied to both the query and the index. */
export const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[™®]/g, "")
    .toLowerCase();

export const LINK_ENTRIES: LinkEntry[] = LINK_GROUPS.flatMap((g) => links.filter((l) => l.group === g)).map((l, i) => {
  const domain = domainOf(l.url);
  const pdf = PDF_URLS.has(l.url);
  return {
    ...l,
    n: i + 1,
    ref: String(i + 1).padStart(2, "0"),
    domain,
    pdf,
    haystack: normalize(
      [l.title, l.description, domain, l.group, l.official ? "official first" : "", pdf ? "pdf" : "", l.url].join("   "),
    ),
  };
});

export const TOTAL_LINKS = LINK_ENTRIES.length;
export const OFFICIAL_LINKS = LINK_ENTRIES.filter((e) => e.official).length;

/** Query → search tokens. Every token must appear somewhere in an entry for it to match. */
export const tokenize = (query: string) => normalize(query).split(/\s+/).filter(Boolean);

export const entryMatches = (entry: LinkEntry, tokens: string[]) => tokens.every((t) => entry.haystack.includes(t));

/** 7 → "07" */
export const pad2 = (n: number) => String(n).padStart(2, "0");
