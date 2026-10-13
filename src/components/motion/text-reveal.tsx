"use client";

// TextReveal — headings rise out of a mask, character by character or word by word.
//   <TextReveal as="h1" text="Meet the team." immediate />          // hero: plays on load
//   <TextReveal as="h2" text="The people behind APEX-R1." />         // plays when scrolled into view
//   <TextReveal as="p" mode="words" text="…" stagger={0.02} />
// Screen readers get the plain text (sr-only copy); the animated copy is aria-hidden.
// Plain strings only — keep inline markup (e.g. <Mark/>) outside the animated text.

import { useRef, type CSSProperties, type ElementType } from "react";
import { cn } from "@/lib/utils";
import "./motion.css";
import { useArm } from "./use-arm";

export interface TextRevealProps {
  text: string;
  as?: ElementType;
  /** "chars" for short display lines, "words" for longer text. Default: chars when ≤ 40 characters. */
  mode?: "chars" | "words";
  immediate?: boolean;
  /** Seconds before the first unit moves. */
  delay?: number;
  /** Seconds between units (default 0.028 chars / 0.05 words). */
  stagger?: number;
  /** Seconds each unit takes (default 0.9). */
  duration?: number;
  className?: string;
  id?: string;
  /** Fraction of the viewport bottom ignored before triggering (default 0.12). Use 0 for text that
   *  sits at the very end of the page (e.g. the footer wordmark), which can never get higher. */
  inset?: number;
}

export function TextReveal({
  text,
  as: Tag = "span",
  mode,
  immediate,
  delay = 0,
  stagger,
  duration = 0.9,
  className,
  id,
  inset,
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);
  useArm(ref, { immediate, inset });

  const unitMode = mode ?? (text.length <= 40 ? "chars" : "words");
  const step = stagger ?? (unitMode === "chars" ? 0.028 : 0.05);
  const words = text.split(" ");
  let i = 0;

  const style = {
    "--m-delay": `${delay}s`,
    "--m-stagger": `${step}s`,
    "--m-dur": `${duration}s`,
  } as CSSProperties;

  return (
    <Tag ref={ref} id={id} className={cn("m-text", className)} style={style} data-m={immediate ? "play" : undefined}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <span key={w}>
            <span className="m-word">
              {unitMode === "words" ? (
                <span className="m-mask">
                  <span className="m-unit" style={{ "--i": i++ } as CSSProperties}>
                    {word}
                  </span>
                </span>
              ) : (
                Array.from(word).map((ch, c) => (
                  <span key={c} className="m-mask">
                    <span className="m-unit" style={{ "--i": i++ } as CSSProperties}>
                      {ch}
                    </span>
                  </span>
                ))
              )}
            </span>
            {w < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}

// StretchIn — Hubot's width axis opens from narrow to wide once ("spreads its wings").
// Use on a single display line (it changes the text's width while animating).
//   <StretchIn as="h1" from="80%" to="112%" immediate className="font-display …">APEX-R1.</StretchIn>
export function StretchIn({
  children,
  as: Tag = "span",
  from = "78%",
  to = "112%",
  immediate,
  className,
}: {
  children: React.ReactNode;
  as?: ElementType;
  from?: string;
  to?: string;
  immediate?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useArm(ref, { immediate });
  return (
    <Tag
      ref={ref}
      className={cn("m-stretch", className)}
      style={{ "--m-from": from, "--m-to": to } as CSSProperties}
      data-m={immediate ? "play" : undefined}
    >
      {children}
    </Tag>
  );
}
