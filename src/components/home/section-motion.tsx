"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Motion for the three sections after the story (USER-REQUIREMENTS #7c). The team asked for more
// animation there because "it's all the same line swipe", so each section gets its own:
//   THE TEAM          FocusText (words pull into focus like a lens) · Tally (a headcount: one
//                     tick per student, the figure counting with the ticks) · the portrait strip
//                     flips down like a split-flap board (CSS on <Arm className="home-flip">)
//   THE DRAWING SET   PlotText (the heading is plotted letter by letter behind a pen caret) ·
//                     SheetStack (the sheets fan out from a stack; each sheet number re-plots as
//                     it lands and on hover) · registration marks frame the hovered sheet (CSS)
//   FOUNDING PARTNER  (home-sponsor.tsx) the title's width axis opens, the tier figures roll on
//                     odometer wheels, the OPEN SLOT chips stamp down, an open slot's outline
//                     marches on hover (CSS on <Arm className="home-tiers">)
// Every component renders its FINAL state on the server; the motion kit's useArm hides it below
// the fold and plays it when it is scrolled to; reduced motion never arms anything (and home.css
// neutralises every state). Styles: home.css.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useArm } from "@/components/motion";
import { cn } from "@/lib/utils";
import { scrambleText } from "./chapter-reveal";
import "./home.css";

const vars = (v: Record<string, string | number>) => v as CSSProperties;

/** Generic trigger: data-m="armed" below the fold, "play" once scrolled to (CSS does the rest). */
export function Arm({
  as: Tag = "div",
  className,
  style,
  children,
  inset = 0.1,
}: {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** Fraction of the viewport bottom ignored before it plays. */
  inset?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useArm(ref, { inset });
  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}

/** Words pull into focus left → right (blur → sharp), like a lens finding the subject. */
export function FocusText({
  text,
  as: Tag = "span",
  id,
  className,
  delay = 0,
  stagger = 0.06,
}: {
  text: string;
  as?: ElementType;
  id?: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useArm(ref, { inset: 0.12 });
  const words = text.split(" ");
  return (
    <Tag ref={ref} id={id} className={cn("home-focus", className)} style={vars({ "--fd": `${delay}s`, "--fs": `${stagger}s` })}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <Fragment key={i}>
            <span className="home-focus-w" style={vars({ "--i": i })}>
              {w}
            </span>
            {i < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}

/** A heading plotted letter by letter behind a pen caret, which blinks twice when it is done. */
export function PlotText({
  text,
  as: Tag = "span",
  id,
  className,
  delay = 0,
  speed = 0.045,
}: {
  text: string;
  as?: ElementType;
  id?: string;
  className?: string;
  delay?: number;
  /** Seconds per character. */
  speed?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useArm(ref, { inset: 0.12 });
  const words = text.split(" ");
  let i = 0;
  return (
    <Tag
      ref={ref}
      id={id}
      className={cn("home-plot", className)}
      style={vars({ "--pd": `${delay}s`, "--ps": `${speed}s`, "--pn": text.length })}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, wi) => (
          <Fragment key={wi}>
            <span className="home-plot-w">
              {Array.from(w).map((ch) => {
                const k = i++;
                return (
                  <span key={k} className="home-plot-c" style={vars({ "--i": k })}>
                    {ch}
                  </span>
                );
              })}
              {wi === words.length - 1 && <span className="home-plot-caret" />}
            </span>
            {wi < words.length - 1 ? (
              <span className="home-plot-c" style={vars({ "--i": i++ })}>
                {" "}
              </span>
            ) : null}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}

/** A headcount: one tick per person (grouped in fives); the figure counts as the ticks land. */
export function Tally({ value, delay = 0, step = 0.05 }: { value: number; delay?: number; step?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);
  useArm(ref, {
    inset: 0.08,
    onArm: () => {
      if (num.current) num.current.textContent = "0";
    },
    onPlay: () => {
      const el = num.current;
      if (!el) return;
      const t0 = performance.now() + delay * 1000 + 140; // a tick reads as "landed" ~140 ms in
      const tick = (now: number) => {
        const shown = Math.max(0, Math.min(value, Math.floor((now - t0) / (step * 1000)) + 1));
        el.textContent = String(shown);
        if (shown < value) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    },
  });
  useEffect(() => {
    const el = num.current;
    return () => {
      // hidden mid-count (route kept alive by Activity): never leave a partial figure behind
      cancelAnimationFrame(raf.current);
      if (el) el.textContent = String(value);
    };
  }, [value]);
  return (
    <span ref={ref} className="home-tally" style={vars({ "--td": `${delay}s`, "--ts": `${step}s` })}>
      <span className="sr-only">{value}</span>
      <span ref={num} aria-hidden="true">
        {value}
      </span>
      <span aria-hidden="true" className="home-tally-ticks">
        {Array.from({ length: value }, (_, k) => (
          <i key={k} style={vars({ "--k": k })} />
        ))}
      </span>
    </span>
  );
}

/**
 * The drawing set: every sheet starts stacked under the first one and fans out to its place; each
 * sheet number ([data-dwg]) re-plots as its sheet lands, and again when the sheet is hovered or
 * focused. Children are <li> rows with `--k` (their index) set.
 */
export function SheetStack({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLOListElement>(null);
  const stack = () => {
    const ol = ref.current;
    if (!ol) return;
    const rows = Array.from(ol.children) as HTMLElement[];
    const first = rows[0];
    if (!first) return;
    // bottom-aligned under sheet 1: a taller sheet pokes out above the list, where it is clipped
    const bottom = first.offsetTop + first.offsetHeight;
    rows.forEach((li) => li.style.setProperty("--off", `${bottom - (li.offsetTop + li.offsetHeight)}px`));
  };
  useArm(ref, {
    inset: 0.1,
    onArm: stack,
    onPlay: () => {
      stack(); // fonts / resizes since arming
      ref.current?.querySelectorAll<HTMLElement>("[data-dwg]").forEach((el, k) => scrambleText(el, 0.45, 0.42 + k * 0.05));
    },
  });

  useEffect(() => {
    const ol = ref.current;
    if (!ol) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onEnter = (e: Event) => {
      if (reduce.matches) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !ol.contains(a)) return;
      const from = (e as PointerEvent).relatedTarget as Node | null;
      if (e.type === "pointerover" && from && a.contains(from)) return; // moving inside the same sheet
      const el = a.querySelector<HTMLElement>("[data-dwg]");
      if (el) scrambleText(el, 0.42);
    };
    ol.addEventListener("pointerover", onEnter);
    ol.addEventListener("focusin", onEnter);
    return () => {
      ol.removeEventListener("pointerover", onEnter);
      ol.removeEventListener("focusin", onEnter);
    };
  }, []);

  return (
    <ol ref={ref} className={cn("home-sheets", className)}>
      {children}
    </ol>
  );
}
