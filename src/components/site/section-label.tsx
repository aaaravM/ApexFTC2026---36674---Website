// SectionLabel — mono "[ SUB-04 / TURRET ]" with a hairline rule extending right (DESIGN_SPEC §3).
//   <SectionLabel code="SUB-04" label="TURRET" />
//   <SectionLabel label="THE TEAM" />                 → [ THE TEAM ]
//   <SectionLabel code="03" label="ROBOT" rule={false} />
//   <SectionLabel … as="h2" />   when the label is the section's only heading
// Server-safe.

import { cn } from "@/lib/utils";

export interface SectionLabelProps {
  code?: string;
  label: string;
  /** Hairline rule extending to the right (default true). */
  rule?: boolean;
  as?: "p" | "h2" | "h3" | "div" | "span";
  className?: string;
  id?: string;
}

export function bracketLabel(code: string | undefined, label: string) {
  return code ? `[ ${code} / ${label} ]` : `[ ${label} ]`;
}

export function SectionLabel({ code, label, rule = true, as: Tag = "p", className, id }: SectionLabelProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Tag id={id} className="type-label shrink-0 text-fg-muted">
        {bracketLabel(code, label)}
      </Tag>
      {rule && <span aria-hidden="true" className="h-px flex-1 bg-hairline" />}
    </div>
  );
}
