"use client";

// Reveal — the ONE section-level reveal (DESIGN_SPEC §3): a top→bottom clip ("plotter") with a
// 12px rise, at 20% visibility, --dur-medium, --ease-out, once. Most text should stay static —
// use this on whole sections or figures, never on every paragraph, and never above the fold.
//   <Reveal><SpecTable rows={…} /></Reveal>
//   <Reveal as="section" delay={0.08} className="…">…</Reveal>
// Reduced motion: renders static.

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { dur, ease } from "@/lib/motion";

type Tag = "div" | "section" | "article" | "figure" | "li" | "ul" | "aside" | "header" | "footer";

export interface RevealProps {
  children: ReactNode;
  as?: Tag;
  className?: string;
  delay?: number;
  /** Visibility threshold (0–1). Default 0.2. */
  amount?: number;
  id?: string;
}

export function Reveal({ children, as = "div", className, delay = 0, amount = 0.2, id }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Static = as;
    return (
      <Static className={className} id={id}>
        {children}
      </Static>
    );
  }
  const M = motion[as];
  return (
    <M
      id={id}
      className={className}
      initial={{ clipPath: "inset(0% 0% 100% 0%)", y: 12 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)", y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: dur.medium, ease: ease.out, delay }}
    >
      {children}
    </M>
  );
}
