// BudgetKey — the legend for the budget instrument's marks (drawing-sheet "KEY"), so nobody has to
// guess what a hatch or a dashed line means. Glyphs are drawn with the same classes as the
// instrument (budget-instrument.tsx). Server-safe.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ROWS: { glyph: ReactNode; label: string }[] = [
  {
    glyph: <span className="absolute top-1/2 left-0 h-[6px] w-full -translate-y-1/2 bg-fg" />,
    label: "≈ amount, from the packet",
  },
  {
    glyph: (
      <>
        <span className="absolute top-1/2 left-0 h-[6px] w-3/5 -translate-y-1/2 bg-fg" />
        <span className="hatch absolute top-1/2 right-0 h-[6px] w-2/5 -translate-y-1/2 text-fg-muted" />
      </>
    ),
    label: "“+” — or more",
  },
  {
    glyph: <span className="absolute top-1/2 left-0 h-0 w-full -translate-y-1/2 border-t border-dashed border-hairline-strong" />,
    label: "Varies — not sized",
  },
  {
    glyph: (
      <>
        <span className="absolute top-1/2 left-0 h-[6px] w-1/2 -translate-y-1/2 bg-border-ui" />
        <span className="hatch absolute top-1/2 right-0 h-[6px] w-1/2 -translate-y-1/2 text-fg-muted" />
      </>
    ),
    label: "Typical total, and its range",
  },
  {
    glyph: <span className="absolute -top-0.5 -bottom-0.5 left-1/2 w-px bg-pollen-line" />,
    label: "Your contribution",
  },
];

export function BudgetKey({ className }: { className?: string }) {
  return (
    <div className={cn("border-t border-hairline pt-5", className)}>
      <p className="type-label text-fg-muted">Key</p>
      <ul className="mt-3 space-y-2.5">
        {ROWS.map((r) => (
          <li key={r.label} className="flex items-center gap-3 font-mono text-[11px] leading-4 tracking-[0.04em] text-fg-muted">
            <span aria-hidden="true" className="relative h-3 w-8 shrink-0">
              {r.glyph}
            </span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
