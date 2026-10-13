// ─────────────────────────────────────────────────────────────────────────────
// OUTREACH — the activity log. Each entry is a "mission" with an OUT-### id.
// Dates, reach and photos are PENDING until the team logs them — never estimate high.
// When you log an entry, use the official FIRST Outreach Terms (Reached, Hosted, Mentored…)
// and state reach as a LOW-END estimate with how you counted it.
// ─────────────────────────────────────────────────────────────────────────────

export type OutreachKind = "Workshop" | "Event" | "Mentorship" | "Community";

export const OUTREACH_KINDS: OutreachKind[] = ["Workshop", "Event", "Mentorship", "Community"];

export interface OutreachEntry {
  id: string;
  kind: OutreachKind;
  title: string;
  summary: string;
  tags: string[];
  /** ISO date, or undefined while pending. */
  date?: string;
  /** Low-end count of people reached, with the method. */
  reach?: { count: number; method: string };
  /** Official Outreach Terms category, once logged. */
  term?: "Started" | "Sustained" | "Mentored" | "Published Resource" | "Hosted" | "Supported" | "Reached" | "Advocated";
  recurring?: boolean;
}

export const outreach = {
  title: "Engineering in the community.",
  lede: "Apex Robotics runs workshops, demos, and mentorship to grow the FTC community and get more students into STEM.",
  cta: {
    title: "Bring Apex to your school or event.",
    body: "Want Apex Robotics at your school or event? Reach out to book a demo, workshop, or mentorship session.",
    /** Shown while there is no team inbox yet. */
    pendingContact: "Contact details coming soon — reach us through the sponsorship packet for now.",
  },
} as const;

export const outreachLog: OutreachEntry[] = [
  {
    id: "OUT-001",
    kind: "Workshop",
    title: "Intro to FTC Programming",
    summary: "Hands-on Java + FTC SDK session for middle schoolers.",
    tags: ["Java", "FTC SDK", "Middle school"],
  },
  {
    id: "OUT-002",
    kind: "Event",
    title: "STEM Night Demo",
    summary: "Drove the robot for local families and answered questions about FTC.",
    tags: ["Demo", "Families"],
  },
  {
    id: "OUT-003",
    kind: "Mentorship",
    title: "Rookie Team Support",
    summary: "Helped a first-year team scope their drivetrain and code.",
    tags: ["Mentoring", "Drivetrain", "Code"],
  },
  {
    id: "OUT-004",
    kind: "Community",
    title: "Library Build Days",
    summary: "Open build sessions at the public library — anyone can stop by.",
    tags: ["Open build", "Library"],
  },
];

/** Impact strip — values stay null (rendered as "—") until the first season report. */
export const impactMetrics: { label: string; value: number | null; note: string }[] = [
  { label: "People reached", value: null, note: "Logged after our first season report" },
  { label: "Events hosted", value: null, note: "Logged after our first season report" },
  { label: "Teams mentored", value: null, note: "Logged after our first season report" },
  { label: "Published resources", value: null, note: "Logged after our first season report" },
];
