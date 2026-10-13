"use client";

// ROLE MATRIX — who holds which discipline, as a responsibility table (rows = members, columns =
// LEAD · CAD · CODE · BUILD · SOCIALS, totals in the footer). Built from src/content/team.ts, the
// same data as the roster filter, and it follows that filter: the active discipline's column is
// banded and its squares turn pollen. Squares plot in row by row when the table scrolls in.
// Real <table> semantics (caption, scoped headers, sr-only Yes/No per cell).

import { useRef, type CSSProperties } from "react";
import { CountUp, TextReveal, useArm } from "@/components/motion";
import { BigFigure } from "@/components/site/big-figure";
import { TransitionLink } from "@/components/site/transition-link";
import { DISCIPLINES, displayName, rosterCounts, team } from "@/content/team";
import { cn } from "@/lib/utils";
import { capitalize, disciplineOf, numberWord, pad2, rosterStats, type FilterId } from "./data";
import { SectionTag } from "./section-tag";
import "./team.css";

export function RoleMatrix({ active }: { active: FilterId }) {
  const tableRef = useRef<HTMLTableElement>(null);
  useArm(tableRef, { inset: 0.12 });
  const counts = rosterCounts();
  const stats = rosterStats();
  const activeD = disciplineOf(active);

  return (
    <section aria-labelledby="team-matrix-title" className="container-page section-y">
      <SectionTag code="02" label="ROLE MATRIX" />
      <div className="mt-10 grid gap-x-[var(--gutter)] gap-y-12 lg:mt-14 lg:grid-cols-12">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+96px)] lg:col-span-4 lg:self-start">
          <TextReveal as="h2" id="team-matrix-title" text="Who does what." className="type-h2" />
          <p className="type-body mt-6 text-fg-muted">
            {capitalize(numberWord(stats.multi))} of the {numberWord(stats.total)} of us work across two or more
            disciplines. The table is generated from the same roster file as the cards above — no count on this page is
            typed in by hand.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-x-4 border-t border-hairline pt-6">
            <BigFigure size="md" value={<CountUp value={stats.assignments} />} label="Assignments" />
            <BigFigure size="md" value={<CountUp value={Number(stats.perMember)} decimals={1} />} label="Per member" />
            <BigFigure
              size="md"
              value={<CountUp value={stats.multi} />}
              unit={`/ ${stats.total}`}
              label="Multi-discipline"
            />
          </div>
        </div>

        <div className="min-w-0 lg:col-span-8 lg:col-start-5">
          <table ref={tableRef} className="team-matrix w-full table-fixed border-collapse">
            <caption className="sr-only">
              Disciplines held by each of the {stats.total} team members, generated from the roster. Totals in the last
              row and column.
            </caption>
            <colgroup>
              <col />
              {DISCIPLINES.map((d) => (
                <col key={d} className="w-[30px] sm:w-[13%]" />
              ))}
              <col className="w-[30px] sm:w-[8%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border-ui">
                <th scope="col" className="pb-3 text-left align-bottom">
                  <span className="type-label text-fg-muted">Member</span>
                </th>
                {DISCIPLINES.map((d) => {
                  const on = d === activeD;
                  return (
                    <th
                      key={d}
                      scope="col"
                      className={cn(
                        "relative pb-3 text-center align-bottom transition-colors duration-[220ms] ease-out",
                        on ? "bg-surface-2 text-fg" : "text-fg-muted",
                      )}
                    >
                      <span className="type-label inline-block max-sm:rotate-180 max-sm:[writing-mode:vertical-rl]">
                        {d}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-x-2 -bottom-px h-px origin-center bg-pollen-line transition-transform duration-[220ms] ease-out motion-reduce:transition-none",
                          on ? "scale-x-100" : "scale-x-0",
                        )}
                      />
                    </th>
                  );
                })}
                <th scope="col" className="pb-3 text-center align-bottom">
                  <span className="type-label text-fg-muted" aria-hidden="true">
                    Σ
                  </span>
                  <span className="sr-only">Total</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {team.map((m, r) => {
                const inActive = !activeD || m.disciplines.includes(activeD);
                return (
                  <tr
                    key={m.slug}
                    className="group/row border-b border-hairline transition-colors duration-[120ms] hover:bg-surface-1"
                  >
                    <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                      <TransitionLink
                        href={`/team/${m.slug}`}
                        className={cn(
                          "inline-flex items-baseline gap-3 transition-colors duration-[220ms] ease-out hover:text-fg",
                          inActive ? "text-fg" : "text-fg-muted",
                        )}
                      >
                        <span className="font-mono text-[10px] tracking-[0.06em] text-fg-muted tabular-nums">
                          {pad2(r + 1)}
                        </span>
                        <span className="link-draw text-[14px] leading-5 sm:text-[15px]">{displayName(m)}</span>
                      </TransitionLink>
                    </th>
                    {DISCIPLINES.map((d, c) => {
                      const has = m.disciplines.includes(d);
                      const on = d === activeD;
                      return (
                        <td
                          key={d}
                          className={cn(
                            "text-center align-middle transition-colors duration-[220ms] ease-out",
                            on && "bg-surface-2",
                          )}
                        >
                          {has ? (
                            <span
                              aria-hidden="true"
                              className={cn(
                                "team-dot inline-block size-2.5 align-middle transition-colors duration-[220ms] ease-out",
                                on ? "bg-pollen-line" : "bg-fg",
                              )}
                              style={{ "--r": r, "--c": c } as CSSProperties}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="inline-block size-[3px] rounded-full bg-border-ui align-middle"
                            />
                          )}
                          <span className="sr-only">{has ? "Yes" : "No"}</span>
                        </td>
                      );
                    })}
                    <td className="text-center align-middle font-mono text-[12px] text-fg-muted tabular-nums">
                      {m.disciplines.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-ui">
                <th scope="row" className="pt-3 text-left font-normal">
                  <span className="type-label text-fg-muted">Total</span>
                </th>
                {DISCIPLINES.map((d) => (
                  <td
                    key={d}
                    className={cn(
                      "pt-3 text-center font-mono text-[13px] tabular-nums transition-colors duration-[220ms] ease-out",
                      d === activeD ? "bg-surface-2 text-fg" : "text-fg",
                    )}
                  >
                    {counts[d]}
                  </td>
                ))}
                <td className="pt-3 text-center font-mono text-[13px] text-fg tabular-nums">{stats.assignments}</td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="inline-block size-2 bg-fg" /> Assigned
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="inline-block size-[3px] rounded-full bg-border-ui" /> Not assigned
            </span>
            <span>Source · src/content/team.ts</span>
          </p>
        </div>
      </div>
    </section>
  );
}
