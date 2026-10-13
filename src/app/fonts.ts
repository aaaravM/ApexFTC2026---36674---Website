// ─────────────────────────────────────────────────────────────────────────────
// FONTS — three OFL families, self-hosted at build time by next/font.
//   display → Hubot Sans  (wordmark, H1, H2)        CSS var --ff-display → Tailwind `font-display`
//   text    → Mona Sans   (body, h3, UI)            CSS var --ff-text    → Tailwind `font-sans`
//   mono    → Martian Mono (labels, data, code)     CSS var --ff-mono    → Tailwind `font-mono`
// All three are variable on the width axis (wdth); use `font-stretch` (e.g. `font-stretch-125%`).
// The CSS variable names deliberately differ from the Tailwind theme keys (--font-*), otherwise
// the theme variable would reference itself and every page would fall back to the browser serif.
// ─────────────────────────────────────────────────────────────────────────────
import { Hubot_Sans, Martian_Mono, Mona_Sans } from "next/font/google";

export const display = Hubot_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  // Upright only: next/font preloads every file of a preloaded subset, so an italic here would add
  // ~95 KB to every page (DESIGN_SPEC §10 ERRATA #6). FIRST® uses the Mona italic below.
  variable: "--ff-display",
  display: "swap",
});

export const text = Mona_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--ff-text",
  display: "swap",
});

// FIRST® must always be italic. A SEPARATE, non-preloaded instance, used only by the FIRST mark
// (.mark-first in globals.css) — fetched on first use instead of on every page load.
export const textItalic = Mona_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  style: "italic",
  preload: false,
  variable: "--ff-text-italic",
  display: "swap",
});

export const mono = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--ff-mono",
  display: "swap",
});

/** Space-separated class list that defines all the font CSS variables (put it on <html>). */
export const fontVariables = `${display.variable} ${text.variable} ${textItalic.variable} ${mono.variable}`;
