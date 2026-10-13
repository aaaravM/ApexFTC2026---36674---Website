// Links page "general notes" — set like the numbered notes block on an engineering drawing.
// Note 4 (#links-newtab-note) doubles as the accessible description of every link row.
// Server Component (so <Mark> tracks the FIRST® symbol per page). The label decodes, the rule draws
// and the notes print one after another, like a plotter, when scrolled to (motion kit).

import { Mark } from "@/components/brand/mark";
import type { CSSProperties } from "react";
import { LineDraw, Scramble } from "@/components/motion";
import { RevealSeq } from "./reveal-seq";
import { LINKS_CHECKED } from "./link-data";

export function LinksNotes() {
  const notes = [
    {
      id: undefined,
      body: (
        <>
          Every link was opened and checked — the page loads and its title matches — on{" "}
          <span className="font-mono text-[13px] text-fg tabular-nums">{LINKS_CHECKED}</span>.
        </>
      ),
    },
    {
      id: undefined,
      body: (
        <>
          <span className="font-mono text-[12px] tracking-[0.08em] text-fg">OFFICIAL</span> marks resources published by{" "}
          <Mark id="first" symbol={false} />.
        </>
      ),
    },
    {
      id: undefined,
      body: <>We link the Competition Manual instead of re-hosting it, so the link always opens the latest revision.</>,
    },
    { id: "links-newtab-note", body: <>Links open in a new tab.</> },
  ];

  return (
    <aside aria-labelledby="links-notes-title" className="pt-4">
      <div className="flex items-center gap-4">
        <h2 id="links-notes-title" className="type-label shrink-0 text-fg-muted">
          <span aria-hidden="true">
            <Scramble text="[ Notes ]" hover />
          </span>
          <span className="sr-only">Notes</span>
        </h2>
        <LineDraw delay={0.1} className="flex-1 text-hairline" />
      </div>
      <RevealSeq as="ol" className="mt-6 grid gap-x-[var(--gutter)] gap-y-5 sm:grid-cols-2">
        {notes.map((note, i) => (
          <li key={i} style={{ "--i": i } as CSSProperties} className="lk-print grid grid-cols-[1.75rem_minmax(0,1fr)] text-[14px] leading-6 text-fg-muted">
            <span aria-hidden="true" className="font-mono text-[11px] leading-6 text-fg-muted tabular-nums">
              {i + 1}.
            </span>
            <span id={note.id}>{note.body}</span>
          </li>
        ))}
      </RevealSeq>
    </aside>
  );
}
