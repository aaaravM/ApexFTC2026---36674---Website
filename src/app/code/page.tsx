// CODE — "How APEX-R1 thinks." (DESIGN_SPEC §5 CODE)
// Console (real build · the solver's answers · tuning OpModes) → the loop → the sensor swap → the
// interactive solver → the four gates → the codebase → the tuning sequence → rules + stack → repo.
// Every number is computed from src/lib/ballistics.ts or read from the team's repo; every excerpt is
// verbatim and highlighted at build time (shiki inside "use cache" + cacheLife("max")).
// DOM ids are prefixed "code-" (Activity keeps hidden routes mounted).

import type { Metadata } from "next";
import { Mark } from "@/components/brand/mark";
import { Armed } from "@/components/code/armed";
import { CodeHeader } from "@/components/code/code-header";
import { CodebaseExplorer } from "@/components/code/codebase-explorer";
import { Console } from "@/components/code/console";
import { getConsoleTabs } from "@/components/code/console-data";
import { CopyCommand } from "@/components/code/copy-command";
import { GatesPanel } from "@/components/code/gates-panel";
import { highlightExcerpts } from "@/components/code/highlight";
import { LoopDiagram } from "@/components/code/loop-diagram";
import { REPO, blobUrl, quotes, repoFileUrl, teamCodeTotals } from "@/components/code/repo-snapshot";
import { RulesOfTheRoad, Stack } from "@/components/code/rules-stack";
import { CodeLabel, SectionHead } from "@/components/code/section-head";
import { SensorSwap } from "@/components/code/sensor-swap";
import { SolverLab } from "@/components/code/solver/solver-lab";
import type { ExcerptView } from "@/components/code/solver/solver-code";
import { TuningSequence } from "@/components/code/tuning-sequence";
import { LineDraw, Magnetic, RollText, Scramble, ScrollProgress, TextReveal } from "@/components/motion";
import { Parallax, Stagger, StaggerItem } from "@/components/code/motion-safe";
import { ButtonLink } from "@/components/site/button";
import { PageTransition } from "@/components/site/page-transition";
import ScrollIsland from "@/components/watermelon/scroll-island";
import { codeExcerpts, codePage, fireGates, pipeline, tuningSequence } from "@/content/code";
import { fmtInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "Code",
  description:
    "How APEX-R1 thinks: Java on the FTC SDK v12.0. One loop, six steps, four gates — with the team's shoot-while-moving solver running live.",
};

/**
 * Where each excerpt sits in its file (checked against the repo on 2026-10-12). `resume` restarts
 * the line numbers after a trimmed region; `synthetic` marks lines added to close an excerpt.
 * `lines` guards against drift: if the excerpt in content/code.ts changes length, these are dropped.
 */
const EXCERPT_LINES: Record<string, { lines: number; end: number; resume?: Record<number, number>; synthetic?: number[] }> = {
  ready: { lines: 8, end: 141 },
  solver: { lines: 23, end: 159, resume: { 15: 152 } },
  rpm: { lines: 5, end: 224 },
  balltype: { lines: 14, end: 56, resume: { 12: 56 }, synthetic: [13] },
};

const LOOP_FILE = repoFileUrl(`${REPO.javaRoot}/opmodes/TeleOpMain.java`);

