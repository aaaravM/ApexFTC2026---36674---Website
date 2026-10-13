// SpecTable — engineering spec rows (DESIGN_SPEC §3): mono label left (muted), value right
// (text, tabular), hairline row rules, optional source ref in tiny muted mono.
//   <SpecTable rows={subsystem.specs} />
//   <SpecTable rows={rows} caption="Shooter" dense />
// Rows are { label, value, source? } (SpecRow from src/content/robot.ts). Server-safe.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SpecTableRow {
  label: ReactNode;
  value: ReactNode;
  source?: ReactNode;
}

export interface SpecTableProps {
  rows: SpecTableRow[];
  /** Visible caption above the table (mono label). */
  caption?: string;
  /** Tighter rows. */
  dense?: boolean;
  /** Hide the source refs (keeps them in the data). */
  hideSources?: boolean;
  className?: string;
}

export function SpecTable({ rows, caption, dense, hideSources, className }: SpecTableProps) {
  return (
    <div className={className}>
      {caption && <p className="type-label mb-3 text-fg-muted">{caption}</p>}
      <dl className="border-y border-hairline">
        {rows.map((r, i) => (
          <div
            key={i}
            className={cn(
              "grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] items-baseline gap-x-4 border-hairline",
              i > 0 && "border-t",
              dense ? "py-2" : "py-3",
            )}
          >
            <dt className="type-label min-w-0 [overflow-wrap:anywhere] text-fg-muted">{r.label}</dt>
            <dd className="min-w-0 text-right">
              <span className="font-mono text-[13px] leading-5 [overflow-wrap:anywhere] text-fg tabular-nums">{r.value}</span>
              {r.source && !hideSources && (
                <span className="mt-1 block font-mono text-[10px] leading-4 tracking-[0.02em] [overflow-wrap:anywhere] text-fg-muted/80">
                  {r.source}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
