"use client";

/**
 * Skiper 31 — "Text Scroll animation" (ScrollAnimation_002), from Skiper UI (free tier).
 * Author: @gurvinder-singh02 · https://skiper-ui.com · Attribution to Skiper UI is required for
 * the free version (credited in the site footer colophon).
 *
 * Adapted for Apex Robotics: framer-motion → motion/react; the demo page (its own ReactLenis,
 * macOS icon images, Geist font) is removed — the site's root Lenis drives the scroll. What's left
 * is the mechanic as a reusable component:
 *
 *   <ScrollCharacters text="The people behind APEX-R1." as="h2" className="type-h2" />
 *     letters start spread out (and tipped back in X) and converge as the block scrolls in.
 *   <ScrollCharacters text="APEX ROBOTICS" mode="disperse" … />
 *     the inverse: letters fly apart from the centre as the block scrolls out (the home agent can
 *     use the per-letter vectors as a starting point for "the name disappears into the robot").
 *
 * a11y: one sr-only copy of the text; the animated letters are aria-hidden.
 * Reduced motion: plain static text.
 */

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import React, { useRef } from "react";

import { cn } from "@/lib/utils";

type CharacterProps = {
  char: string;
  index: number;
  centerIndex: number;
  scrollYProgress: MotionValue<number>;
  /** px of horizontal spread per letter of distance from the centre. */
  spread?: number;
  mode?: "converge" | "disperse";
};

/** The original Skiper character (spread + rotateX), parameterised. */
export const CharacterV1 = ({ char, index, centerIndex, scrollYProgress, spread = 50, mode = "converge" }: CharacterProps) => {
  const isSpace = char === " ";
  const d = index - centerIndex;
  const range = mode === "converge" ? [0, 0.5] : [0.5, 1];
  const from = mode === "converge" ? 1 : 0;
  const to = mode === "converge" ? 0 : 1;
  const x = useTransform(scrollYProgress, range, [d * spread * from, d * spread * to]);
  const rotateX = useTransform(scrollYProgress, range, [d * 50 * from, d * 50 * to]);
  const opacity = useTransform(scrollYProgress, range, mode === "converge" ? [0.2, 1] : [1, 0]);

  return (
    <motion.span aria-hidden="true" className={cn("inline-block", isSpace && "w-[0.3em]")} style={{ x, rotateX, opacity }}>
      {isSpace ? " " : char}
    </motion.span>
  );
};

type Tag = "h1" | "h2" | "h3" | "p" | "div" | "span";

export interface ScrollCharactersProps {
  text: string;
  as?: Tag;
  className?: string;
  spread?: number;
  mode?: "converge" | "disperse";
  id?: string;
}

export function ScrollCharacters({ text, as = "h2", className, spread = 40, mode = "converge", id }: ScrollCharactersProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: mode === "converge" ? ["start end", "center center"] : ["center center", "end start"],
  });
  const Tag = as;
  const chars = text.split("");
  const center = Math.floor(chars.length / 2);

  if (reduce) {
    return (
      <Tag id={id} className={className}>
        {text}
      </Tag>
    );
  }

  return (
    <div ref={ref} style={{ perspective: "500px" }}>
      <Tag id={id} className={className}>
        <span className="sr-only">{text}</span>
        {chars.map((c, i) => (
          <CharacterV1 key={i} char={c} index={i} centerIndex={center} scrollYProgress={scrollYProgress} spread={spread} mode={mode} />
        ))}
      </Tag>
    </div>
  );
}

/** The original demo, re-pointed at our own copy (not used on the site). */
export const Skiper31 = () => (
  <div className="flex h-[200vh] items-center justify-center">
    <ScrollCharacters text="Twelve students. One machine." className="type-h2" />
  </div>
);

export default ScrollCharacters;
