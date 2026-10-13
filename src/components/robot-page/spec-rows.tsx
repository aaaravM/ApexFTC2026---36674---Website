// SpecRows — the system spec table (site/spec-table.tsx metrics: mono label left, value right,
// tabular, hairline rules, tiny source refs). When it scrolls in, the rows PRINT like a data sheet:
// each row's rule draws left → right, the label appears, the value slides in from the right
// (./armed + .rp-spec in ./robot-page.css — hydration- and reduced-motion-safe). Values go
// through MarkText (BIOBUZZ™) and "PENDING …" values render as the designed pending chip, never
// as an invented number. Server component.

import { MarkText } from "@/components/brand/mark";
import { Pending } from "@/components/site/pending";
import type { SpecRow } from "@/content/robot";
import { cn } from "@/lib/utils";
import { Armed } from "./armed";
import { idx } from "./fx";

export function SpecRows({ rows, dense, className }: { rows: SpecRow[]; dense?: boolean; className?: string }) {
  return (
    <Armed as="dl" inset={0.08} className={cn("rp-spec border-y border-hairline", className)}>
      {rows.map((r, i) => (
        <div
          key={r.label}
          className={cn("grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] items-baseline gap-x-4", dense ? "py-2.5" : "py-3")}
          style={idx(i)}
        >
          <dt className="type-label min-w-0 [overflow-wrap:anywhere] text-fg-muted">{r.label}</dt>
          <dd className="min-w-0 text-right">
            {r.value.startsWith("PENDING") ? (
              <Pending inline label={r.value} className="whitespace-normal text-left" />
            ) : (
              <span className="font-mono text-[13px] leading-5 [overflow-wrap:anywhere] text-fg tabular-nums">
                <MarkText>{r.value}</MarkText>
              </span>
            )}
            {r.source && (
              <span className="mt-1 block font-mono text-[10px] leading-4 tracking-[0.02em] [overflow-wrap:anywhere] text-fg-muted/80">
                {r.source}
              </span>
            )}
          </dd>
        </div>
      ))}
    </Armed>
  );
}
