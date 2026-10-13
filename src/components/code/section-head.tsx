// Section opener for the Code page: [ NN / LABEL ] rule, H2 + lede on the left, the files it was
// drawn from on the right (every section cites its source). Server component; the motion layer
// (label decode, rule draw, heading rise, lede/source stagger) comes from the shared motion kit,
// which renders the final state on the server and is static under reduced motion.

import type { ReactNode } from "react";
import { LineDraw, Scramble, TextReveal } from "@/components/motion";
import { Stagger, StaggerItem } from "@/components/code/motion-safe";
import { bracketLabel } from "@/components/site/section-label";
import { cn } from "@/lib/utils";

export interface SourceRef {
  label: string;
  href?: string;
}

/** Mono "[ NN / LABEL ]" that decodes in, with a hairline rule that draws to the right. */
export function CodeLabel({
  index,
  label,
  as: Tag = "p",
  id,
  immediate,
  className,
}: {
  index?: string;
  label: string;
  as?: "p" | "h2" | "div";
  id?: string;
  immediate?: boolean;
  className?: string;
}) {
  const text = bracketLabel(index, label);
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Tag id={id} className="type-label shrink-0 text-fg-muted">
        <Scramble text={text} hover immediate={immediate} />
      </Tag>
      <LineDraw className="min-w-0 flex-1 text-hairline" delay={0.15} immediate={immediate} />
    </div>
  );
}

export interface SectionHeadProps {
  index: string;
  label: string;
  /** id of the H2 (prefix per page). */
  id: string;
  /** Plain text so it can rise in letter by letter. */
  title: string;
  /** Static inline markup before the animated title (e.g. a <Mark/> that must keep its ™). */
  titleLead?: ReactNode;
  lede?: ReactNode;
  sources?: SourceRef[];
  className?: string;
}

export function SectionHead({ index, label, id, title, titleLead, lede, sources, className }: SectionHeadProps) {
  return (
    <header className={cn("grid gap-x-[var(--gutter)] gap-y-8 lg:grid-cols-12", className)}>
      <CodeLabel index={index} label={label} className="lg:col-span-12" />
      <div className="min-w-0 lg:col-span-8">
        <h2 id={id} className="type-h2 max-w-[22ch]">
          {titleLead}
          {titleLead ? " " : null}
          <TextReveal text={title} mode={title.length > 34 ? "words" : "chars"} />
        </h2>
        {lede && (
          <Stagger delay={0.25}>
            <StaggerItem>
              <p className="type-lede mt-5 max-w-[60ch]">{lede}</p>
            </StaggerItem>
          </Stagger>
        )}
      </div>
      {sources && sources.length > 0 && (
        <div className="min-w-0 lg:col-span-3 lg:col-start-10 lg:self-end">
          <p className="type-label text-fg-muted">
            <Scramble text="Drawn from" hover />
          </p>
          <Stagger as="ul" className="mt-2 space-y-1" delay={0.35}>
            {sources.map((s) => (
              <StaggerItem as="li" key={s.label} className="font-mono text-[11.5px] leading-5 [overflow-wrap:anywhere]">
                {s.href ? (
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="link-draw text-fg-muted hover:text-fg">
                    {s.label} <span aria-hidden="true">↗</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="text-fg-muted">{s.label}</span>
                )}
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      )}
    </header>
  );
}
