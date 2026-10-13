// SheetLabel — the sheet's section label: mono "[ VIEW 1 / GENERAL ASSEMBLY ]" that decodes
// (Scramble), followed by a rule. The rule varies section to section so the sheet never repeats
// one swipe: "draw" (a hairline draws across, from either end) or "scale" (a drafting scale whose
// ticks tick up one by one). Server component; the effects are small client islands.

import type { CSSProperties } from "react";
import { LineDraw, Scramble } from "@/components/motion";
import { bracketLabel } from "@/components/site/section-label";
import { cn } from "@/lib/utils";
import { Plot } from "./plot-motion";

const TICKS = Array.from({ length: 41 }, (_, i) => i);

function Scale() {
  return (
    <Plot className="flex h-2 min-w-0 flex-1 items-end justify-between overflow-hidden text-hairline-strong" step={0.018} inset={0.08}>
      {TICKS.map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn("fx-tick w-px flex-none bg-current", i % 2 === 1 && "max-sm:hidden", i % 10 === 0 ? "h-2 bg-fg-muted" : i % 5 === 0 ? "h-[6px]" : "h-1")}
          style={{ "--i": i } as CSSProperties}
        />
      ))}
    </Plot>
  );
}

export function SheetLabel({
  code,
  label,
  immediate,
  className,
  rule = "draw",
}: {
  code?: string;
  label: string;
  immediate?: boolean;
  className?: string;
  rule?: "draw" | "draw-right" | "scale" | false;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Scramble text={bracketLabel(code, label)} immediate={immediate} hover className="type-label shrink-0 text-fg-muted" />
      {rule === "scale" ? (
        <Scale />
      ) : rule ? (
        <LineDraw className="min-w-0 flex-1 text-hairline-strong" origin={rule === "draw-right" ? "right" : "left"} immediate={immediate} delay={immediate ? 0.2 : 0.1} />
      ) : null}
    </div>
  );
}
