"use client";

// The Code page console — Cult UI terminal-animation (restyled in src/components/ui) fed with real
// transcripts from console-data.ts. Three tabs: the real build, the solver's answers (computed at
// build time), the tuning OpModes as annotated in the source. Types when scrolled into view;
// reduced motion shows the finished transcript at once (built into the component).

import { useId, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  TerminalAnimationContent,
  TerminalAnimationOutput,
  TerminalAnimationRoot,
  TerminalAnimationTabList,
  TerminalAnimationTabTrigger,
  TerminalAnimationTrailingPrompt,
  TerminalAnimationWindow,
  useTerminalAnimation,
  type TabContent,
} from "@/components/ui/terminal-animation";
import { cn } from "@/lib/utils";
import type { ConsoleLine, ConsoleTab, Tone } from "./console-data";

const TONE: Record<Tone, string> = {
  fg: "text-fg",
  muted: "text-fg-muted",
  dim: "text-fg-muted/70",
  ok: "text-pollen-text",
  strong: "text-fg font-[560]",
};

function Caret() {
  return (
    <span
      aria-hidden="true"
      className="ml-px inline-block h-[15px] w-[7px] translate-y-[3px] animate-caret-blink bg-fg motion-reduce:animate-none"
    />
  );
}

function CommandLine({ tab }: { tab: ConsoleTab }) {
  const { commandTyped, isTypingCommand, showCursor } = useTerminalAnimation();
  const main = commandTyped.slice(0, tab.command.length);
  const rest = commandTyped.slice(tab.command.length);
  return (
    <div className="pl-[2ch] -indent-[2ch] break-words whitespace-pre-wrap">
      <span className="text-fg-muted">{tab.prompt} </span>
      <span className="text-fg">{main}</span>
      {rest && <span className="text-fg-muted/70">{rest}</span>}
      {isTypingCommand && showCursor && <Caret />}
    </div>
  );
}

function Row({ line }: { line: ConsoleLine }) {
  if (!line.segs.length) return <div aria-hidden="true">{" "}</div>;
  return (
    <div className="pl-[2ch] -indent-[2ch] break-words whitespace-pre-wrap">
      {line.segs.map((s, i) => (
        <span key={i} className={TONE[s.tone ?? "fg"]}>
          {s.t}
        </span>
      ))}
    </div>
  );
}

export function Console({ tabs, className }: { tabs: ConsoleTab[]; className?: string }) {
  const uid = useId();
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const tab = tabs[active] ?? tabs[0];

  // The terminal component wants plain text lines; we render rich rows ourselves via renderLine.
  const termTabs: TabContent[] = useMemo(
    () =>
      tabs.map((t) => ({
        label: t.label,
        command: t.command + (t.comment ? `   ${t.comment}` : ""),
        lines: t.lines.map((l) => ({ text: l.segs.map((s) => s.t).join(""), delay: l.delay })),
      })),
    [tabs],
  );

  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;

  return (
    <div className={cn("min-w-0", className)}>
      <TerminalAnimationRoot
        key={run}
        tabs={termTabs}
        activeTab={active}
        onActiveTabChange={setActive}
        hideCursorOnComplete={false}
        className="relative"
      >
        <TerminalAnimationWindow
          animateOnVisible={false}
          minHeight="var(--console-min-h)"
          className="[--console-min-h:31rem] sm:[--console-min-h:27rem] lg:[--console-min-h:25.5rem]"
        >
          {/* title bar */}
          <div className="flex h-11 items-stretch justify-between border-b border-hairline">
            <div className="flex items-stretch">
              <span className="hidden items-center border-r border-hairline px-4 font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase sm:flex">
                Console
              </span>
              <TerminalAnimationTabList className="flex items-stretch" aria-label="Console commands">
                {tabs.map((t, i) => (
                  <TerminalAnimationTabTrigger
                    key={t.id}
                    index={i}
                    id={tabId(i)}
                    aria-controls={panelId}
                    className={cn(
                      "relative min-w-[4.5rem] border-r border-hairline px-4 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors duration-[120ms]",
                      "text-fg-muted hover:bg-surface-2 hover:text-fg data-[state=active]:bg-bg data-[state=active]:text-fg",
                      "outline-offset-[-2px]",
                    )}
                  >
                    {t.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-3 -bottom-px h-px bg-pollen-line transition-opacity duration-[220ms]",
                        i === active ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </TerminalAnimationTabTrigger>
                ))}
              </TerminalAnimationTabList>
            </div>
            <div className="flex min-w-0 items-center gap-1 pr-1.5 pl-3">
              <span className="hidden truncate font-mono text-[11px] text-fg-muted md:inline">{tab.cwd}</span>
              <button
                type="button"
                onClick={() => setRun((r) => r + 1)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                aria-label={`Replay the ${tab.label} transcript`}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <TerminalAnimationContent
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId(active)}
            className="type-code px-4 py-5 text-[12.5px] leading-6 sm:px-6 sm:text-[13px]"
          >
            <CommandLine tab={tab} />
            <TerminalAnimationOutput renderLine={(_line, i, visible) => (visible && tab.lines[i] ? <Row line={tab.lines[i]} /> : null)} />
            <TerminalAnimationTrailingPrompt>
              <span className="text-fg-muted">{tab.prompt} </span>
              <Caret />
            </TerminalAnimationTrailingPrompt>
          </TerminalAnimationContent>
        </TerminalAnimationWindow>
      </TerminalAnimationRoot>

      <div className="mt-4 grid gap-x-[var(--gutter)] gap-y-2 md:grid-cols-[minmax(0,1fr)_auto]">
        <p className="max-w-[78ch] text-[14px] leading-6 text-fg-muted">{tab.caption}</p>
        <p className="font-mono text-[11px] leading-6 tracking-[0.04em] text-fg-muted md:text-right">
          <span className="type-label mr-2">Source</span>
          {tab.source.href ? (
            <a href={tab.source.href} target="_blank" rel="noopener noreferrer" className="link-draw text-fg hover:text-fg">
              {tab.source.label} <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens on GitHub in a new tab)</span>
            </a>
          ) : (
            tab.source.label
          )}
        </p>
      </div>
    </div>
  );
}
