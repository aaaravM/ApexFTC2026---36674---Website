// ─────────────────────────────────────────────────────────────────────────────
// SPONSORS — tiers and wording come from the team's real sponsorship packet
// ("TEAM 36674 ROOKIE ROBOTICS SPONSORSHIP PROPOSAL", public Google Doc in site.links.sponsorPacket).
// No sponsor has signed yet, so every tier shows OPEN "Founding Partner" slots — never fake names.
//
// When a sponsor signs: add them to `sponsors` below (with their permission to show the logo).
// Do NOT put a student's personal email on the website (FIRST YPP) — use the packet link or a
// team inbox in site.links.email.
// ─────────────────────────────────────────────────────────────────────────────

export type TierId = "gold" | "silver" | "bronze" | "in-kind";

export interface Tier {
  id: TierId;
  name: string;
  /** Display amount, e.g. "$500+". */
  amount: string;
  /** Minimum in USD (null for in-kind). */
  minUsd: number | null;
  benefits: string[];
}

export const sponsorPage = {
  title: "Become a Founding Partner.",
  lede: "As a rookie team in our inaugural season, Team 36674 is building more than just a robot — we are building a foundation for STEM excellence in our community.",
  why: [
    { title: "Legacy impact", body: "Be the brand that made our first season possible — a permanent association with local STEM growth." },
    { title: "Brand visibility", body: "Your logo in front of students, parents and professionals at regional and state-level competitions." },
    { title: "Community impact", body: "Support a local initiative that provides free or low-cost STEM opportunities for students in our area." },
    { title: "Future talent", body: "Connect with motivated students developing the exact skills modern technical careers need." },
  ],
  closing: "Team 36674 is a proud participant in the global robotics community, fostering Gracious Professionalism® and innovation in every match.",
} as const;

export const tiers: Tier[] = [
  {
    id: "gold",
    name: "Gold",
    amount: "$500+",
    minUsd: 500,
    benefits: [
      "Large logo on the robot and team shirts",
      "Prominent placement on pit banners and the website",
      "Verbal recognition at events",
      "Framed team photo and a custom “Founding Partner” plaque",
    ],
  },
  {
    id: "silver",
    name: "Silver",
    amount: "$250+",
    minUsd: 250,
    benefits: [
      "Medium logo on the robot, shirts and website",
      "Logo on our pit banner at competitions",
      "Invitation to our end-of-season open house",
    ],
  },
  {
    id: "bronze",
    name: "Bronze",
    amount: "$100+",
    minUsd: 100,
    benefits: [
      "Name or small logo on the back of team shirts and the robot",
      "Recognition on our official social media channels",
      "Name listed on our website",
    ],
  },
  {
    id: "in-kind",
    name: "In-kind",
    amount: "Tools · materials · mentorship",
    minUsd: null,
    benefits: [
      "Every donation, financial or in-kind, directly impacts our ability to compete",
      "Tools, materials and mentorship are all welcome",
    ],
  },
];

/** Where the money goes — the packet's rookie startup budget. */
export const budget = {
  rangeUsd: [3800, 5500] as const,
  label: "Typical rookie startup budget",
  items: [
    { label: "Startup hardware", detail: "Control hubs, electronics sets, communication modules", approxUsd: 550 as number | null, plus: false },
    { label: "Practice infrastructure", detail: "A competition field and tiles to test safely", approxUsd: 650 as number | null, plus: true },
    { label: "Robot components", detail: "Precision motors, sensors, metal chassis parts", approxUsd: null as number | null, plus: false },
    { label: "Competition fees", detail: "Regional registration and the starter kit of parts", approxUsd: null as number | null, plus: false },
  ],
};

export interface Sponsor {
  name: string;
  tier: TierId;
  /** Local file in /public/sponsors/ — only with the sponsor's permission. */
  logo?: string;
  url?: string;
  /** What their support enabled, e.g. "funded the turret's 5:1 drive". */
  enabled?: string;
  since?: number;
}

/** Empty until the first partner signs. Tiers render as OPEN slots meanwhile. */
export const sponsors: Sponsor[] = [];
