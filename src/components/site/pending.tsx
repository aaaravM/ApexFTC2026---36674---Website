// Pending — the designed "not yet" state. Never invent content; show this instead.
//   <Pending label="BIO PENDING" note="Written by the student, not by us." />
//   <Pending label="ROBOT PHOTOS PENDING — FIRST BUILD SEASON" size="lg" />
//   <Pending label="PUBLIC ONSHAPE LINK PENDING" inline />
// Hatched hairline plate with a mono label. Server-safe.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PendingProps {
  label: string;
  note?: ReactNode;
  /** Compact inline chip-like variant. */
  inline?: boolean;
  size?: "md" | "lg";
  className?: string;
  children?: ReactNode;
}

export function Pending({ label, note, inline, size = "md", className, children }: PendingProps) {
  if (inline) {
    return (
      <span
        className={cn(
          "hatch inline-flex items-center gap-2 rounded-sm border border-dashed border-hairline-strong px-2 py-1 font-mono text-[11px] leading-none tracking-[0.08em] text-fg-muted uppercase",
          className,
        )}
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-border-ui" />
        {label}
      </span>
    );
  }
  return (
    <div
      className={cn(
        "hatch relative flex flex-col justify-center border border-dashed border-hairline-strong text-fg-muted",
        size === "lg" ? "min-h-[220px] p-8 sm:p-12" : "p-5 sm:p-6",
        className,
      )}
    >
      <p className="type-label flex items-center gap-2 text-fg-muted">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-border-ui" />
        {label}
      </p>
      {note && <p className="mt-2 max-w-[52ch] text-[14px] leading-6 text-fg-muted">{note}</p>}
      {children}
    </div>
  );
}
