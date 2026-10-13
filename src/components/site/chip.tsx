// Chip — mono 11px uppercase tag, 1px hairline, 2px radius, 4px 8px (DESIGN_SPEC §3).
//   <Chip>CAD</Chip>
//   <Chip tone="pollen">FOUNDER</Chip>        pollen fill + ink text (counts against the yellow budget)
//   <Chip tone="strong">LIVE</Chip>           border-ui outline, full-strength text
//   <Chip tone="pending">PENDING</Chip>       hatched, muted
//   <Chip dot="pollen">READY</Chip>           leading status LED (pollen | red | blue | muted | on)
// Server-safe.

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ChipTone = "default" | "strong" | "pollen" | "pending" | "red" | "blue";
export type DotTone = "pollen" | "red" | "blue" | "muted" | "on";

const tones: Record<ChipTone, string> = {
  default: "border-hairline text-fg-muted",
  strong: "border-border-ui text-fg",
  pollen: "border-pollen-edge bg-pollen text-pollen-ink",
  pending: "border-hairline text-fg-muted hatch",
  red: "border-data-red text-data-red",
  blue: "border-data-blue text-data-blue",
};

const dots: Record<DotTone, string> = {
  pollen: "bg-pollen-line",
  red: "bg-data-red",
  blue: "bg-data-blue",
  muted: "bg-border-ui",
  on: "bg-fg",
};

export type ChipProps = ComponentProps<"span"> & { tone?: ChipTone; dot?: DotTone };

export function Chip({ tone = "default", dot, className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 font-mono text-[11px] leading-none uppercase tracking-[0.08em] whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", dots[dot])} />}
      {children}
    </span>
  );
}
