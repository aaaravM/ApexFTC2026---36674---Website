// Model index — CAD-001…004, the four Onshape documents. Each row opens its assembly in VIEW 1;
// the public Onshape links are pending until the team makes the documents public
// (students: paste the link into `onshape` in ./content.ts). Motion: the rows feed in from the left one
// after another with their rules drawing under them, and each PENDING mark is stamped on as its row
// lands. Server component.

import { Magnetic, RollText, Scramble } from "@/components/motion";
import { Plot } from "./plot-motion";
import { seq } from "./plot-seq";
import type { CSSProperties } from "react";
import { Pending } from "@/components/site/pending";
import { assemblies } from "./content";
import { ViewIn3D } from "./view-in-3d";

export function ModelIndex() {
  return (
    <div className="mt-10">
      <div aria-hidden="true" className="hidden grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-[var(--gutter)] pb-2 md:grid">
        {["Doc", "Assembly", "Contains", "Model"].map((h) => (
          <span key={h} className="font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">
            {h}
          </span>
        ))}
      </div>
      <Plot as="ol" className="border-t border-fg" step={0.16} inset={0.1}>
        {assemblies.map((a, i) => (
          <li
            key={a.id}
            style={seq(i)}
            className="fx-rule fx-slide grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[var(--gutter)] gap-y-3 py-5 md:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <Scramble text={a.cad} hover className="col-span-2 font-mono text-[12px] tracking-[0.08em] text-fg tabular-nums md:col-span-1" />
            <h3 className="row-start-2 font-display md:row-start-auto text-[clamp(20px,2vw,26px)] leading-tight font-medium [font-stretch:108%]">{a.title}</h3>
            <p className="col-span-2 row-start-3 text-[14px] leading-5 text-fg-muted md:col-span-1 md:row-start-auto">{a.contains}</p>
            <div className="col-start-2 row-start-2 flex justify-end md:col-start-auto md:row-start-auto">
              <ViewIn3D assembly={a.id} name={a.title} />
            </div>
            <div className="col-span-2 md:col-span-3 md:col-start-2">
              {a.onshape ? (
                <Magnetic className="inline-block">
                  <a href={a.onshape} target="_blank" rel="noopener noreferrer" className="link-draw text-[14px] text-fg">
                    <RollText>Open in Onshape</RollText> ↗<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Magnetic>
              ) : (
                <span className="fx-stamp inline-block" style={{ "--fx-own": "0.55s" } as CSSProperties}>
                  <Pending label="Public Onshape link pending" inline />
                </span>
              )}
            </div>
          </li>
        ))}
      </Plot>
    </div>
  );
}
