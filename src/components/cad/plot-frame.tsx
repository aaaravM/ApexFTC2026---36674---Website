"use client";

// PlotFrame — a rectangular border that draws itself the way a pen plotter would: top edge left →
// right, down the right side, back along the bottom, up the left. Used for the sheet borders (on
// load) and the VIEW 1 viewport (when scrolled to). Absolutely positioned; size it with className.
// Renders the finished frame on the server; reduced motion never animates (see cad.css).

import { useRef, type CSSProperties } from "react";
import { useArm } from "@/components/motion";
import { cn } from "@/lib/utils";
import { styles } from "./styles";

export function PlotFrame({
  className,
  immediate,
  delay = 0,
  weight = 1,
  duration = 1.4,
}: {
  className?: string;
  immediate?: boolean;
  /** Seconds before the pen starts. */
  delay?: number;
  /** Line weight in px. */
  weight?: number;
  /** Seconds for the whole loop. */
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useArm(ref, { immediate, inset: 0.06 });
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(styles.plot, className)}
      data-m={immediate ? "play" : undefined}
      style={{ "--m-delay": `${delay}s`, "--plot-w": `${weight}px`, "--plot-side": `${duration / 4}s` } as CSSProperties}
    >
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
