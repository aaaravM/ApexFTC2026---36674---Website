// RobotTag — the system SectionLabel ("[ 05 / TURRET ]" + hairline to the right) with the motion
// kit's telemetry treatment: the mono label decodes left → right (again on hover) and the rule
// draws across when it scrolls in (`immediate` for the page header). Final state is server-
// rendered; static under reduced motion. Same metrics as site/section-label.tsx. Server component.

import { LineDraw, Scramble } from "@/components/motion";
import { bracketLabel } from "@/components/site/section-label";
import { cn } from "@/lib/utils";

export interface RobotTagProps {
  code?: string;
  label: string;
  immediate?: boolean;
  as?: "p" | "h2" | "h3" | "div" | "span";
  className?: string;
}

export function RobotTag({ code, label, immediate, as = "p", className }: RobotTagProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Scramble as={as} text={bracketLabel(code, label)} immediate={immediate} hover className="type-label shrink-0 text-fg-muted" />
      <LineDraw immediate={immediate} delay={immediate ? 0.15 : 0.1} className="min-w-0 flex-1 text-hairline" />
    </div>
  );
}
