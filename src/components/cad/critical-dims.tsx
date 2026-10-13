// Critical dimensions — the six numbers that shape APEX-R1, drawn as dimension callouts under the
// 3D view, one after another like a draftsman dimensioning a part: the extension lines go up, the
// dimension line draws out from its centre, the arrowheads land, THEN the value counts up; the
// label decodes and the source reference types in. Server component (Plot effects, ./plot.css).
// Every number is the team's (RobotConstants.java) or the manual's (R102).

import type { CSSProperties } from "react";
import { Scramble } from "@/components/motion";
import { cn } from "@/lib/utils";
import { Plot, PlotCount } from "./plot-motion";
import { seq } from "./plot-seq";
import { styles } from "./styles";

interface Dim {
  value: number;
  decimals?: number;
  prefix?: string;
  /** Diameter sign, set in the sans face (Martian Mono draws Ø like a slashed zero). */
  dia?: boolean;
  suffix: string;
  label: string;
  source: string;
}

const DIMS: Dim[] = [
  { value: 18, decimals: 2, suffix: " in", label: "Start cube", source: "Manual · R102" },
  { value: 14, decimals: 2, suffix: " in", label: "Muzzle height", source: "Shoot.MUZZLE_Z_IN" },
  { value: 40, suffix: "°", label: "Fixed hood", source: "Shoot.LAUNCH_PITCH_DEG" },
  { value: 170, prefix: "±", suffix: "°", label: "Turret travel", source: "Turret.MIN / MAX · 5 : 1" },
  { value: 4, decimals: 2, dia: true, suffix: " in", label: "Flywheel", source: "Shoot.FLYWHEEL_DIAMETER_IN" },
  { value: 104, dia: true, suffix: " mm", label: "Mecanum × 4", source: "Drive.WHEEL_DIAMETER_IN" },
];

function Arrow({ dir }: { dir: "l" | "r" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 8 6" className="h-1.5 w-2 flex-none fill-current">
      <path d={dir === "l" ? "M0 3 L8 0 L8 6 Z" : "M8 3 L0 0 L0 6 Z"} />
    </svg>
  );
}

export function CriticalDims() {
  return (
    <div className="mt-10">
      <h3 id="cad-dims-title" className="sr-only">
        Critical dimensions
      </h3>
      <Plot as="ul" className="grid grid-cols-2 gap-x-[var(--gutter)] gap-y-8 sm:grid-cols-3 lg:grid-cols-6" step={0.14} inset={0.1}>
        {DIMS.map((d, i) => (
          <li key={d.label} className="min-w-0" style={seq(i)}>
            {/* the value is written once its dimension line is drawn */}
            <p className="font-mono text-[clamp(22px,2.2vw,30px)] leading-none font-light tracking-[-0.01em] text-fg">
              {d.dia && <span className="font-sans font-normal">Ø</span>}
              <PlotCount value={d.value} decimals={d.decimals} prefix={d.prefix} suffix={d.suffix} delay={0.75 + i * 0.14} />
            </p>
            {/* the dimension line: extension lines → line from the centre out → arrowheads */}
            <div aria-hidden="true" className="mt-3 flex items-center text-fg">
              <span className={cn(styles.dimExt, "fx-ext")} />
              <span className="fx-arrow flex flex-none">
                <Arrow dir="l" />
              </span>
              <span className="fx-half-l h-px min-w-0 flex-1 bg-current" />
              <span className="fx-half-r h-px min-w-0 flex-1 bg-current" />
              <span className="fx-arrow flex flex-none">
                <Arrow dir="r" />
              </span>
              <span className={cn(styles.dimExt, "fx-ext")} />
            </div>
            <p className="mt-3">
              <Scramble text={d.label} className="type-label block text-fg" />
              <span className="fx-type mt-1 block font-mono [overflow-wrap:anywhere] text-[10px] leading-4 tracking-[0.02em] text-fg-muted" style={{ "--fx-own": "0.9s" } as CSSProperties}>
                {d.source}
              </span>
            </p>
          </li>
        ))}
      </Plot>
    </div>
  );
}
