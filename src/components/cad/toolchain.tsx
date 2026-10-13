// Toolchain — Onshape · Fusion 360 · 3D print · mill (T-01…T-04), the route from a model to a part.
// Motion: the four cells flip down off the rail one after another (perspective tilt), and the
// connectors between them are marching-ants dashes that keep flowing model → part (static under
// reduced motion). Server component (Plot effects, ./plot.css).

import { Scramble } from "@/components/motion";
import { toolchain } from "./content";
import { Plot } from "./plot-motion";
import { seq } from "./plot-seq";

export function Toolchain() {
  return (
    <Plot as="ol" className="mt-10 grid border-t border-l border-fg sm:grid-cols-2 lg:grid-cols-4" step={0.14} inset={0.1}>
      {toolchain.map((t, i) => (
        <li key={t.code} style={seq(i)} className="fx-tilt relative flex min-h-[200px] flex-col border-r border-b border-fg bg-bg p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <Scramble text={t.code} hover className="font-mono text-[11px] tracking-[0.08em] text-fg-muted tabular-nums" />
            <span className="rounded-sm border border-hairline-strong px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">{t.role}</span>
          </div>
          <h3 className="mt-6 font-display text-[clamp(24px,2.4vw,34px)] leading-none font-medium [font-stretch:112%]">{t.name}</h3>
          <p className="mt-auto pt-6 text-[14px] leading-[1.45] text-fg-muted">{t.note}</p>
          {i < toolchain.length - 1 && (
            <div aria-hidden="true" className="mt-4 flex items-center text-fg">
              <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-1.5 min-w-0 flex-1">
                <line x1="0" y1="3" x2="100" y2="3" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" className="dwg-ants" />
              </svg>
              <svg viewBox="0 0 8 6" className="h-1.5 w-2 flex-none fill-current">
                <path d="M8 3 L0 0 L0 6 Z" />
              </svg>
            </div>
          )}
        </li>
      ))}
    </Plot>
  );
}
