// ─────────────────────────────────────────────────────────────────────────────
// Chapter entrance motion for the home story. The motion kit's components play once when they
// scroll into view, but the story's chapter panels are pinned and faded by scroll, so their
// entrances are driven by home-story.tsx instead: it ARMS a panel while it is hidden and PLAYS it
// as the panel appears — every time, in both scroll directions.
//
// Markup contract (written by chapter-content.tsx, server-rendered in its FINAL state):
//   [data-hr]          motion-kit CSS effects (m-text heading rise, m-line rule draw) or
//   [data-hr="fade"]   a rise + fade (home.css) — `--hd` sets its delay
//   [data-scramble]    mono label that decodes left → right (telemetry feel)
//   [data-count]       a real figure that counts up from zero; `data-final` holds the text
// Reduced motion: never armed (home-story.tsx), and every CSS state is neutralised.
// ─────────────────────────────────────────────────────────────────────────────

import { animate } from "motion/react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#·-_";
const NUM = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Cancels whatever JS effect is running on an element. */
const running = new WeakMap<Element, () => void>();
const stop = (el: Element) => {
  running.get(el)?.();
  running.delete(el);
};

/** Original text of every text node we touch (restored at the end of a scramble). */
const original = new WeakMap<Text, string>();

function textNodes(el: HTMLElement): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement?.closest(".sr-only")) continue;
    out.push(n as Text);
  }
  return out;
}

/**
 * Decode an element's text left → right (keeps nested markup such as <Mark/> intact).
 * `delay` and `duration` in seconds.
 */
export function scrambleText(el: HTMLElement, duration = 0.6, delay = 0) {
  stop(el);
  const nodes = textNodes(el);
  const src = nodes.map((n) => {
    if (!original.has(n)) original.set(n, n.data);
    return Array.from(original.get(n)!);
  });
  const total = Math.max(1, src.reduce((s, t) => s + t.length, 0));
  const restore = () => nodes.forEach((n) => (n.data = original.get(n) ?? n.data));
  let raf = 0;
  let start = -1;
  const tick = (now: number) => {
    if (start < 0) start = now + delay * 1000;
    const t = Math.max(0, Math.min(1, (now - start) / (duration * 1000)));
    let k = 0;
    nodes.forEach((n, j) => {
      let s = "";
      for (const ch of src[j]) {
        const i = k++;
        if (ch === " " || t >= (i + 1) / total) s += ch;
        else if (t < (i / total) * 0.35) s += ch === "[" || ch === "]" ? ch : "·";
        else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      if (n.data !== s) n.data = s;
    });
    if (t < 1) raf = requestAnimationFrame(tick);
    else {
      restore();
      running.delete(el);
    }
  };
  raf = requestAnimationFrame(tick);
  running.set(el, () => {
    cancelAnimationFrame(raf);
    restore();
  });
}

/** Every number in `text` scaled by p (decimals and thousands grouping preserved). */
function scaled(text: string, p: number) {
  return text.replace(NUM, (m) => {
    const dec = (m.split(".")[1] ?? "").length;
    const v = parseFloat(m.replace(/,/g, "")) * p;
    return m.includes(",")
      ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })
      : v.toFixed(dec);
  });
}

function countFrom0(el: HTMLElement, delay: number) {
  stop(el);
  const final = el.dataset.final ?? el.textContent ?? "";
  el.textContent = scaled(final, 0);
  const controls = animate(0, 1, {
    duration: 1.15,
    delay,
    ease: EASE_OUT,
    onUpdate: (p) => {
      el.textContent = scaled(final, p);
    },
    onComplete: () => {
      el.textContent = final;
      running.delete(el);
    },
  });
  running.set(el, () => {
    controls.stop();
    el.textContent = final;
  });
}

/** Hide a panel's animated parts (it is invisible while armed, so nothing flashes). */
export function armReveal(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-hr]").forEach((el) => (el.dataset.m = "armed"));
  root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    stop(el);
    el.textContent = scaled(el.dataset.final ?? el.textContent ?? "", 0);
  });
  root.querySelectorAll<HTMLElement>("[data-scramble]").forEach((el) => stop(el));
}

/** Play a panel's entrance. */
export function playReveal(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-hr]").forEach((el) => (el.dataset.m = "play"));
  root.querySelectorAll<HTMLElement>("[data-scramble]").forEach((el, i) => scrambleText(el, 0.6, i * 0.08));
  root.querySelectorAll<HTMLElement>("[data-count]").forEach((el, i) => countFrom0(el, 0.32 + i * 0.06));
}

/** Back to the static final state (reduced motion switched on mid-session). */
export function clearReveal(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-hr]").forEach((el) => delete el.dataset.m);
  root.querySelectorAll<HTMLElement>("[data-count], [data-scramble]").forEach((el) => stop(el));
  root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    if (el.dataset.final) el.textContent = el.dataset.final;
  });
}
