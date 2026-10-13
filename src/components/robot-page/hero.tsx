// Stop 00 of the /robot walkthrough: the page header (DESIGN_SPEC §5 ROBOT — [ 03 / ROBOT ] ·
// "APEX-R1." · lede · concept-model caption · title block), sized to the first screen on desktop so
// the 3D stage opens beside it. Same rhythm as site/page-header.tsx, plus the motion layer: the
// eyebrow decodes, the H1 rises letter by letter and the lede word by word on first paint.
// Server component.

import { TextReveal } from "@/components/motion";
import { ConceptModelCaption } from "@/components/site/concept-model-caption";
import { TitleBlock } from "@/components/site/page-header";
import { robot, subsystems } from "@/content/robot";
import { CONTENT_UPDATED } from "@/content/site";
import { RobotTag } from "./tag";
import "./robot-page.css";

export function RobotHero() {
  return (
    <header className="flex flex-col pt-[calc(var(--header-h)+clamp(48px,9vw,128px))] pb-14 lg:min-h-svh lg:pb-10">
      <RobotTag code="03" label="ROBOT" immediate />
      <h1 id="robot-title" className="rp-drift type-display mt-8 sm:mt-10">
        <TextReveal text={`${robot.codename}.`} immediate />
      </h1>
      <TextReveal as="p" mode="words" text={robot.oneLiner} immediate delay={0.32} stagger={0.045} className="type-lede mt-6 sm:mt-8" />
      <ConceptModelCaption className="mt-6" />
      <TitleBlock
        className="mt-10 sm:mt-12"
        items={[
          { label: "DWG", value: "DWG-003" },
          { label: "REV", value: "A" },
          { label: "UPDATED", value: CONTENT_UPDATED },
          { label: "STATUS", value: "IN DEVELOPMENT" },
        ]}
      />
      <div className="mt-auto flex items-center gap-4 pt-14">
        <span aria-hidden="true" className="rp-cue" />
        {/* desktop: the stage beside it already says what scrolling does to the robot */}
        <p className="font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
          <span className="lg:hidden">Scroll to spin the chassis — the turret holds its lock</span>
          <span className="max-lg:hidden">Scroll · {subsystems.length} subsystems, then aim it yourself</span>
        </p>
      </div>
    </header>
  );
}
