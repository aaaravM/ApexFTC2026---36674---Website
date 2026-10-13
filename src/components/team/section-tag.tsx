"use client";

// SectionTag — the system's SectionLabel ("[ 02 / ROLE MATRIX ]" + hairline to the right), with
// the motion kit's telemetry treatment: the mono label decodes left → right (and again on hover)
// while the rule draws across — as it scrolls in, or on first paint with `immediate` (page
// headers). The final state is server-rendered; static under reduced motion. Same metrics as
// site/section-label.tsx.

import { LineDraw, Scramble } from "@/components/motion";
import { bracketLabel } from "@/components/site/section-label";
import { cn } from "@/lib/utils";

export interface SectionTagProps {
  code?: string;
  label: string;
  as?: "p" | "h2" | "h3" | "div" | "span";
  /** id for the label element (e.g. aria-labelledby targets). */
  id?: string;
  immediate?: boolean;
  className?: string;
}

export function SectionTag({ code, label, as: Tag = "p", id, immediate, className }: SectionTagProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Tag id={id} className="type-label shrink-0 text-fg-muted">
        <Scramble text={bracketLabel(code, label)} hover immediate={immediate} />
      </Tag>
      <LineDraw className="min-w-0 flex-1 text-hairline" immediate={immediate} delay={immediate ? 0.15 : 0.1} />
    </div>
  );
}
