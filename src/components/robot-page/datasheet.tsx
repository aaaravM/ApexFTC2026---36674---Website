// DATA SHEET (DESIGN_SPEC §5 ROBOT): the six headline figures (18 in · 104 mm · ±170° · 4 in ·
// 40° · 5000 RPM), the brand arc for the default AIM shot, then the dense spec table. Every figure
// cites its constant or rule. Motion (different from the AIM gates above it, which rise): each
// figure's rule draws, its number counts up from zero in a left-to-right stagger and its label
// settles in after it; the arc plots itself with the scroll; the spec table prints row by row.
// Server component (the motion pieces are client islands; final values are in the server HTML).

import { LineDraw, Scramble, TextReveal } from "@/components/motion";
import { ArcMotif } from "@/components/site/arc-motif";
import { keyFigures, specSheet, type Figure } from "@/content/robot";
import { cn } from "@/lib/utils";
import { Armed, Tally } from "./armed";
import { AIM_DEFAULTS, CELL_AIM_Z_IN, RC } from "./data";
import { fx } from "./fx";
import { SpecRows } from "./spec-rows";
import { RobotTag } from "./tag";
import "./robot-page.css";

/** "±170" → counts 0 → 170 with a "±" prefix; anything that isn't a plain number stays as text. */
function FigureValue({ value, delay }: { value: string; delay: number }) {
  const m = /^([^\d]*)(\d+(?:\.\d+)?)$/.exec(value);
  if (!m) return <>{value}</>;
  const n = Number(m[2]);
  const decimals = m[2].includes(".") ? m[2].split(".")[1].length : 0;
  return <Tally value={n} prefix={m[1]} decimals={decimals} delay={delay} duration={Math.min(1.5, 0.9 + Math.log10(n + 1) * 0.16)} />;
}

function FigureCell({ f, index }: { f: Figure; index: number }) {
  // each cell plays when it scrolls in (on phones the grid is three rows deep); the stagger
  // follows the column on the 3-up desktop grid
  const at = (index % 3) * 0.09;
  return (
    <Armed className="min-w-0">
      <LineDraw className="text-hairline" delay={at} />
      <p className="rp-fx-fade mt-4 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted tabular-nums" style={fx(at, 0.3)}>
        {String(index + 1).padStart(2, "0")}
      </p>
      <p className="type-figure mt-3 whitespace-nowrap text-fg max-sm:text-[34px]">
        <FigureValue value={f.value} delay={at + 0.1} />
        {f.unit && (
          <span className={cn("align-baseline text-[0.42em] tracking-normal text-fg-muted", f.unit === "°" ? "ml-0.5" : "ml-1.5")}>{f.unit}</span>
        )}
      </p>
      <div className="rp-fx-fade" style={fx(at + 0.55, 0.5)}>
        <p className="type-label mt-4 text-fg">{f.label}</p>
        {f.source && <p className="mt-1.5 font-mono text-[10px] leading-4 [overflow-wrap:anywhere] text-fg-muted/80">{f.source}</p>}
      </div>
    </Armed>
  );
}

export function DataSheet() {
  return (
    <section id="robot-datasheet" aria-labelledby="robot-datasheet-title" className="container-page section-y scroll-mt-14">
      <RobotTag code="10" label="DATA SHEET" />
      <div className="mt-8 grid gap-x-[var(--gutter)] gap-y-5 lg:grid-cols-12 lg:items-end">
        <TextReveal as="h2" id="robot-datasheet-title" text="The numbers." className="type-h2 lg:col-span-6" />
        <p className="type-body text-fg-muted lg:col-span-5 lg:col-start-8">
          Six figures that define APEX-R1. Each one names the constant in the team&apos;s code, or the rule in the Competition Manual, that it
          comes from.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-2 gap-x-[var(--gutter)] gap-y-14 md:grid-cols-3">
        {keyFigures.map((f, i) => (
          <FigureCell key={f.label} f={f} index={i} />
        ))}
      </div>

      <div className="rp-parallax mt-24">
        {/* the AIM playground's opening shot: 96 in from the tracking point = 94 in from the muzzle */}
        <ArcMotif
          distanceIn={AIM_DEFAULTS.rangeIn - RC.muzzleXIn}
          targetHeightIn={CELL_AIM_Z_IN}
          showTarget
          showReadout
          draw="scroll"
          className="text-fg-muted"
        />
      </div>

      <div className="mt-24 grid gap-x-[var(--gutter)] gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Scramble text="[ FULL SPEC SHEET ]" hover className="type-label text-fg-muted" />
          <p className="mt-4 max-w-[36ch] text-[14px] leading-6 text-fg-muted">
            The whole machine on one sheet. Weight stays pending until the robot has been built and weighed.
          </p>
        </div>
        <SpecRows rows={specSheet} className="lg:col-span-7 lg:col-start-6" />
      </div>
    </section>
  );
}
