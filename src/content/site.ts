// ─────────────────────────────────────────────────────────────────────────────
// SITE-WIDE SETTINGS — team identity, season, navigation and contact links.
// Anything left `undefined` is simply hidden on the site until you fill it in.
//
// Students: this is the safest file to edit. Change a value, save, and the whole site updates.
// ─────────────────────────────────────────────────────────────────────────────

export const site = {
  name: "Apex Robotics",
  shortName: "Apex",
  teamNumber: "36674",
  program: "FIRST Tech Challenge",
  programShort: "FTC",
  // From FTC Scout's team record (api.ftcscout.org/rest/v1/teams/36674).
  location: "Tracy, California",
  locationShort: "Tracy, CA",
  teamType: "Community team",
  rookieYear: 2026,
  founder: "Anish Pattanaik",
  description:
    "Apex Robotics is FIRST Tech Challenge team 36674 from Tracy, California. We design, machine, wire and code competitive robots — this season, a shoot-on-the-move turret robot for BIOBUZZ.",
  /**
   * Public URL once deployed — set NEXT_PUBLIC_SITE_URL in the hosting dashboard. On Vercel the
   * production domain is picked up automatically; localhost is only the last resort for local dev.
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
    "http://localhost:3000",

  season: {
    game: "BIOBUZZ",
    presentedBy: "RTX",
    years: "2026–27",
    firstSeason: "FIRST CANOPY",
    kickoff: "2026-09-12",
    /** Competition Manual revision our game facts were checked against (see src/content/season.ts). */
    manualRevision: "TU04",
  },

  /**
   * Privacy (FIRST Youth Protection Program guidance).
   * - "full":    "Anish Pattanaik"  (what the team already publishes)
   * - "initial": "Anish P."         (first name + last initial — switch to this if your coach asks)
   * Changing this one value updates every page, the command palette and the team URLs stay the same.
   */
  privacy: {
    nameFormat: "full" as "full" | "initial",
  },

  links: {
    github: "https://github.com/aaaravM/ApexFTC2026---36674",
    sponsorPacket:
      "https://docs.google.com/document/d/1jj-1hr3UHEM-SAWn8pWvIfB_vMM7-S2Sx46m2Z2a7eg/edit?usp=sharing",
    ftcScout: "https://ftcscout.org/teams/36674",
    ftcEvents: "https://ftc-events.firstinspires.org/2026/team/36674",
    manual: "https://ftc.game/manual",
    firstInspires: "https://www.firstinspires.org/",
    /** A shared TEAM inbox only — never a student's personal address (FIRST YPP). */
    email: undefined as string | undefined,
    instagram: undefined as string | undefined,
    youtube: undefined as string | undefined,
  },

  nav: [
    { href: "/team", label: "Meet the Team", short: "Team", index: "01" },
    { href: "/outreach", label: "Outreach", short: "Outreach", index: "02" },
    { href: "/robot", label: "Meet the Robot", short: "Robot", index: "03" },
    { href: "/cad", label: "CAD", short: "CAD", index: "04" },
    { href: "/code", label: "Code", short: "Code", index: "05" },
    { href: "/sponsors", label: "Sponsors", short: "Sponsors", index: "06" },
    { href: "/links", label: "Links", short: "Links", index: "07" },
  ],
} as const;

export type NavItem = (typeof site.nav)[number];

/**
 * One-line descriptions of each page, used by the home "Explore" index, the command palette and
 * the mobile menu. Keep them short and specific.
 */
export const pageBlurbs: Record<NavItem["href"], string> = {
  "/team": "Twelve students across CAD, code, build and outreach.",
  "/outreach": "Workshops, demos and mentorship — the log of where we've been.",
  "/robot": "APEX-R1, a turret shooter that aims while it drives.",
  "/cad": "The drawing set: assemblies, design decisions and the maths behind them.",
  "/code": "Java on the FTC SDK. One loop, six steps, four gates.",
  "/sponsors": "Become a Founding Partner of a rookie team.",
  "/links": "The manuals, docs and tools we actually use.",
};

/** ISO date the content was last reviewed — shown in page title blocks ("UPDATED 2026-10-12"). */
export const CONTENT_UPDATED = "2026-10-12";
