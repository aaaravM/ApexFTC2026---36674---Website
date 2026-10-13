"use client";

// FlowList — the design-story step list drawn as a flowchart: an <ol> with the pen-drawn spine
// (FlowSpine) running through the step nodes. The spine draws with scroll and is solid under
// reduced motion. Steps are <Step> Plots (see ./design-stories.tsx).

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FlowSpine } from "./plot-motion";

export function FlowList({ children, className, "aria-label": label }: { children: ReactNode; className?: string; "aria-label"?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  return (
    <ol ref={ref} aria-label={label} className={cn("relative", className)}>
      {/* runs down the node column, from the first node to the last */}
      <FlowSpine target={ref} className="top-4 bottom-4 left-4" />
      {children}
    </ol>
  );
}
