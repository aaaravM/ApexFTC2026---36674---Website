"use client";

/**
 * Skiper 58 — "Text roll navigation" (TextRoll), from Skiper UI (free tier).
 * Author: @gurvinder-singh02 · https://skiper-ui.com · Attribution to Skiper UI is required for
 * the free version (credited in the site footer colophon).
 *
 * Adapted for Apex Robotics:
 *   • framer-motion → motion/react; demo nav (skiper-ui routes) removed.
 *   • a11y: the two visual copies are aria-hidden; one sr-only copy carries the text.
 *   • can be driven by a parent: <TextRoll inherit> inside a motion element with
 *     whileHover="hovered" / whileFocus="hovered", or controlled with `active`.
 *   • easing → the system ease-in-out; reduced motion is handled by <MotionConfig reducedMotion="user">.
 *
 *   <TextRoll>Robot</TextRoll>                          rolls on its own hover
 *   <TextRoll active={hovered}>Robot</TextRoll>         controlled
 *   <motion.a whileHover="hovered" whileFocus="hovered" initial="initial">
 *     <TextRoll inherit>Robot</TextRoll>
 *   </motion.a>
 */

import { motion } from "motion/react";
import React from "react";

import { cn } from "@/lib/utils";

const STAGGER = 0.025;
const EASE = [0.65, 0, 0.35, 1] as const;

export interface TextRollProps {
  children: string;
  className?: string;
  /** Stagger from the centre outwards instead of left→right. */
  center?: boolean;
  /** Controlled state (overrides hover). */
  active?: boolean;
  /** Take the variant state ("initial" | "hovered") from a parent motion element. */
  inherit?: boolean;
}

export const TextRoll: React.FC<TextRollProps> = ({ children, className, center = false, active, inherit = false }) => {
  const letters = children.split("");
  const delayFor = (i: number) =>
    center ? STAGGER * Math.abs(i - (letters.length - 1) / 2) : STAGGER * i;

  const state =
    inherit
      ? {}
      : active === undefined
        ? { initial: "initial", whileHover: "hovered" }
        : { initial: "initial", animate: active ? "hovered" : "initial" };

  return (
    <motion.span
      {...state}
      className={cn("relative inline-block overflow-hidden align-bottom leading-[1.05]", className)}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" className="block">
        {letters.map((l, i) => (
          <motion.span
            key={i}
            variants={{ initial: { y: 0 }, hovered: { y: "-100%" } }}
            transition={{ ease: EASE, duration: 0.34, delay: delayFor(i) }}
            className="inline-block whitespace-pre"
          >
            {l}
          </motion.span>
        ))}
      </span>
      <span aria-hidden="true" className="absolute inset-0 block">
        {letters.map((l, i) => (
          <motion.span
            key={i}
            variants={{ initial: { y: "100%" }, hovered: { y: 0 } }}
            transition={{ ease: EASE, duration: 0.34, delay: delayFor(i) }}
            className="inline-block whitespace-pre"
          >
            {l}
          </motion.span>
        ))}
      </span>
    </motion.span>
  );
};

/** The original demo, re-pointed at our own pages (not used on the site). */
export const Skiper58 = ({ items }: { items: { name: string; href: string }[] }) => (
  <ul className="flex flex-col items-start gap-2">
    {items.map((item) => (
      <li key={item.href}>
        <a href={item.href} className="font-display text-4xl uppercase">
          <TextRoll>{item.name}</TextRoll>
        </a>
      </li>
    ))}
  </ul>
);
