// PageHeader — the page-opening pattern (DESIGN_SPEC §3): eyebrow "[ 03 / ROBOT ]" + H1 + lede +
// a meta row styled as an engineering title block (DWG-003 · REV A · UPDATED 2026-10-12).
// Left-aligned, never centred. Includes the top offset for the fixed 56px header.
//
//   <PageHeader index="03" section="ROBOT" title="APEX-R1." lede="A turret shooter…"
//     meta={[{ label: "STATUS", value: "IN DEVELOPMENT" }]}>
//     <ButtonLink href="…">…</ButtonLink>          ← optional actions under the lede
//   </PageHeader>
// `title` / `lede` accept ReactNode (use <Mark/> / <MarkText/> for FIRST®). Server-safe.

import type { ReactNode } from "react";
import { LineDraw, Scramble, TextReveal } from "@/components/motion";
import { CONTENT_UPDATED } from "@/content/site";
import { cn } from "@/lib/utils";
import { bracketLabel } from "./section-label";

export interface TitleBlockItem {
  label: string;
  value: ReactNode;
}

export interface PageHeaderProps {
  /** Two-digit page index, e.g. "03". */
  index: string;
  /** Section name in caps, e.g. "ROBOT". */
  section: string;
  title: ReactNode;
  lede?: ReactNode;
  /** Drawing number; defaults to `DWG-0${index}`. */
  dwg?: string;
  rev?: string;
  /** ISO date; defaults to CONTENT_UPDATED from src/content/site.ts. */
  updated?: string;
  /** Extra title-block cells (live counts, status…). */
  meta?: TitleBlockItem[];
  children?: ReactNode;
  className?: string;
  /** id for the H1 (prefix per page — hidden routes stay mounted). */
  titleId?: string;
}

export function TitleBlock({ items, className }: { items: TitleBlockItem[]; className?: string }) {
  return (
    <dl className={cn("flex flex-wrap border-t border-l border-hairline", className)}>
      {items.map((it) => (
        <div key={it.label} className="min-w-[96px] flex-1 border-r border-b border-hairline px-3 py-2 sm:flex-none sm:px-4">
          <dt className="font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">{it.label}</dt>
          <dd className="font-mono text-[12px] leading-5 tracking-[0.02em] text-fg uppercase tabular-nums">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PageHeader({
  index,
  section,
  title,
  lede,
  dwg,
  rev = "A",
  updated = CONTENT_UPDATED,
  meta = [],
  children,
  className,
  titleId,
}: PageHeaderProps) {
  const items: TitleBlockItem[] = [
    { label: "DWG", value: dwg ?? `DWG-${index.padStart(3, "0")}` },
    { label: "REV", value: rev },
    { label: "UPDATED", value: updated },
    ...meta,
  ];
  return (
    <header
      className={cn(
        "container-page pt-[calc(var(--header-h)+clamp(48px,9vw,128px))] pb-[clamp(48px,7vw,96px)]",
        className,
      )}
    >
      {/* motion on load: the eyebrow decodes, its rule draws, a plain-string H1 rises letter by letter */}
      <div className="flex items-center gap-4">
        <Scramble as="p" text={bracketLabel(index, section)} immediate className="type-label shrink-0 text-fg-muted" />
        <LineDraw immediate delay={0.1} className="flex-1 text-hairline" />
      </div>
      <h1 id={titleId} className="type-display mt-8 max-w-[18ch] sm:mt-10">
        {typeof title === "string" ? <TextReveal text={title} immediate delay={0.1} /> : title}
      </h1>
      {lede && <p className="type-lede mt-6 sm:mt-8">{lede}</p>}
      {children && <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">{children}</div>}
      <TitleBlock items={items} className="mt-10 sm:mt-14" />
    </header>
  );
}
