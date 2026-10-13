// TEAM — /team (DESIGN_SPEC §5 TEAM).
// [ 01 / TEAM ] header with live roster counts + the 12-frame contact sheet → sticky discipline
// filter + cutout-card roster (engraved prints, x-ray lens, PHOTO / BIO PENDING states, portrait
// morph into /team/[slug]) → role matrix → where the work shows up.
// Every number on the page is computed from src/content/team.ts.

import type { Metadata } from "next";
import { ScrollProgress } from "@/components/motion";
import { PageTransition } from "@/components/site/page-transition";
import { teamLede } from "@/components/team/data";
import { SettleOnHide } from "@/components/team/settle-on-hide";
import { TeamHeader } from "@/components/team/team-header";
import { TeamRoster } from "@/components/team/team-roster";
import { WorkIndex } from "@/components/team/work-index";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Meet the Team",
  description: `${teamLede()} ${site.name} is FIRST Tech Challenge team ${site.teamNumber} from ${site.location}.`,
};

export default function TeamPage() {
  return (
    <>
      {/* fixed reading-progress hairline under the header (outside the sliding page) */}
      <ScrollProgress />
      <PageTransition>
        <SettleOnHide>
          <TeamHeader />
          <TeamRoster />
          <WorkIndex />
        </SettleOnHide>
      </PageTransition>
    </>
  );
}
