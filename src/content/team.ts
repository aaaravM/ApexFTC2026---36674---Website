// ─────────────────────────────────────────────────────────────────────────────
// TEAM ROSTER — edit this file to update the Meet the Team page.
//
// Adding a photo:
//   1. Put a portrait photo in /public/team/<slug>-full.jpg (the original) and a 4:5 face-centred
//      crop in /public/team/<slug>.jpg.
//   2. Add `photo: { src: "/team/<slug>.jpg", full: "/team/<slug>-full.jpg", focal: [50, 42] }`.
//      `focal` is where the face is, in % from the left and from the top of the image.
//   3. Run `npm run portraits` — it makes the engraved duotone version in /public/team/engraved/.
//   4. Set `consent: true` ONLY after the coach confirms a signed FIRST Consent & Release form
//      for this season. Without it the site shows the "PHOTO PENDING" plate instead of the photo.
//
// Writing a bio: replace the `bio` text and delete `bioPending: true`.
// Names: the site can show "First Last" or "First L." — see `privacy.nameFormat` in site.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { site } from "./site";

export type Discipline = "Lead" | "CAD" | "Code" | "Build" | "Socials";

/** Order used for filters, chips and counts. */
export const DISCIPLINES: Discipline[] = ["Lead", "CAD", "Code", "Build", "Socials"];

export interface TeamMember {
  /** URL-safe id, also used for the photo filename and the /team/<slug> page. */
  slug: string;
  name: string;
  /** The role line shown under the name. */
  role: string;
  disciplines: Discipline[];
  bio: string;
  /** True while the member still needs to write their own bio. */
  bioPending?: boolean;
  photo?: {
    /** Face-centred 4:5 portrait. */
    src: string;
    /** Uncropped original, for large views. */
    full?: string;
    /** Face position in % [x, y] inside `src`. */
    focal: [number, number];
  };
  /**
   * Photo consent (FIRST Youth Protection Program): the photo is only shown when this is `true`.
   * COACH: confirm a signed Consent & Release form exists for this season before setting it.
   * The five existing photos were already published on the team's previous site.
   */
  consent?: boolean;
  founder?: boolean;
}

