// Discipline strip — one member's row of the role matrix: LEAD · CAD · CODE · BUILD · SOCIALS,
// assigned cells filled (they fill left → right on arrival, team.css). Server-safe.

import type { CSSProperties } from "react";
import { DISCIPLINES, type TeamMember } from "@/content/team";
import { cn } from "@/lib/utils";
import "./team.css";

export function DisciplineStrip({ member, className }: { member: TeamMember; className?: string }) {
  const held = DISCIPLINES.filter((d) => member.disciplines.includes(d));
  return (
    <ul aria-label="Disciplines" className={cn("grid grid-cols-5 border-t border-l border-hairline", className)}>
      {DISCIPLINES.map((d) => {
        const on = member.disciplines.includes(d);
        const order = Math.max(0, held.indexOf(d));
        return (
          <li
            key={d}
            className="relative flex h-12 items-end overflow-hidden border-r border-b border-hairline px-2 pb-2 sm:h-14 sm:px-3"
          >
            {on ? (
              <span
                aria-hidden="true"
                className="team-strip-fill absolute inset-0 bg-fg"
                style={{ "--i": order } as CSSProperties}
              />
            ) : (
              <span aria-hidden="true" className="hatch absolute inset-0 text-hairline-strong opacity-50" />
            )}
            <span className={cn("type-label relative leading-none", on ? "text-bg" : "text-fg-muted")}>
              {d}
              <span className="sr-only">{on ? ": yes" : ": no"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
