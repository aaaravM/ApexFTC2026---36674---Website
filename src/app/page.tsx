// HOME — the user's choreography (USER-REQUIREMENTS #4, DESIGN_SPEC §5 HOME):
//   the name → the name disappears into the robot → the robot spins with scroll and glides to
//   alternating sides for six chapters (C5 aims and fires) → the team → the index → the sponsor band.
// All copy is server-rendered from src/content; src/components/home/home-story.tsx animates it.
// Motion layer (USER-REQUIREMENTS #6): the name rises letter by letter on load, every chapter's
// label decodes / heading rises / figures count up as it arrives, and a pollen hairline under the
// header fills with the scroll animation, then stays full for the rest of the page. After the
// story, the team, the drawing-set index and the sponsor band each have their own motion
// (src/components/home/section-motion.tsx) instead of one shared line swipe.

import { ChapterContent } from "@/components/home/chapter-content";
import { HomeExplore } from "@/components/home/home-explore";
import { HomeIntro } from "@/components/home/home-intro";
import { HomeSponsor } from "@/components/home/home-sponsor";
import { HomeStory, type HomeChapterInput } from "@/components/home/home-story";
import { HomeTeam } from "@/components/home/home-team";
import { RollText, ScrollProgress } from "@/components/motion";
import { ButtonLink } from "@/components/site/button";
import { PageTransition } from "@/components/site/page-transition";
import { homeChapters } from "@/content/robot";

/** The interactive chapter keeps its link next to the fire control instead of under the text. */
const AIM_ID = "solver";

export default function HomePage() {
  const chapters: HomeChapterInput[] = homeChapters.map((c, i) => ({
    spec: { id: c.id, code: c.code, side: c.robotSide === "right" ? 1 : -1, focus: [...c.focus] },
    content: <ChapterContent chapter={c.id === AIM_ID ? { ...c, link: undefined } : c} index={i} total={homeChapters.length} />,
  }));
  const aim = homeChapters.find((c) => c.id === AIM_ID);

  return (
    <PageTransition>
      {/* The line fills with the scroll animation and stays full after it (team request). */}
      <ScrollProgress target="#home-story" />
      <HomeStory
        intro={<HomeIntro />}
        chapters={chapters}
        aimLink={
          aim?.link && (
            <ButtonLink href={aim.link.href} variant="secondary">
              <RollText>{aim.link.label}</RollText>
            </ButtonLink>
          )
        }
      />
      <HomeTeam />
      <HomeExplore />
      <HomeSponsor />
    </PageTransition>
  );
}
