// Rules of the road (TEAM-README.md) as drawing NOTES, and the stack as a spec table.
// Server component. Notes: each rule draws across, then its text settles; stack: rows flip down
// like a departure board (CSS on the Armed trigger).

import { Fragment, type CSSProperties, type ReactNode } from "react";
import { Mark, MarkText } from "@/components/brand/mark";
import { Armed } from "@/components/code/armed";
import { SpecTable } from "@/components/site/spec-table";
import { codePage, rulesOfTheRoad, stack } from "@/content/code";
import { cn } from "@/lib/utils";

/** Set file names, folders, calls and commands in mono inside a rule. */
const CODEY = /(TeamCode\/|FtcRobotController\/|RobotConstants\.java|update\(\)|git fetch upstream --tags && git merge v12\.x|\+X forward, \+Y left, \+heading counter-clockwise)/g;

/** FIRST brand rules: never the possessive "FIRST's" (content/code.ts rule 1 says "is FIRST's"). */
const brandSafe = (text: string) => text.replace(/\bis FIRST['’]s\b/g, "belongs to FIRST").replace(/\bFIRST['’]s\b/g, "the FIRST");

function Rich({ text }: { text: string }): ReactNode {
  const parts = brandSafe(text).split(CODEY);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <code key={i} className="font-mono text-[0.86em] [overflow-wrap:anywhere] text-fg">
        {p}
      </code>
    ) : (
      <Fragment key={i}>
        {p.split(/(FIRST)/g).map((q, j) => (q === "FIRST" ? <Mark key={j} id="first" /> : <MarkText key={j}>{q}</MarkText>))}
      </Fragment>
    ),
  );
}

export function RulesOfTheRoad({ className }: { className?: string }) {
  return (
    <Armed effect="notes" as="ol" className={cn("border-t border-border-ui", className)}>
      {rulesOfTheRoad.map((r, i) => (
        <li key={i} style={{ "--i": i } as CSSProperties} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 border-b border-hairline py-4">
          <span className="pt-1 font-mono text-[11px] tracking-[0.08em] text-fg-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
          <p className="text-[16px] leading-[1.55] text-lede">
            <Rich text={r} />
          </p>
        </li>
      ))}
    </Armed>
  );
}

export function Stack({ className }: { className?: string }) {
  return (
    <Armed effect="flap" delay={0.2} className={className}>
      <SpecTable rows={[...stack, { label: "SDK build", value: codePage.sdk }]} />
    </Armed>
  );
}
