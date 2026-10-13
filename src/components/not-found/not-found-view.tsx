// 404 — "NO SOLUTION — TARGET OUT OF RANGE (404)" (DESIGN_SPEC §5). Adapted from Watermelon UI
// error-3 (https://ui.watermelon.sh · MIT © 2025-present Watermelon Contributors): its giant 404,
// status panel and two actions are kept as ideas and rewritten in the solver's voice —
//   • the 404 becomes a measured dimension in FIG. 404 (trajectory-figure.tsx): a CELL 404 ft away,
//     the hardest shot APEX-R1 can make falling short, and the arc the solver asked for;
//   • the panel is the solver's real output (solver-printout.tsx) + the nearest page in range;
//   • "Initialize Reboot / Retry Uplink" become RETURN TO FIELD and OPEN ⌘K.
// No glitch loop: the motion here explains the miss. Server Component with client islands.
// Motion (kit): the eyebrow decodes and its rule draws, "No solution" rises letter by letter, the
// verdict line decodes, the lede rises word by word, the solver's lines print one by one, the
// buttons roll their labels and lean toward the pointer, and the 404 ft dimension counts up.

import { LineDraw, Magnetic, RollText, Scramble, TextReveal } from "@/components/motion";
import { ButtonLink } from "@/components/site/button";
import { ShortcutKbd } from "@/components/site/kbd";
import { OpenPaletteButton } from "@/components/site/open-palette-button";
import { SHOOTER } from "@/lib/ballistics";
import { fmtInt } from "@/lib/format";
import { REQUIRED, TARGET_FT } from "./shot";
import { SolverPrintout } from "./solver-printout";
import { TrajectoryFigure } from "./trajectory-figure";

const LEDE = `There's no page at this address. Treated as a shot, it's ${TARGET_FT} ft away and needs ${fmtInt(
  REQUIRED.flywheelRpm,
)} rpm — our flywheel tops out at ${fmtInt(SHOOTER.maxFlywheelRpm)}.`;

export function NotFoundView() {
  return (
    <section
      aria-labelledby="nf-title"
      className="container-page pt-[calc(var(--header-h)+clamp(36px,5vw,72px))] pb-[clamp(16px,3vw,40px)]"
    >
      <div className="flex items-center gap-4">
        <Scramble text="[ ERR / 404 ]" immediate hover className="type-label shrink-0 text-fg-muted" />
        <LineDraw immediate delay={0.15} className="flex-1 text-hairline" />
      </div>

      <div className="mt-8 grid gap-y-10 sm:mt-10 lg:grid-cols-12 lg:gap-x-[var(--gutter)]">
        <div className="lg:col-span-7 xl:col-span-8">
          <h1 id="nf-title">
            <TextReveal text="No solution" immediate delay={0.1} className="type-display block" />
            <Scramble
              text="— Target out of range (404)"
              immediate
              duration={0.9}
              className="mt-4 block font-mono text-[13px] leading-5 tracking-[0.08em] text-fg uppercase sm:mt-5 sm:text-[14px]"
            />
            <span className="sr-only">. Page not found.</span>
          </h1>
          <TextReveal
            as="p"
            mode="words"
            text={LEDE}
            immediate
            delay={0.45}
            stagger={0.018}
            duration={0.8}
            className="type-lede mt-6 sm:mt-8"
          />
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Magnetic>
              <ButtonLink href="/" direction="back" arrow>
                <RollText>Return to field</RollText>
              </ButtonLink>
            </Magnetic>
            <Magnetic>
              <OpenPaletteButton variant="ghost">
                <RollText>Open</RollText> <ShortcutKbd className="ml-1" />
              </OpenPaletteButton>
            </Magnetic>
          </div>
        </div>

        <SolverPrintout className="self-start lg:col-span-5 xl:col-span-4" />
      </div>

      <TrajectoryFigure className="mt-14 sm:mt-16" />
    </section>
  );
}
