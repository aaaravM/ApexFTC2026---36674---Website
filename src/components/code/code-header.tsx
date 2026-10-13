// The Code page's opening (DESIGN_SPEC §3 PageHeader pattern, with the motion kit on top):
// the eyebrow decodes, its rule draws, the H1 rises letter by letter on first paint, the lede and
// actions follow, and the title block's real counts tick up. Everything renders its final state on
// the server; reduced motion shows it static. Server component.

import type { CSSProperties, ReactNode } from "react";
import { CountUp, Magnetic, RollText, TextReveal } from "@/components/motion";
import { ButtonLink } from "@/components/site/button";
import { TitleBlock, type TitleBlockItem } from "@/components/site/page-header";
import { CONTENT_UPDATED } from "@/content/site";
import "./code-motion.css";
import { CodeLabel } from "./section-head";

const rise = (s: number) => ({ "--code-delay": `${s}s` }) as CSSProperties;

export interface CodeHeaderAction {
  href: string;
  label: string;
  external?: boolean;
  variant?: "primary" | "secondary";
}

export function CodeHeader({
  title,
  titleId,
  lede,
  actions,
  files,
  lines,
  meta,
}: {
  title: string;
  titleId: string;
  lede: ReactNode;
  actions: CodeHeaderAction[];
  /** Real repo counts for the title block. */
  files: number;
  lines: number;
  meta: TitleBlockItem[];
}) {
  const items: TitleBlockItem[] = [
    { label: "DWG", value: "DWG-005" },
    { label: "REV", value: "A" },
    { label: "UPDATED", value: CONTENT_UPDATED },
    ...meta,
    {
      label: "TeamCode",
      value: (
        <>
          <CountUp value={files} immediate duration={1.1} /> files · <CountUp value={lines} immediate duration={1.4} /> lines
        </>
      ),
    },
  ];

  return (
    <header className="container-page pt-[calc(var(--header-h)+clamp(48px,9vw,128px))] pb-[clamp(48px,7vw,96px)]">
      <CodeLabel index="05" label="CODE" immediate />
      <TextReveal as="h1" id={titleId} text={title} immediate delay={0.1} className="type-display mt-8 max-w-[18ch] sm:mt-10" />
      <p className="type-lede code-rise mt-6 sm:mt-8" style={rise(0.45)}>
        {lede}
      </p>
      <div className="code-rise mt-8 flex flex-wrap items-center gap-x-6 gap-y-3" style={rise(0.55)}>
        {actions.map((a) => (
          <Magnetic key={a.href}>
            <ButtonLink href={a.href} external={a.external} variant={a.variant}>
              <RollText>{a.label}</RollText>
            </ButtonLink>
          </Magnetic>
        ))}
      </div>
      <div className="code-rise" style={rise(0.65)}>
        <TitleBlock items={items} className="mt-10 sm:mt-14" />
      </div>
    </header>
  );
}
