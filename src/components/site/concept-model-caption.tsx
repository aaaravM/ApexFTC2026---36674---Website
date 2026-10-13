// ConceptModelCaption — the honesty caption shown wherever the procedural robot appears
// (DESIGN_SPEC §4). Renders nothing once the real CAD (public/models/apex-r1.glb) exists.
//   <ConceptModelCaption />
//   <ConceptModelCaption className="absolute bottom-4 left-4" />
// Server-safe.

import { isConceptModel } from "@/content/robot";
import { cn } from "@/lib/utils";

export function ConceptModelCaption({ className }: { className?: string }) {
  if (!isConceptModel) return null;
  return (
    <p className={cn("font-mono text-[10px] leading-4 tracking-[0.08em] [overflow-wrap:anywhere] text-fg-muted uppercase", className)}>
      Concept model · generated from <span className="normal-case">RobotConstants.java</span> · real CAD pending
    </p>
  );
}
