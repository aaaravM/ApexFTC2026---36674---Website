// Design stories DS-01…04 — one card per mechanism: Requirement → Options → Decision + math →
// Iterations → Risk (DESIGN_SPEC §5 CAD). Requirements cite the manual (R102, R105, G407, G408);
// decisions and maths are the team's real numbers from ./content.ts; empty iteration logs show the
// designed "PENDING — LOG FROM BUILD" plate. Server component.
// Motion — each card BUILDS like a flowchart: a pen line draws down the spine as you scroll
// (FlowList), each step's node lands and inks in, a connector draws to its heading, and only then
// does the step's content arrive: citations and the PENDING plate are stamped, the chosen option is
// ticked and highlighted, the worked numbers type in row by row, risks feed in from the left, and
// the hue-window detail plots its arcs. Effects: ./plot-motion.tsx + ./plot.css.

import type { CSSProperties } from "react";
import { Scramble, TextReveal } from "@/components/motion";
import { Chip, type ChipTone, type DotTone } from "@/components/site/chip";
import { Pending } from "@/components/site/pending";
import { fmtFixed, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { designStories, HUE, MANUAL_URL, STORY_STEPS, turretRatios, type DesignStory, type RiskStatus } from "./content";
import { FlowList } from "./flow-list";
import { Plot } from "./plot-motion";
import { seq } from "./plot-seq";
import { ViewIn3D } from "./view-in-3d";

const STATUS: Record<RiskStatus, { tone: ChipTone; dot: DotTone }> = {
  open: { tone: "strong", dot: "on" },
  watch: { tone: "default", dot: "muted" },
  planned: { tone: "default", dot: "muted" },
  "in code": { tone: "strong", dot: "on" },
};

const ASSEMBLY_NAME = { full: "Full assembly", drive: "Drivetrain", intake: "Intake", turret: "Turret + shooter" } as const;

function Source({ children }: { children: string }) {
  return <p className="mt-1.5 font-mono text-[10px] leading-4 tracking-[0.02em] text-fg-muted">{children}</p>;
}

// ─── detail drawings ───────────────────────────────────────────────────────────

/** DETAIL B — the hue windows the sorter uses, on the colour wheel (RobotConstants.Colors). */
function HueDetail() {
  const R = 38;
  const pt = (deg: number, r = R) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  };
  const arc = (a0: number, a1: number) => {
    const span = (a1 - a0 + 360) % 360;
    return `M ${pt(a0)} A ${R} ${R} 0 ${span > 180 ? 1 : 0} 1 ${pt(a1)}`;
  };
  const windows = [
    { key: "P", name: "POLLEN", range: HUE.pollen, stroke: "var(--pollen)" },
    { key: "R", name: "RED", range: HUE.red, stroke: "var(--data-red)" },
    { key: "B", name: "BLUE", range: HUE.blue, stroke: "var(--data-blue)" },
  ];
  return (
    <figure className="border border-fg p-3 sm:p-4">
      <div className="mx-auto aspect-square w-full max-w-[220px]">
        <svg viewBox="0 0 100 100" className="size-full" role="img" aria-label="Hue windows on the colour wheel: POLLEN 35 to 85 degrees, red 340 to 20 degrees, blue 190 to 265 degrees.">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--hairline-strong)" strokeWidth="0.6" pathLength={1} className="fx-arc" style={{ "--fx-own": "0.4s", "--fx-dur": "1.1s" } as CSSProperties} />
          {Array.from({ length: 24 }, (_, i) => i * 15).map((d) => (
            <path key={d} d={`M ${pt(d, R - (d % 90 === 0 ? 4 : 2))} L ${pt(d, R)}`} stroke="var(--text)" strokeWidth={d % 90 === 0 ? 0.6 : 0.35} />
          ))}
          {windows.map((w, wi) => {
            const [a0, a1] = w.range;
            const mid = a0 + (((a1 - a0 + 360) % 360) / 2);
            return (
              <g key={w.key}>
                <path d={arc(a0, a1)} fill="none" stroke="var(--text)" strokeWidth="7" pathLength={1} className="fx-arc" style={seq(wi, { "--fx-own": "1s", "--fx-dur": "0.6s" } as CSSProperties)} />
                <path d={arc(a0, a1)} fill="none" stroke={w.stroke} strokeWidth="5.4" pathLength={1} className="fx-arc" style={seq(wi, { "--fx-own": "1.1s", "--fx-dur": "0.6s" } as CSSProperties)} />
                <text x={pt(mid, R + 9).split(" ")[0]} y={pt(mid, R + 9).split(" ")[1]} textAnchor="middle" dominantBaseline="central" fontSize="5.5" fill="var(--text)" className="font-mono">
                  {w.key}
                </text>
              </g>
            );
          })}
          {[0, 90, 180, 270].map((d) => (
            <text key={d} x={pt(d, R - 9).split(" ")[0]} y={pt(d, R - 9).split(" ")[1]} textAnchor="middle" dominantBaseline="central" fontSize="4" fill="var(--muted)" className="font-mono">
              {d}°
            </text>
          ))}
          <text x="50" y="48" textAnchor="middle" fontSize="4.6" fill="var(--text)" className="font-mono">
            SAT ≥ {HUE.minSaturation}
          </text>
          <text x="50" y="55" textAnchor="middle" fontSize="4" fill="var(--muted)" className="font-mono">
            BALL &lt; {HUE.ballPresentMm} mm
          </text>
        </svg>
      </div>
      <figcaption className="mt-3 border-t border-hairline-strong pt-2 font-mono text-[10px] leading-4 tracking-[0.06em] text-fg-muted uppercase">
        Detail B · hue windows · P {HUE.pollen[0]}–{HUE.pollen[1]}° · R {HUE.red[0]}–{HUE.red[1]}° · B {HUE.blue[0]}–{HUE.blue[1]}°
      </figcaption>
    </figure>
  );
}

