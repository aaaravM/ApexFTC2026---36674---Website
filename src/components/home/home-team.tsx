// HomeTeam — "then the team" (USER-REQUIREMENTS #4e, DESIGN_SPEC §5.4): the robot has left the
// stage; the people behind it arrive. Watermelon UI team-5 strip adapted to 12 (two rows of six on
// wide screens, a swipe row with names on phones), engraved duotone portraits, PHOTO PENDING plates
// for members without a published photo. Counts are computed from the roster, never typed in.
// Motion (its own, USER-REQUIREMENTS #7c): the label decodes and its rule draws; the heading and
// lede pull into focus word by word like a lens; the roster is a headcount — one tick per student
// lands while each figure counts along; the portraits flip down into place like a split-flap
// board (a diagonal wave across the two rows); the link rolls and leans; the photo note decodes.

import { Magnetic, RollText, Scramble } from "@/components/motion";
import { ButtonLink } from "@/components/site/button";
import Team5, { toTeam5Member } from "@/components/ui/team-5";
import { site } from "@/content/site";
import { DISCIPLINES, hasPublicPhoto, rosterCounts, team } from "@/content/team";
import { MotionLabel } from "./motion-label";
import { Arm, FocusText, Tally } from "./section-motion";

const cell = "flex flex-col-reverse border-hairline py-3 pr-3";
const figure = "text-[20px] leading-6 font-light text-fg tabular-nums";

export function HomeTeam() {
  const counts = rosterCounts();
  const photos = team.filter(hasPublicPhoto).length;
  return (
    <section id="home-team" className="container-page pt-[clamp(72px,10vw,140px)] pb-[var(--section-pad)]" aria-labelledby="home-team-title">
      <MotionLabel code="T" label="THE TEAM" />
      <div className="home-parallax mt-[clamp(28px,4vw,48px)] grid gap-x-[var(--gutter)] gap-y-6 lg:grid-cols-12 lg:items-end">
        <FocusText as="h2" id="home-team-title" text="The people behind APEX-R1." className="type-h2 text-fg lg:col-span-7" />
        <FocusText
          as="p"
          delay={0.3}
          stagger={0.028}
          text={`Twelve students across CAD, code, build and outreach — founded by ${site.founder} in ${site.rookieYear}.`}
          className="type-lede lg:col-span-5 lg:justify-self-end"
        />
      </div>

      {/* roster title block: real counts from src/content/team.ts, one tick per student */}
      <dl className="mt-[clamp(24px,3vw,36px)] grid grid-cols-3 border-y border-hairline font-mono sm:grid-cols-6">
        <div className={`${cell} sm:border-r`}>
          <dt className="type-label mt-1 text-fg-muted">Students</dt>
          <dd className={figure}>
            <Tally value={team.length} />
          </dd>
        </div>
        {DISCIPLINES.map((d, k) => (
          <div key={d} className={`${cell} pl-0 sm:border-r sm:pl-4 sm:last:border-r-0`}>
            <dt className="type-label mt-1 text-fg-muted">{d}</dt>
            <dd className={figure}>
              <Tally value={counts[d]} delay={0.12 + k * 0.08} />
            </dd>
          </div>
        ))}
      </dl>

      {/* the strip flips down tile by tile (home.css .home-flip) */}
      <Arm className="home-flip home-team-strip mt-[clamp(24px,3vw,40px)]" inset={0.04}>
        <Team5 members={team.map(toTeam5Member)} />
      </Arm>

      <div className="mt-[clamp(24px,3vw,40px)] flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <Magnetic>
          <ButtonLink href="/team" variant="secondary">
            <RollText>Meet the team</RollText>
          </ButtonLink>
        </Magnetic>
        <Scramble
          as="p"
          text={`${photos} of ${team.length} portraits published · ${team.length - photos} pending`}
          className="font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase"
        />
      </div>
    </section>
  );
}
