// ─────────────────────────────────────────────────────────────────────────────
// LINKS — the 20 resources on the Links page. Every URL was checked (status + page title) on
// 2026-10-12. Re-check them once a season. "official" = run by FIRST.
// Write FIRST in plain text here; the page renders it italic automatically.
// ─────────────────────────────────────────────────────────────────────────────

export type LinkGroup = "Season" | "Our team" | "Build" | "Learn";

export const LINK_GROUPS: LinkGroup[] = ["Season", "Our team", "Build", "Learn"];

export interface ResourceLink {
  group: LinkGroup;
  title: string;
  url: string;
  description: string;
  official?: boolean;
}

export const links: ResourceLink[] = [
  // Season
  { group: "Season", title: "BIOBUZZ™ Game & Season hub", url: "https://www.firstinspires.org/programs/ftc/game-and-season", description: "FIRST's home for this season: game, field and team resources.", official: true },
  { group: "Season", title: "Competition Manual (latest)", url: "https://ftc.game/manual", description: "The rules. Always the newest Team Update — link it, never re-host it.", official: true },
  { group: "Season", title: "Team Updates (combined)", url: "https://ftc.game/tu-combined", description: "Every rule change since kickoff in one PDF. New ones post on Thursdays.", official: true },
  { group: "Season", title: "Official Game Q&A", url: "https://ftc.game/qa", description: "Rule questions answered by the game design committee.", official: true },
  { group: "Season", title: "Score Calculator", url: "https://ftc.game/calculator", description: "Check a match score the way the referees count it.", official: true },
  { group: "Season", title: "Game Animation (video)", url: "https://youtu.be/sUH3z5a5S9I", description: "BIOBUZZ™ presented by RTX, explained in three minutes.", official: true },
  { group: "Season", title: "Field Walkthrough (video)", url: "https://www.youtube.com/watch?v=47X9sYnPijw", description: "The HIVE, CELLS, FLOWERS and GARDENS up close.", official: true },
  // Our team
  { group: "Our team", title: "Team 36674 on FTC Events", url: "https://ftc-events.firstinspires.org/2026/team/36674", description: "Our official team record: events, matches and awards.", official: true },
  { group: "Our team", title: "Team 36674 on FTCScout", url: "https://ftcscout.org/teams/36674", description: "Community stats: OPR, match history and rankings." },
  { group: "Our team", title: "Robot code on GitHub", url: "https://github.com/aaaravM/ApexFTC2026---36674", description: "APEX-R1's Java code: subsystems, solver, tuning OpModes and docs." },
  // Build
  { group: "Build", title: "FIRST Tech Challenge Docs", url: "https://ftc-docs.firstinspires.org/en/latest/", description: "Official programming, hardware and control-system documentation.", official: true },
  { group: "Build", title: "FTC SDK (FtcRobotController)", url: "https://github.com/FIRST-Tech-Challenge/FtcRobotController", description: "The SDK our TeamCode builds on — v12.0 this season.", official: true },
  { group: "Build", title: "AprilTag introduction", url: "https://ftc-docs.firstinspires.org/en/latest/apriltag/vision_portal/apriltag_intro/apriltag-intro.html", description: "How the SDK finds tags — the basis of our HIVE tracker.", official: true },
  { group: "Build", title: "Pedro Pathing docs", url: "https://pedropathing.com/docs", description: "The path follower our autonomous routines use." },
  { group: "Build", title: "goBILDA Pinpoint Odometry Computer", url: "https://www.gobilda.com/pinpoint-odometry-computer-imu-sensor-fusion-for-2-wheel-odometry/", description: "The odometry computer that localises APEX-R1." },
  { group: "Build", title: "FTC Dashboard", url: "https://acmerobotics.github.io/ftc-dashboard/", description: "Live telemetry and graphs while tuning." },
  { group: "Build", title: "Panels", url: "https://panels.bylazar.com/", description: "A telemetry dashboard for tuning on the field." },
  { group: "Build", title: "Limelight 3A — FTC programming guide", url: "https://docs.limelightvision.io/docs/docs-limelight/apis/ftc-programming", description: "Java setup for the optional Limelight on our turret." },
  // Learn
  { group: "Learn", title: "Game Manual 0", url: "https://gm0.org/en/latest/", description: "The community's guide to building and programming FTC robots." },
  { group: "Learn", title: "Onshape Learning Center", url: "https://learn.onshape.com/", description: "Free CAD courses — where our CAD team started." },
];

/** "ftc.game" from a URL, for the domain column. */
export const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
