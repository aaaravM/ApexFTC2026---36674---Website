// MotionLabel — the site's section label ("[ T / THE TEAM ]" + hairline rule, DESIGN_SPEC §3) with
// the motion kit applied: the mono label decodes and the rule draws when scrolled to (from the left
// by default, or opening from the centre). An optional mono `meta` sits at the far end and decodes
// too. Same output as <SectionLabel> once played (and on the server / under reduced motion).

import { LineDraw, Scramble } from "@/components/motion";
import { bracketLabel } from "@/components/site/section-label";
import { cn } from "@/lib/utils";

export function MotionLabel({
  code,
  label,
  className,
  origin = "left",
  meta,
}: {
  code?: string;
  label: string;
  className?: string;
  origin?: "left" | "right" | "center";
  meta?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Scramble as="p" text={bracketLabel(code, label)} className="type-label shrink-0 text-fg-muted" />
      <LineDraw className="min-w-0 flex-1 text-hairline" delay={0.12} origin={origin} />
      {meta && <Scramble as="p" text={meta} duration={0.8} className="type-label shrink-0 text-fg-muted tabular-nums" />}
    </div>
  );
}
