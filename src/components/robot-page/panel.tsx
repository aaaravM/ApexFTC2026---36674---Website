// One subsystem stop of the /robot walkthrough (01 DRIVE … 08 ELECTRONICS): label, name, what it
// does, the spec sheet with source refs (RobotConstants.java / the manual / the rewire notes) and
// one "only-Apex" detail (./figures). Motion, in reading order: the label decodes and its rule
// draws, the name rises letter by letter, the summary rises, the spec rows print (rule draws,
// value slides in) and the detail plays its own subsystem-specific move. Server component.

import { TextReveal } from "@/components/motion";
import { MarkText } from "@/components/brand/mark";
import type { Subsystem } from "@/content/robot";
import { SubsystemDetail } from "./figures";
import { Rise } from "./rise";
import { SpecRows } from "./spec-rows";
import { RobotTag } from "./tag";

export function SubsystemPanel({ s }: { s: Subsystem }) {
  return (
    <div className="max-w-[600px]">
      <RobotTag code={s.index} label={s.code} />
      <TextReveal as="h2" id={`robot-${s.id}-title`} text={s.name} className="type-h2 mt-6" />
      <Rise className="mt-5" delay={0.15}>
        <p className="type-body text-fg-muted">
          <MarkText>{s.summary}</MarkText>
        </p>
      </Rise>
      <SpecRows rows={s.specs} dense className="mt-8" />
      <SubsystemDetail id={s.id} className="mt-10" />
    </div>
  );
}
