// Timing for one rp-fx-* element inside an <Armed> group (./armed.tsx, ./robot-page.css).
// Plain module (no "use client") so server components can call it while rendering.
//
//   <rect className="rp-fx-from rp-svg" style={fx(0.55, 1, { from: "translate(-84px, 0)" })} />

import type { CSSProperties } from "react";

/**
 * delay and duration in seconds, plus the optional start transform (`from`), end transform
 * (`to` — the static final state), easing and step count (rp-fx-clip).
 */
export function fx(delay: number, dur = 0.6, opts: { from?: string; to?: string; ease?: string; steps?: number } = {}): CSSProperties {
  const s: Record<string, string> = { "--rp-delay": `${delay.toFixed(3)}s`, "--rp-dur": `${dur.toFixed(3)}s` };
  if (opts.from) s["--rp-from"] = opts.from;
  if (opts.to) s["--rp-to"] = opts.to;
  if (opts.ease) s["--rp-ease"] = opts.ease;
  if (opts.steps) s["--rp-steps"] = String(opts.steps);
  return s as CSSProperties;
}

/** Index for the CSS row-stagger rules (`--i`). */
export const idx = (i: number) => ({ "--i": i }) as CSSProperties;
