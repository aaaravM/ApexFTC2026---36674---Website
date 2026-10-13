// Motion-layer building blocks shared by /outreach and /sponsors (the team asked for "more
// animations" while keeping the minimal look). All of them compose the shared motion kit
// (src/components/motion), so every effect renders its final state on the server and stays static
// under reduced motion.
//
//   <MotionHeader index="02" section="OUTREACH" title="Engineering in the community." … />
//        the system PageHeader (same metrics as site/page-header.tsx) with the eyebrow decoding,
//        the H1 rising letter by letter on load and the title block's top rule drawing across.
//   <MotionLabel code="02.1" label="ACTIVITY LOG" />   "[ 02.1 / ACTIVITY LOG ]" decodes + rule draws
//   <MotionButtonLink href=… external>View the packet</MotionButtonLink>  rolling label + magnetic lean
// Server-safe (the kit pieces are client components).

import type { ReactNode } from "react";
import { LineDraw, Magnetic, RollText, Scramble, TextReveal } from "@/components/motion";
import { ButtonLink, type ButtonSize, type ButtonVariant } from "@/components/site/button";
import { TitleBlock, type TitleBlockItem } from "@/components/site/page-header";
import { bracketLabel } from "@/components/site/section-label";
import { CONTENT_UPDATED } from "@/content/site";
import { cn } from "@/lib/utils";

const labelClass = "type-label shrink-0 text-fg-muted";

export function MotionLabel({
  code,
  label,
  immediate,
  className,
}: {
  code?: string;
  label: string;
  immediate?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Scramble text={bracketLabel(code, label)} className={labelClass} hover immediate={immediate} />
      <LineDraw className="min-w-0 flex-1 text-hairline" immediate={immediate} delay={immediate ? 0.15 : 0} />
    </div>
  );
}

export interface MotionHeaderProps {
  index: string;
  section: string;
  /** Plain string — it is animated letter by letter (screen readers get the plain text). */
  title: string;
  lede?: ReactNode;
  meta?: TitleBlockItem[];
  titleId?: string;
  children?: ReactNode;
}

export function MotionHeader({ index, section, title, lede, meta = [], titleId, children }: MotionHeaderProps) {
  const items: TitleBlockItem[] = [
    { label: "DWG", value: `DWG-${index.padStart(3, "0")}` },
    { label: "REV", value: "A" },
    { label: "UPDATED", value: CONTENT_UPDATED },
    ...meta,
  ];
  return (
    <header className="container-page pt-[calc(var(--header-h)+clamp(48px,9vw,128px))] pb-[clamp(48px,7vw,96px)]">
      <MotionLabel code={index} label={section} immediate />
      <h1 id={titleId} className="type-display mt-8 max-w-[18ch] sm:mt-10">
        <TextReveal text={title} immediate stagger={0.022} />
      </h1>
      {lede && <p className="type-lede mt-6 sm:mt-8">{lede}</p>}
      {children && <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">{children}</div>}
      <div className="mt-10 sm:mt-14">
        <LineDraw className="text-hairline" immediate delay={0.45} />
        <TitleBlock items={items} className="border-t-0" />
      </div>
    </header>
  );
}

export function MotionButtonLink({
  href,
  children,
  external,
  variant,
  size,
}: {
  href: string;
  children: string;
  external?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Magnetic>
      <ButtonLink href={href} external={external} variant={variant} size={size}>
        <RollText>{children}</RollText>
      </ButtonLink>
    </Magnetic>
  );
}