export const team: TeamMember[] = [
  {
    slug: "anish-pattanaik",
    name: "Anish Pattanaik",
    role: "Founder & Build Lead",
    disciplines: ["Lead", "Build"],
    bio: "Founded Apex Robotics to bring competitive FTC engineering to the team. Leads strategy, design reviews, and keeps the build season on rails. Outside of FTC, he enjoys tennis, math competitions, and exploring new STEM challenges.",
    photo: { src: "/team/anish-pattanaik.jpg", full: "/team/anish-pattanaik-full.jpg", focal: [52, 40] },
    consent: true,
    founder: true,
  },
  {
    slug: "aarav-muttanapalli",
    name: "Aarav Muttanapalli",
    role: "Code Lead",
    disciplines: ["Lead", "Code", "Build"],
    bio: "Aarav leads programming for Apex Robotics, writing our robot's code in Java on the FTC SDK and helping newer members learn to write and debug their own. He also works on CAD and build, so he can follow a design from the screen all the way to the field. Aarav designed and built this website, including the interactive 3D robot model and the live aiming demo ported straight from our robot's code. Outside of FTC, he founded logrthm.ai, a small AI studio that builds apps for education and health, and his hackathon project MentoLab won 1st Place and Best AI at Sierra Hacks. He's also a TEDx speaker, has played piano for nine years, and hopes to one day build intelligent systems for space exploration.",
    // Photo provided by Aarav (2026-10-19). Source is only 240×320 — swap in a larger original when available.
    photo: { src: "/team/aarav-muttanapalli.jpg", full: "/team/aarav-muttanapalli-full.jpg", focal: [48, 42] },
    consent: true,
  },
  {
    slug: "abhinav-ayyau",
    name: "Abhinav Ayyau",
    role: "CAD · Build",
    disciplines: ["CAD", "Build"],
    bio: "A passionate CADer and coder who has taken past robotics courses and plans on achieving more in this field.",
    photo: { src: "/team/abhinav-ayyau.jpg", full: "/team/abhinav-ayyau-full.jpg", focal: [50, 46] },
    consent: true,
  },
  {
    slug: "shubham-priyadarshi",
    name: "Shubham Priyadarshi",
    role: "CAD · Code · Build · Socials",
    disciplines: ["CAD", "Code", "Build", "Socials"],
    bio: "A passionate coder who wants to dive into the vast world of robotics. Outside of FTC, Shubham likes to paint, play tennis, and spend time in nature.",
    photo: { src: "/team/shubham-priyadarshi.jpg", full: "/team/shubham-priyadarshi-full.jpg", focal: [50, 42] },
    consent: true,
  },
  {
    slug: "siddhant-venganti",
    name: "Siddhant Venganti",
    role: "CAD · Build",
    disciplines: ["CAD", "Build"],
    bio: "Responsible for the team's CAD models and mechanical assembly. Enjoys solving engineering challenges and collaborating with teammates to build a competitive robot. Outside of FTC, he plays club volleyball and freelances in Fusion 360.",
    photo: { src: "/team/siddhant-venganti.jpg", full: "/team/siddhant-venganti-full.jpg", focal: [50, 42] },
    consent: true,
  },
  {
    slug: "agamveer-singh",
    name: "Agamveer Singh",
    role: "Code",
    disciplines: ["Code"],
    bio: "Works on the autonomous and TeleOp codebase.",
    bioPending: true,
    photo: { src: "/team/agamveer-singh.jpg", full: "/team/agamveer-singh-full.jpg", focal: [50, 44] },
    consent: true,
  },
  {
    slug: "sehej-ahuja",
    name: "Sehej Ahuja",
    role: "Code · Build",
    disciplines: ["Code", "Build"],
    bio: "Splits time between the codebase and the build bench.",
    bioPending: true,
  },
  {
    slug: "sarvin-varshney",
    name: "Sarvin Varshney",
    role: "CAD · Build",
    disciplines: ["CAD", "Build"],
    bio: "Works on CAD models and the mechanical build.",
    bioPending: true,
  },
  {
    slug: "srihari-vishnu",
    name: "Srihari Vishnu",
    role: "CAD · Build",
    disciplines: ["CAD", "Build"],
    bio: "Works on CAD models and the mechanical build.",
    bioPending: true,
  },
  {
    slug: "akash-logesh",
    name: "Akash Logesh",
    role: "CAD · Build",
    disciplines: ["CAD", "Build"],
    bio: "Works on CAD models and the mechanical build.",
    bioPending: true,
  },
  {
    slug: "vedanth-venganti",
    name: "Vedanth Venganti",
    role: "Code",
    disciplines: ["Code"],
    bio: "Works on the autonomous and TeleOp codebase.",
    bioPending: true,
  },
  {
    slug: "abhinav-nirmal",
    name: "Abhinav Nirmal",
    role: "Code",
    disciplines: ["Code"],
    bio: "Abhinav is a passionate coder on the FTC team who enjoys programming and problem-solving. Outside of robotics, he likes playing video games, reading books, and swimming.",
    photo: { src: "/team/abhinav-nirmal.jpg", full: "/team/abhinav-nirmal-full.jpg", focal: [50, 42] },
    consent: true,
  },
];

// ─── Helpers (no need to edit below this line) ──────────────────────────────

export const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** The name to print anywhere on the site, honouring `site.privacy.nameFormat`. */
export function displayName(member: Pick<TeamMember, "name">): string {
  if (site.privacy.nameFormat === "full") return member.name;
  const parts = member.name.trim().split(/\s+/);
  if (parts.length < 2) return member.name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/** First name only (for compact labels). */
export const firstName = (member: Pick<TeamMember, "name">) => member.name.trim().split(/\s+/)[0];

export function getMember(slug: string): TeamMember | undefined {
  return team.find((m) => m.slug === slug);
}

/** 1-based position in the roster, e.g. "#01 / 12". */
export function memberIndexLabel(member: TeamMember): string {
  const i = team.indexOf(member) + 1;
  return `#${String(i).padStart(2, "0")} / ${String(team.length).padStart(2, "0")}`;
}

/** True when the member has a photo AND photo consent. Use this, never `member.photo` alone. */
export function hasPublicPhoto(member: TeamMember): member is TeamMember & { photo: NonNullable<TeamMember["photo"]> } {
  return Boolean(member.photo && member.consent);
}

/** Path of the build-time engraved duotone portrait (made by `npm run portraits`). */
export const engravedSrc = (member: TeamMember) => `/team/engraved/${member.slug}.webp`;

/** Live roster counts per discipline — computed, never hard-coded. e.g. { Lead: 1, CAD: 8, … } */
export function rosterCounts(members: TeamMember[] = team): Record<Discipline, number> {
  const counts = Object.fromEntries(DISCIPLINES.map((d) => [d, 0])) as Record<Discipline, number>;
  for (const m of members) for (const d of m.disciplines) counts[d] += 1;
  return counts;
}

/** Previous / next member for the detail page (wraps around). */
export function neighbours(slug: string): { prev: TeamMember; next: TeamMember } {
  const i = Math.max(0, team.findIndex((m) => m.slug === slug));
  return {
    prev: team[(i - 1 + team.length) % team.length],
    next: team[(i + 1) % team.length],
  };
}
