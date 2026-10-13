"use client";

// Typewriter — the solver's failReason types itself out, character by character, with a block
// caret, once the printout line holding it has printed (solver-printout.tsx).
//   • Server HTML is the full text (no JS → finished printout).
//   • Untyped characters stay in the layout as transparent text, so nothing reflows while typing.
//   • Screen readers get the whole string once (sr-only); the animated copy is aria-hidden.
//   • Reduced motion: the full text, no caret, no timers.

import { useLayoutEffect, useRef, useState } from "react";

export function Typewriter({
  text,
  delay = 1.2,
  cps = 34,
}: {
  text: string;
  /** Seconds after the line scrolls into view before the first character. */
  delay?: number;
  /** Characters per second. */
  cps?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(text.length);
  const [typing, setTyping] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setCount(0);
    let timer = 0;
    let interval = 0;
    const start = () => {
      timer = window.setTimeout(() => {
        setTyping(true);
        interval = window.setInterval(() => {
          setCount((c) => {
            if (c + 1 >= text.length) {
              window.clearInterval(interval);
              window.setTimeout(() => setTyping(false), 900);
              return text.length;
            }
            return c + 1;
          });
        }, 1000 / cps);
      }, delay * 1000);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        start();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
      window.clearInterval(interval);
      setCount(text.length);
      setTyping(false);
    };
  }, [text, delay, cps]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true">
        {text.slice(0, count)}
        {typing && (
          <span className="relative inline-block h-[1.05em] w-[0.6em] translate-y-[0.15em] bg-fg align-baseline [margin-right:-0.6em]" />
        )}
        <span className="text-transparent">{text.slice(count)}</span>
      </span>
    </>
  );
}
