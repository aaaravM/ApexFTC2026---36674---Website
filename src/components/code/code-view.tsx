// CodeView — renders shiki tokens from highlight.ts as our own spans: a monochrome Martian Mono
// listing where weight and contrast carry the syntax, real line numbers from the source file, and
// optional per-line states that client components drive live:
//   "active" → pollen-line bar + raised row (the line the UI is currently "on")
//   "pass"   → ✓ in the status gutter     "fail" → ✕ in the status gutter
//   "dim"    → faded (a path the solver did not take)
// Trimmed regions ("// …" lines in src/content/code.ts) get a ⋮ fold mark instead of a number.
// No hooks: works in Server and Client Components.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CodeLine, TokenKind } from "./highlight";

export type LineState = "active" | "pass" | "fail" | "dim";

const KIND_CLASS: Record<TokenKind, string> = {
  default: "text-fg/80",
  comment: "text-fg-muted",
  keyword: "text-fg font-[560]",
  type: "text-fg",
  function: "text-fg font-[560]",
  number: "text-fg",
  string: "text-lede",
  constant: "text-fg font-[500]",
  punct: "text-fg-muted",
};

const FOLD_RE = /^\s*\/\/ …/;

export const lineText = (line: CodeLine) => line.map((t) => t.c).join("");

/**
 * Gutter numbers. `resume` maps an excerpt line index → the real line number it resumes at after a
 * fold (so numbers stay true to the file); without it, numbering stops at the first fold.
 * `synthetic` marks lines that don't exist in the file (e.g. a closing brace added to an excerpt).
 */
export function gutterNumbers(lines: CodeLine[], startLine?: number, resume?: Record<number, number>, synthetic?: number[]) {
  const out: (number | "fold" | null)[] = [];
  let n = startLine ?? null;
  let stopped = false;
  lines.forEach((line, i) => {
    if (resume && resume[i] !== undefined) {
      n = resume[i];
      stopped = false;
    }
    if (FOLD_RE.test(lineText(line))) {
      out.push("fold");
      stopped = !resume;
      n = null;
      return;
    }
    if (synthetic?.includes(i) || stopped || n === null) {
      out.push(null);
      if (n !== null) n++;
      return;
    }
    out.push(n);
    n++;
  });
  return out;
}

export interface CodeViewProps {
  lines: CodeLine[];
  /** First line's number in the source file. */
  startLine?: number;
  resume?: Record<number, number>;
  synthetic?: number[];
  /** Per-line state (client components compute this live). */
  states?: (LineState | undefined)[];
  /** Inline notes rendered at the end of a line (e.g. "→ 2,391 rpm"). */
  notes?: Record<number, ReactNode>;
  /** Show the ✓/✕ status gutter. */
  statusGutter?: boolean;
  className?: string;
  /** Accessible label for the listing. */
  label?: string;
  id?: string;
}

export function CodeView({ lines, startLine, resume, synthetic, states, notes, statusGutter, className, label, id }: CodeViewProps) {
  const gutter = gutterNumbers(lines, startLine, resume, synthetic);
  return (
    <pre
      id={id}
      aria-label={label}
      tabIndex={0}
      className={cn("type-code overflow-x-auto py-4 text-fg outline-offset-[-2px] [scrollbar-width:thin]", className)}
    >
      <code className="block min-w-max">
        {lines.map((line, i) => {
          const state = states?.[i];
          const g = gutter[i];
          const empty = line.every((t) => t.c.trim() === "");
          return (
            <span
              key={i}
              data-line={typeof g === "number" ? g : undefined}
              data-state={state}
              className={cn(
                "relative grid items-baseline pr-6 transition-[background-color,opacity] duration-[220ms] ease-out motion-reduce:transition-none",
                statusGutter ? "grid-cols-[1.75rem_3.25rem_1fr]" : "grid-cols-[3.25rem_1fr]",
                state === "active" && "bg-surface-2",
                state === "dim" && "opacity-40",
              )}
            >
              {state === "active" && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-pollen-line" />}
              {statusGutter && (
                <span aria-hidden="true" className="pl-3 text-[11px] select-none">
                  {state === "pass" ? <span className="text-fg">✓</span> : state === "fail" ? <span className="text-fg-muted">✕</span> : null}
                </span>
              )}
              <span aria-hidden="true" className="pr-4 text-right text-[11px] text-fg-muted/60 tabular-nums select-none">
                {g === "fold" ? "⋮" : g ?? ""}
              </span>
              <span className="whitespace-pre">
                {empty ? (
                  " "
                ) : (
                  line.map((t, j) => (
                    <span key={j} className={KIND_CLASS[t.k]}>
                      {t.c}
                    </span>
                  ))
                )}
                {notes?.[i] !== undefined && (
                  <span className="ml-4 inline-block font-mono text-[11px] tracking-[0.02em] whitespace-nowrap text-fg-muted">{notes[i]}</span>
                )}
              </span>
            </span>
          );
        })}
      </code>
    </pre>
  );
}

export interface CodeFigureProps {
  title: string;
  /** Path shown in the caption, e.g. "util/Ballistics.java · L135–159". */
  meta: string;
  href?: string;
  children: ReactNode;
  className?: string;
  /** Extra row under the caption (live readouts, legends). */
  aside?: ReactNode;
}

/** Hairline frame + caption for a listing ("title ……… file · L134 ↗"). */
export function CodeFigure({ title, meta, href, children, className, aside }: CodeFigureProps) {
  return (
    <figure className={cn("min-w-0 border border-hairline bg-surface-1", className)}>
      <figcaption className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-hairline px-4 py-2">
        <span className="font-mono text-[12px] text-fg">{title}</span>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="link-draw font-mono text-[11px] tracking-[0.04em] text-fg-muted hover:text-fg"
          >
            {meta} <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens the file on GitHub in a new tab)</span>
          </a>
        ) : (
          <span className="font-mono text-[11px] tracking-[0.04em] text-fg-muted">{meta}</span>
        )}
      </figcaption>
      {aside}
      {children}
    </figure>
  );
}
