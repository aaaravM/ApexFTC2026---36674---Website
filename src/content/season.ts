// ─────────────────────────────────────────────────────────────────────────────
// SEASON — verified BIOBUZZ™ facts. Checked against the Competition Manual Team Update 04
// (TU04, 2026-10-08). Team Updates post every Thursday, so re-check before each event and bump
// `asOf` when you do. Cite the manual section for every fact (`cite`).
// Link to the manual — never re-host it (manual 1.7.2).
// ─────────────────────────────────────────────────────────────────────────────

export const season = {
  game: "BIOBUZZ",
  presentedBy: "RTX",
  firstSeason: "FIRST CANOPY",
  years: "2026–27",
  asOf: "TU04",
  asOfDate: "2026-10-08",
  manualUrl: "https://ftc.game/manual",
  teamUpdatesUrl: "https://ftc.game/tu-combined",
} as const;

export interface Fact {
  label: string;
  value: string;
  /** Manual reference, e.g. "Manual TU04 · 9.8". */
  cite: string;
}

export const keyDates: Fact[] = [
  { label: "Kickoff", value: "Sat 12 Sep 2026", cite: "Key Season Dates V26-27.1" },
  { label: "Earliest qualifiers", value: "15 Oct 2026", cite: "Key Season Dates V26-27.1" },
  { label: "FIRST Championship", value: "28 Apr – 1 May 2027", cite: "Key Season Dates V26-27.1" },
];

export const scoringElements = {
  pollen: {
    name: "POLLEN",
    size: "2.8 in (7.1 cm)",
    colour: "Yellow",
    perMatch: 40,
    note: "Either alliance can score it.",
    cite: "Manual TU04 · 9.8",
  },
  nectar: {
    name: "NECTAR",
    size: "3.6 in (9.1 cm)",
    colour: "Red / blue",
    perMatch: 16,
    note: "8 red + 8 blue. A robot may never control the opponent's NECTAR (G408).",
    cite: "Manual TU04 · 9.8, G408",
  },
} as const;

export const matchTiming: Fact[] = [
  { label: "AUTO", value: "30 s", cite: "Manual TU04 · 10.1" },
  { label: "Transition", value: "8 s", cite: "Manual TU04 · 10.1" },
  { label: "TELEOP", value: "2:00", cite: "Manual TU04 · 10.1" },
  { label: "Endgame", value: "last 60 s", cite: "Manual TU04 · G426, G410" },
];

/** Table 10-2 (p.91). AUTO / TELEOP points. `null` = not scored in that period. */
export const pointValues: { action: string; auto: number | null; teleop: number | null }[] = [
  { action: "LEAVE", auto: 3, teleop: null },
  { action: "PARK", auto: 5, teleop: 5 },
  { action: "HIVE TIP (each)", auto: 20, teleop: 20 },
  { action: "Element in an upward CELL", auto: null, teleop: 2 },
  { action: "Bottom NECTAR bonus", auto: null, teleop: 5 },
  { action: "Element in an owned FLOWER", auto: null, teleop: 2 },
  { action: "Element in a GARDEN", auto: null, teleop: 1 },
];
export const pointValuesCite = "Manual TU04 · Table 10-2";

export const fieldFacts: Fact[] = [
  { label: "Field", value: "144 × 144 in, 36 tiles", cite: "Manual TU04 · 9.2" },
  { label: "HIVE pivot height", value: "43.95 in", cite: "Manual TU04 · 9.6" },
  { label: "CELL opening", value: "≈ 20 × 14 in", cite: "Manual TU04 · 9.6.2" },
  { label: "AprilTags", value: "36h11, 3.25 in, IDs 30–45", cite: "Manual TU04 · 9.9" },
  { label: "Start size", value: "18 × 18 × 18 in", cite: "Manual TU04 · R102" },
  { label: "Expansion", value: "18 × 24 × 29 in", cite: "Manual TU04 · R105" },
  { label: "Elements held", value: "max 4", cite: "Manual TU04 · G407" },
];

/** The three facts the home page leads with (C6). */
export const headlineFacts: Fact[] = [
  { label: "POLLEN", value: "2.8 in × 40", cite: "Manual TU04 · 9.8" },
  { label: "NECTAR", value: "3.6 in red / blue", cite: "Manual TU04 · 9.8" },
  { label: "HIVE TIP", value: "20 pts", cite: "Manual TU04 · Table 10-2" },
];

/** Ranking points for "All Other Events" (regional/Championship thresholds are TBA). */
export const rankingPoints: Fact[] = [
  { label: "Win / tie", value: "3 / 1 RP", cite: "Manual TU04 · Table 10-3" },
  { label: "SWARM", value: "1 RP at ≥ 16 LEAVE + PARK points", cite: "Manual TU04 · Table 10-3" },
  { label: "POLLINATOR 1", value: "1 RP at ≥ 4 TIPS", cite: "Manual TU04 · Table 10-3" },
  { label: "POLLINATOR 2", value: "1 RP at ≥ 7 TIPS", cite: "Manual TU04 · Table 10-3" },
];
