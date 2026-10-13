// MEET THE ROBOT (DESIGN_SPEC §5 ROBOT · USER-REQUIREMENTS #1–3, #6).
//
//   00  page header ─┐
//   01–08 subsystems ├─ sticky 3D stage beside the text (on phones: pinned above it). Scrolling
//   09  AIM          ┘  spins the chassis while the turret holds its lock on the HIVE; the active
//                       subsystem slides out and the camera frames it (src/components/robot-page)
//   10  data sheet  ·  11  photos (designed empty state until the first build photos exist)
//
// Every number comes from the team's code (RobotConstants.java …) or the manual, with a source
// ref. The ⌘K palette links to `/robot#robot-<subsystemId>` — those anchors live in experience.tsx.
// The real CAD swap (public/models/apex-r1.glb) is handled by the robot engine + content/robot.ts.

import type { Metadata } from "next";
import { ScrollProgress } from "@/components/motion";
import { PageTransition } from "@/components/site/page-transition";
import ScrollIsland from "@/components/watermelon/scroll-island";
import { ISLAND_TOPICS } from "@/components/robot-page/data";
import { DataSheet } from "@/components/robot-page/datasheet";
import { RobotExperience } from "@/components/robot-page/experience";
import { RobotHero } from "@/components/robot-page/hero";
import { SubsystemPanel } from "@/components/robot-page/panel";
import { RobotPhotos } from "@/components/robot-page/photos";
import { Settle } from "@/components/robot-page/settle";
import { robot, subsystems } from "@/content/robot";

export const metadata: Metadata = {
  title: "Meet the Robot",
  description: robot.oneLiner,
};

export default function RobotPage() {
  return (
    <PageTransition>
      <Settle>
        <ScrollProgress />
        <RobotExperience hero={<RobotHero />} panels={subsystems.map((s) => ({ id: s.id, content: <SubsystemPanel s={s} /> }))} />
        <DataSheet />
        <RobotPhotos />
        {/* section navigator: under the header over the text column on desktop (the stage keeps
            its own corners), floating at the bottom on phones (the stage is pinned on top) */}
        <ScrollIsland
          topics={ISLAND_TOPICS}
          label="Robot"
          showAfter={480}
          className="max-lg:top-auto max-lg:bottom-4 lg:justify-start lg:pl-[max(var(--page-margin),calc((100vw-var(--content-max))/2))]"
        />
      </Settle>
    </PageTransition>
  );
}