/** The turret gear-ratio trade study (comment above Turret.TICKS_PER_RAD). */
function TurretRatioTable() {
  return (
    <div className="mt-5 overflow-x-auto" data-lenis-prevent>
      <table className="w-full min-w-[420px] border-collapse font-mono text-[11px] leading-4 tabular-nums">
        <caption className="pb-2 text-left font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">
          Trade study · external reduction G
        </caption>
        <thead>
          <tr className="border-y border-fg text-left text-[10px] tracking-[0.08em] text-fg-muted uppercase">
            <th scope="col" className="py-1.5 pr-3 font-normal">
              G
            </th>
            <th scope="col" className="py-1.5 pr-3 text-right font-normal">
              Ticks / °
            </th>
            <th scope="col" className="py-1.5 pr-3 text-right font-normal">
              Slew °/s
            </th>
            <th scope="col" className="py-1.5 font-normal">
              Note
            </th>
          </tr>
        </thead>
        <tbody>
          {turretRatios.map((r) => (
            <tr key={r.g} className={cn("border-b border-hairline", r.chosen ? "text-fg" : "text-fg-muted")}>
              <th scope="row" className={cn("py-1.5 pr-3 text-left", r.chosen ? "font-semibold" : "font-normal")}>
                {r.g === 6.25 ? "6.25" : r.g} : 1
              </th>
              <td className="py-1.5 pr-3 text-right">{fmtFixed(r.ticksPerDeg, 2)}</td>
              <td className="py-1.5 pr-3 text-right">{fmtInt(r.slewDegPerSec)}</td>
              <td className="py-1.5">
                {r.chosen ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-fg uppercase">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-fg" />
                    <span className="fx-hl" style={{ "--fx-own": "0.9s" } as CSSProperties}>
                      {r.note}
                    </span>
                  </span>
                ) : (
                  r.note || "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Source>RobotConstants.java · comment above Turret.TICKS_PER_RAD</Source>
    </div>
  );
}

// ─── one story ─────────────────────────────────────────────────────────────────

/** Content arrives after its step's node and connector: --fx-own offsets it. */
const after = (k: number, own = 0.4) => seq(k, { "--fx-own": `${own}s` } as CSSProperties);

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  const st = STORY_STEPS[n];
  return (
    <Plot as="li" className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 sm:gap-x-5" step={0.07} inset={0.2}>
      {/* the node on the spine */}
      <span aria-hidden="true" className="fx-node relative z-[1] grid size-8 place-items-center border border-fg font-mono text-[11px] tabular-nums">
        {st.code}
      </span>
      <div className="min-w-0">
        <h4 className="relative flex h-8 items-center">
          {/* connector: node → heading */}
          <span aria-hidden="true" className="fx-stub absolute top-1/2 -left-4 h-px w-3 bg-fg sm:-left-5 sm:w-4" />
          <Scramble text={st.label} className="type-label text-fg" />
        </h4>
        {children}
      </div>
    </Plot>
  );
}

function Story({ s }: { s: DesignStory }) {
  return (
    <article id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24 pt-10 sm:pt-14">
      <div aria-hidden="true" className="border-t border-fg" />
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-x-[var(--gutter)] gap-y-8 lg:grid-cols-12">
        {/* the card's left column: code, title, intro — sticky on desktop */}
        <header className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)]">
            <Plot as="p" className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.08em] uppercase">
              <span className="fx-stamp inline-block border border-fg px-1.5 py-0.5 text-fg">{s.code}</span>
              <Scramble text={s.label} className="text-fg-muted" />
            </Plot>
            <TextReveal
              as="h3"
              id={`${s.id}-title`}
              mode="words"
              text={s.title}
              className="mt-5 max-w-[22ch] font-display text-[clamp(24px,2.6vw,36px)] leading-[1.05] font-medium tracking-[-0.005em] [font-stretch:108%]"
            />
            <p className="mt-4 max-w-[48ch] text-[15px] leading-6 text-[var(--lede)]">{s.intro}</p>
            {s.status && (
              <p className="mt-4 flex items-start gap-2 font-mono text-[10px] leading-4 tracking-[0.06em] text-fg-muted uppercase">
                <span aria-hidden="true" className="mt-1 size-1.5 shrink-0 rounded-full border border-border-ui" />
                {s.status}
              </p>
            )}
            <div className="mt-6">
              <ViewIn3D assembly={s.assembly} name={ASSEMBLY_NAME[s.assembly]} />
            </div>
          </div>
        </header>

        {/* the five steps, as a flowchart */}
        <FlowList className="space-y-10 lg:col-span-8" aria-label={`${s.code} design steps`}>
          {/* 01 Requirement */}
          <Step n={0}>
            <ul className="mt-3 space-y-4">
              {s.requirements.map((r, i) => (
                <li key={i} className="fx-rise grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3" style={after(i)}>
                  <span>
                    {r.rule ? (
                      <a
                        href={MANUAL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={after(i, 0.65)}
                        className="fx-stamp inline-flex h-6 items-center rounded-sm border border-fg px-1.5 font-mono text-[11px] tracking-[0.06em] text-fg hover:bg-fg hover:text-bg focus-visible:bg-fg focus-visible:text-bg"
                      >
                        {r.rule}
                        <span className="sr-only"> in the Competition Manual (opens in a new tab)</span>
                      </a>
                    ) : (
                      <span aria-hidden="true" className="inline-flex h-6 items-center font-mono text-[11px] text-fg-muted">
                        —
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] leading-6">{r.text}</p>
                    <Source>{r.source}</Source>
                  </div>
                </li>
              ))}
            </ul>
          </Step>

          {/* 02 Options */}
          <Step n={1}>
            <div className="mt-3 space-y-6">
              {s.trades.map((t) => (
                <div key={t.question}>
                  <p className="text-[14px] leading-5 font-semibold">{t.question}</p>
                  <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {t.options.map((o, k) => (
                      <li
                        key={o.name}
                        style={after(k)}
                        className={cn("fx-rise border px-3.5 py-3", o.chosen ? "border-fg bg-surface-1" : "border-dashed border-hairline-strong text-fg-muted")}
                      >
                        <p className="flex items-center justify-between gap-3 font-mono text-[11px] tracking-[0.06em] uppercase">
                          <span className={o.chosen ? "text-fg" : undefined}>{o.name}</span>
                          {o.chosen && (
                            <span className="inline-flex items-center gap-1.5 text-fg">
                              {/* the decision is ticked, then highlighted */}
                              <svg aria-hidden="true" viewBox="0 0 12 10" className="h-2.5 w-3 flex-none">
                                <path
                                  d="M1 5.5 L4.5 9 L11 1"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  pathLength={1}
                                  className="fx-check"
                                  style={{ "--fx-own": "0.9s", "--fx-dur": "0.4s" } as CSSProperties}
                                />
                              </svg>
                              <span className="fx-hl" style={{ "--fx-own": "1.15s" } as CSSProperties}>
                                Chosen
                              </span>
                            </span>
                          )}
                        </p>
                        <p className="mt-1.5 text-[14px] leading-[1.45]">{o.text}</p>
                      </li>
                    ))}
                  </ul>
                  <Source>{t.source}</Source>
                </div>
              ))}
              {s.id === "cad-ds-03" && <TurretRatioTable />}
            </div>
          </Step>

          {/* 03 Decision + math */}
          <Step n={2}>
            <div className={cn("mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-[var(--gutter)] gap-y-6", s.id === "cad-ds-02" && "md:grid-cols-[minmax(0,1fr)_220px]")}>
              <div className="min-w-0">
                <ul className="space-y-2.5">
                  {s.decision.map((d, i) => (
                    <li key={i} className="fx-rise grid grid-cols-[1.75rem_minmax(0,1fr)] text-[15px] leading-6" style={after(i)}>
                      <span aria-hidden="true" className="font-mono text-fg-muted">
                        →
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
                {/* the worked numbers are typed in, row by row */}
                <table className="mt-5 w-full border-collapse font-mono text-[11.5px] leading-4">
                  <caption className="sr-only">Worked numbers</caption>
                  <tbody>
                    {s.math.map((m, k) => (
                      <tr
                        key={m.label}
                        style={after(k + s.decision.length, 0.55)}
                        className="fx-type border-t border-hairline align-top first:border-fg last:border-b last:border-b-fg"
                      >
                        <th scope="row" className="w-[34%] py-2 pr-3 text-left text-[10px] font-normal tracking-[0.08em] text-fg-muted uppercase">
                          {m.label}
                        </th>
                        <td className="py-2 pr-3 text-fg [overflow-wrap:anywhere]">
                          {m.expr}
                          {m.note && <span className="mt-1 block font-sans text-[12.5px] leading-[1.4] text-fg-muted">{m.note}</span>}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap text-fg tabular-nums">{m.result && <strong className="font-semibold">{m.result}</strong>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {s.id === "cad-ds-02" && <HueDetail />}
            </div>
          </Step>

          {/* 04 Iterations */}
          <Step n={3}>
            {s.iterations.length ? (
              <ol className="mt-3 border-l border-fg">
                {s.iterations.map((it, i) => (
                  <li key={i} className="fx-rise relative pb-4 pl-5 last:pb-0" style={after(i)}>
                    <span aria-hidden="true" className="absolute top-1.5 -left-[4.5px] size-2 rounded-full border border-fg bg-bg" />
                    <p className="font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase tabular-nums">{it.date ?? "Undated"}</p>
                    <p className="mt-1 text-[15px] leading-6">{it.change}</p>
                    <Source>{it.source}</Source>
                  </li>
                ))}
              </ol>
            ) : (
              /* the empty log is stamped PENDING */
              <div className="fx-stamp mt-3" style={after(0, 0.5)}>
                <Pending label="Pending — log from build" note="Every change to the real mechanism gets a dated row here." />
              </div>
            )}
          </Step>

          {/* 05 Risk */}
          <Step n={4}>
            <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
              {s.risks.map((r, i) => (
                <li key={i} className="fx-slide grid gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[6.5rem_minmax(0,1fr)]" style={after(i)}>
                  <span>
                    <Chip tone={STATUS[r.status].tone} dot={STATUS[r.status].dot}>
                      {r.status}
                    </Chip>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] leading-6">{r.risk}</p>
                    <p className="mt-1.5 text-[14px] leading-[1.45] text-fg-muted">
                      <span className="font-mono text-[10px] tracking-[0.08em] text-fg uppercase">Mitigation · </span>
                      {r.mitigation}
                    </p>
                    <Source>{r.source}</Source>
                  </div>
                </li>
              ))}
            </ul>
          </Step>
        </FlowList>
      </div>
    </article>
  );
}

export function DesignStories() {
  return (
    <div className="mt-6">
      {designStories.map((s) => (
        <Story key={s.id} s={s} />
      ))}
    </div>
  );
}