export default async function CodePage() {
  const highlighted = await highlightExcerpts(codeExcerpts);
  const tabs = getConsoleTabs();

  const view = (id: string): ExcerptView => {
    const ex = codeExcerpts.find((e) => e.id === id)!;
    const lines = highlighted[id];
    const meta = EXCERPT_LINES[id];
    const fits = meta && meta.lines === lines.length;
    return {
      title: ex.title,
      file: ex.file,
      startLine: ex.startLine,
      endLine: fits ? meta.end : undefined,
      lines,
      resume: fits ? meta.resume : undefined,
      synthetic: fits ? meta.synthetic : undefined,
    };
  };

  const topics = [
    { id: "code-console", title: "Console", meta: "build · solve · tune" },
    { id: "code-loop", title: "The loop", meta: `${pipeline.length} steps` },
    { id: "code-sensors", title: "Sensors", meta: "swapped" },
    { id: "code-solver", title: "Solver", meta: "live" },
    { id: "code-gates", title: "Gates", meta: `${fireGates.length}` },
    { id: "code-codebase", title: "Codebase", meta: `${teamCodeTotals.files} files` },
    { id: "code-tuning", title: "Tuning", meta: `${tuningSequence[0].code}–T6` },
    { id: "code-rules", title: "Rules + stack" },
  ];

  return (
    <PageTransition>
      <ScrollProgress />
      <CodeHeader
        titleId="code-title"
        title={codePage.title}
        lede={
          <>
            Java on the <Mark id="ftc-short" /> SDK v12.0. One loop, six steps, four gates.
          </>
        }
        actions={[
          { href: codePage.repo, label: codePage.repoLabel, external: true },
          { href: "/robot", label: "Meet the robot", variant: "secondary" },
        ]}
        meta={[
          { label: "SDK", value: "v12.0 · 20260907" },
          { label: "Language", value: "Java 8 target" },
        ]}
        files={teamCodeTotals.files}
        lines={teamCodeTotals.lines}
      />

      <ScrollIsland topics={topics} label="Code" showAfter={520} />

      {/* 01 — CONSOLE ─────────────────────────────────────────────────────────────────── */}
      <section id="code-console" aria-labelledby="code-console-title" className="container-page scroll-mt-24">
        <CodeLabel index="01" label="CONSOLE" as="h2" id="code-console-title" className="mb-6" />
        <Console tabs={tabs} />
      </section>

      {/* 02 — THE LOOP ────────────────────────────────────────────────────────────────── */}
      <section id="code-loop" aria-labelledby="code-loop-title" className="container-page scroll-mt-24 pt-[var(--section-pad)]">
        <SectionHead
          index="02"
          label="THE LOOP"
          id="code-loop-title"
          title="Once per loop, in this order."
          lede="TeleOpMain calls each sensor's update() exactly once per loop, in dependency order — odometry, colour, vision — then solves the shot, drives the turret and flywheel, and asks the four gates."
          sources={[
            { label: "docs/03-ARCHITECTURE.md", href: repoFileUrl("docs/03-ARCHITECTURE.md") },
            { label: "opmodes/TeleOpMain.java", href: LOOP_FILE },
          ]}
        />
        <LoopDiagram steps={pipeline} className="mt-12 sm:mt-14" />
      </section>

      {/* 03 — SENSORS ─────────────────────────────────────────────────────────────────── */}
      <section id="code-sensors" aria-labelledby="code-sensors-title" className="container-page scroll-mt-24 pt-[var(--section-pad)]">
        <SectionHead
          index="03"
          label="SENSORS"
          id="code-sensors-title"
          titleLead={<Mark id="biobuzz" in="heading" />}
          title="moves the target."
          lede={
            <>
              The usual FTC pattern finds the robot with AprilTags and aims at a fixed goal. This season&apos;s game, <Mark id="biobuzz" presentedBy />, breaks
              both halves: the HIVE tips, and its tags move with it. So odometry finds the robot, and vision measures the target.
            </>
          }
          sources={[{ label: "docs/03-ARCHITECTURE.md", href: repoFileUrl("docs/03-ARCHITECTURE.md") }]}
        />
        <div className="mt-12 grid gap-x-[var(--gutter)] gap-y-10 sm:mt-14 lg:grid-cols-12">
          <Parallax speed={0.06} className="min-w-0 lg:col-span-4">
          <figure className="min-w-0">
            <blockquote className="border-l border-pollen-line pl-5">
              <p className="font-display text-[clamp(20px,1.7vw,24px)] leading-[1.3] font-[460] text-fg [font-stretch:104%]">
                &ldquo;Unfortunately, since <Mark id="biobuzz" symbol={false} /> AprilTags move, they are not suitable for absolute Field Localization.&rdquo;
              </p>
            </blockquote>
            <figcaption className="mt-4 pl-5 font-mono text-[10.5px] leading-5 tracking-[0.06em] text-fg-muted uppercase">{quotes.sdkTagsMove.source}</figcaption>
            <p className="mt-8 max-w-[44ch] pl-5 text-[15px] leading-6 text-fg-muted">
              Not a downgrade: each cluster&apos;s origin sits at the centre of the CELL opening, so the pose vision returns already is the aim point.
            </p>
          </figure>
          </Parallax>
          <SensorSwap className="lg:col-span-8" />
        </div>
      </section>

      {/* 04 — SOLVER ──────────────────────────────────────────────────────────────────── */}
      <section id="code-solver" aria-labelledby="code-solver-title" className="container-page scroll-mt-24 pt-[var(--section-pad)]">
        <SectionHead
          index="04"
          label="SOLVER"
          id="code-solver-title"
          title="Aim at a virtual target."
          lede="A ball leaving a moving robot keeps the robot's velocity, so the turret aims at the target minus velocity × flight time. With the hood fixed at 40°, the flight time falls straight out of the geometry. Change the range and the robot's speed — every number here comes from the team's solver."
          sources={[
            { label: "util/Ballistics.java", href: blobUrl("util/Ballistics.java") },
            { label: "util/BallType.java", href: blobUrl("util/BallType.java") },
            { label: "docs/03-ARCHITECTURE.md", href: repoFileUrl("docs/03-ARCHITECTURE.md") },
          ]}
        />
        <div className="mt-12 sm:mt-14">
          <SolverLab excerpts={{ solver: view("solver"), rpm: view("rpm"), balltype: view("balltype") }} />
        </div>
        <LineDraw className="mt-10 max-w-[96ch] text-hairline" />
        <p className="max-w-[96ch] pt-4 font-mono text-[10.5px] leading-5 tracking-[0.04em] text-fg-muted uppercase">
          Muzzle 14 in up, 2 in ahead of the tracking point (RobotConstants.Shoot). Aim point 46 in up is an estimate — the HIVE pivots at 43.95 in (manual TU04
          §9.6); on the robot, HiveTracker measures it live. Drag-free: BallType.dragPerInch stays 0 until tuned, and the file warns the drag-free range is
          roughly 2× optimistic.
        </p>
      </section>

      {/* 05 — GATES ───────────────────────────────────────────────────────────────────── */}
      <section id="code-gates" aria-labelledby="code-gates-title" className="container-page scroll-mt-24 pt-[var(--section-pad)]">
        <SectionHead
          index="05"
          label="GATES"
          id="code-gates-title"
          title="Four gates, then fire."
          lede="The trigger is a request, not a command. The feeder runs only when isReadyToFire() is true — checked every loop, never on a timer. Flip the conditions and watch where the check stops."
          sources={[
            { label: "AimController.java", href: blobUrl("AimController.java") },
            { label: "opmodes/TeleOpMain.java", href: LOOP_FILE },
          ]}
        />
        <GatesPanel ready={view("ready")} className="mt-12 sm:mt-14" />
      </section>

      {/* 06 — CODEBASE ────────────────────────────────────────────────────────────────── */}
      <section id="code-codebase" aria-labelledby="code-codebase-title" className="container-page scroll-mt-24 pt-[var(--section-pad)]">
        <SectionHead
          index="06"
          label="CODEBASE"
          id="code-codebase-title"
          title="Explore the codebase."
          lede={`${teamCodeTotals.files} Java files, ${fmtInt(teamCodeTotals.lines)} lines, all in TeamCode/ — and every tunable number in one of them, RobotConstants.java. Open a folder, pick a file.`}
          sources={[{ label: `github.com/aaaravM · ${REPO.branch}`, href: REPO.url }]}
        />
        <Armed effect="unfold" inset={0.15} className="mt-12 sm:mt-14">
          <CodebaseExplorer />
        </Armed>
      </section>

      {/* 07 — TUNING ──────────────────────────────────────────────────────────────────── */}
      <section id="code-tuning" aria-labelledby="code-tuning-title" className="container-page scroll-mt-24 pt-[var(--section-pad)]">
        <SectionHead
          index="07"
          label="TUNING"
          id="code-tuning-title"
          title="Tune in this order."
          lede={
            <>
              &ldquo;{quotes.dontSkip.text.split(", and")[0]}.&rdquo; Each step brings in one more piece of hardware — read the matrix downward and the robot
              assembles itself.
            </>
          }
          sources={[
            { label: "TEAM-README.md", href: repoFileUrl("TEAM-README.md") },
            { label: "docs/00-START-HERE.md", href: repoFileUrl("docs/00-START-HERE.md") },
          ]}
        />
        <TuningSequence className="mt-12 sm:mt-14" />
        <p className="mt-6 max-w-[70ch] text-[15px] leading-6 text-fg-muted">
          &ldquo;{quotes.seasonWon.text}&rdquo; Odometry and vision come first: a turret with perfect ballistics on odometry that drifts two inches a lap will
          miss, and the ballistics will get the blame.
          <span className="mt-1 block font-mono text-[10.5px] tracking-[0.06em] uppercase">— {quotes.seasonWon.source}</span>
        </p>
      </section>

      {/* 08 — RULES + STACK ───────────────────────────────────────────────────────────── */}
      <section id="code-rules" aria-labelledby="code-rules-title" className="container-page scroll-mt-24 pt-[var(--section-pad)]">
        <SectionHead
          index="08"
          label="RULES + STACK"
          id="code-rules-title"
          title="Rules of the road."
          lede="Five notes from the team README that keep twelve people from breaking each other's code."
          sources={[{ label: "TEAM-README.md", href: repoFileUrl("TEAM-README.md") }]}
        />
        <div className="mt-12 grid gap-x-[var(--gutter)] gap-y-14 sm:mt-14 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <p className="type-label mb-3 text-fg-muted">
              <Scramble text="Notes" hover />
            </p>
            <RulesOfTheRoad />
          </div>
          <div className="min-w-0 lg:col-span-4 lg:col-start-9">
            <p className="type-label mb-3 text-fg-muted">
              <Scramble text="Stack" hover />
            </p>
            <Stack />
          </div>
        </div>
      </section>

      {/* 09 — REPO ────────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="code-repo-title" className="container-page pt-[var(--section-pad)] pb-[var(--section-pad)]">
        <LineDraw className="text-border-ui" />
        <div className="grid gap-x-[var(--gutter)] gap-y-10 pt-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-6">
            <CodeLabel index="09" label="REPO" />
            <Parallax speed={0.08}>
              <TextReveal as="h2" id="code-repo-title" text="Read the code." className="type-display mt-6 max-w-[12ch]" />
            </Parallax>
          </div>
          <Stagger className="min-w-0 lg:col-span-6 lg:self-end" delay={0.3}>
            <StaggerItem>
              <p className="type-lede">
                Start with TEAM-README.md, then docs/00-START-HERE.md. Everything on this page links back to the file it came from.
              </p>
            </StaggerItem>
            <StaggerItem>
              <CopyCommand command={`git clone ${REPO.cloneUrl}`} className="mt-8" />
            </StaggerItem>
            <StaggerItem className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Magnetic>
                <ButtonLink href={REPO.url} external size="lg">
                  <RollText>Open the repo on GitHub</RollText>
                </ButtonLink>
              </Magnetic>
              <Magnetic>
                <ButtonLink href={repoFileUrl("TEAM-README.md")} external variant="secondary">
                  <RollText>TEAM-README.md</RollText>
                </ButtonLink>
              </Magnetic>
            </StaggerItem>
          </Stagger>
        </div>
      </section>
    </PageTransition>
  );
}
