// BigFigure — one headline number: mono figure (clamp 40–72px, wght 300, tabular) + unit +
// label + optional source (DESIGN_SPEC §1 "data").
//   <BigFigure value="±170" unit="°" label="Turret travel" source="RobotConstants.java · Turret" />
//   <BigFigure {...keyFigures[0]} size="md" />
//   <BigFigure value="—" label="People reached" note="Logged after our first season report" />
// Server-safe.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BigFigureProps {
  value: ReactNode;
  unit?: string;
  label: ReactNode;
  source?: ReactNode;
  /** Extra line under the label (e.g. why a value is pending). */
  note?: ReactNode;
  /** "lg" = spec size (default), "md" smaller for dense grids. */
  size?: "md" | "lg";
  /** Highlight the figure in pollen (max one per screen). */
  accent?: boolean;
  className?: string;
}

export function BigFigure({ value, unit, label, source, note, size = "lg", accent, className }: BigFigureProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "type-figure whitespace-nowrap",
          size === "md" && "text-[clamp(32px,3.6vw,48px)]",
          accent ? "text-pollen-text" : "text-fg",
        )}
      >
        {value}
        {unit && (
          <span className={cn("align-baseline text-[0.42em] tracking-normal text-fg-muted", unit === "°" ? "ml-0.5" : "ml-1")}>
            {unit}
          </span>
        )}
      </p>
      <p className="type-label mt-3 text-fg-muted">{label}</p>
      {note && <p className="mt-1 text-[13px] leading-5 text-fg-muted">{note}</p>}
      {source && <p className="mt-1.5 font-mono text-[10px] leading-4 [overflow-wrap:anywhere] text-fg-muted/75">{source}</p>}
    </div>
  );
}
