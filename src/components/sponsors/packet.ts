// Lines quoted from the team's real sponsorship packet ("TEAM 36674 ROOKIE ROBOTICS SPONSORSHIP
// PROPOSAL — Founding the Next Generation of STEM Innovators", the public Google Doc in
// site.links.sponsorPacket) that src/content/sponsors.ts doesn't carry yet. Verbatim apart from
// the en-dash spacing. Integration may move these into src/content/sponsors.ts.
//
// The packet's contact block names a student and a personal email address — deliberately NOT here
// (FIRST Youth Protection Program). The site points to the packet, or to a future team inbox
// (site.links.email).

export const packetCopy = {
  title: "Team 36674 Rookie Robotics Sponsorship Proposal",
  /** §3 intro. */
  tiersIntro:
    "We offer several levels of partnership to fit your organization's goals. Every donation, whether financial or in-kind (tools, materials, or mentorship), directly impacts our ability to compete.",
  /** §2 intro. */
  whyIntro: "Sponsoring a rookie team is a unique opportunity to be recognized as a Founding Partner.",
  /** §4 intro. */
  budgetIntro: "Starting a team from scratch requires a significant one-time investment in foundational equipment.",
  /** §5. */
  contact:
    "We would welcome the opportunity to demonstrate our robot or discuss how a partnership can meet your community engagement goals.",
} as const;

/**
 * What the packet's budget lines are on OUR robot — real parts from src/content/robot.ts
 * (RobotConstants.java / hub-backup docs), keyed by the budget item label in content/sponsors.ts.
 */
export const onApexR1: Record<string, { parts: string; href: string }> = {
  "Startup hardware": { parts: "REV Control Hub + Expansion Hub", href: "/robot#robot-electronics" },
  "Robot components": {
    parts: "goBILDA 5202 motors · 104 mm mecanum wheels · REV Color Sensor V3 · goBILDA Pinpoint",
    href: "/robot",
  },
};

/** Relative logo size per cash tier, from the packet's own words ("Large logo…", "Medium logo…", "Name or small logo…"). */
export const plateSize = { gold: "large", silver: "medium", bronze: "small" } as const;
