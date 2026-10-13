"use client";

// "View in 3D" — selects an assembly in VIEW 1 (shared cadStore) and scrolls the viewer into view.
// Used by the model index and the design stories. Label rolls on hover; the button leans toward
// the cursor (Magnetic, fine pointers only).

import { Magnetic, RollText } from "@/components/motion";
import { useScrollTo } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { cadStore } from "./cad-store";
import type { AssemblyId } from "./content";

export function ViewIn3D({ assembly, name, className }: { assembly: AssemblyId; name: string; className?: string }) {
  const scrollTo = useScrollTo();
  return (
    <Magnetic className="inline-block">
      <button
        type="button"
        onClick={() => {
          cadStore.set(assembly);
          scrollTo("#cad-view", { offset: -72 });
        }}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-sm border border-border-ui bg-bg px-3 font-mono text-[11px] tracking-[0.08em] text-fg uppercase transition-colors duration-[120ms] hover:border-pollen-edge hover:bg-pollen hover:text-pollen-ink focus-visible:border-pollen-edge focus-visible:bg-pollen focus-visible:text-pollen-ink",
          className,
        )}
      >
        <RollText>View in 3D</RollText>
        <span aria-hidden="true">↑</span>
        <span className="sr-only"> — show the {name.toLowerCase()} in view 1</span>
      </button>
    </Magnetic>
  );
}
