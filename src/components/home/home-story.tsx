"use client";
/* eslint-disable react-hooks/immutability --
   The home story deliberately mutates its shared input bus (bus.input.fire / pointer) and three.js
   objects inside useFrame / motion-value callbacks: per-frame state that must not re-render React.
   The React Compiler is not enabled (next.config.ts), so this rule has no runtime meaning here. */

// ─────────────────────────────────────────────────────────────────────────────
// HomeStory — the user's home choreography (USER-REQUIREMENTS #4, DESIGN_SPEC §5 HOME):
//   a. the name "APEX ROBOTICS" alone on the first screen (server-rendered H1)
//   b. on scroll the letters are pulled into the stage centre while the robot assembles and grows
//      out of that point (scrubbed, reversible); the wings lift into the header's mark
//   c. the pinned robot spins with scroll; its turret counter-rotates to hold its lock
//   d. six chapters — the robot glides to alternating sides (heavy spring) and each chapter's text
//      takes the other half; a panel only shows once the robot has cleared its half
//   e. then the team (rendered after this component by the page)
// One sticky stage, one canvas, one progress source (window scroll → story position `pos`).
// Chapter entrances (chapter-reveal.ts) are armed while a panel is hidden and replayed each time it
// appears: the label decodes, the rule draws, the heading rises, the figures count up.
// Reduced motion: no scrub — CSS switches to the FLOW layout and the robot steps between static
// poses beside each chapter. Mobile (portrait): robot in the top region, text below.
// ─────────────────────────────────────────────────────────────────────────────

import { motion, motionValue, useMotionValueEvent, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLenis } from "lenis/react";
import { ConceptModelCaption } from "@/components/site/concept-model-caption";
import { FIRE_EVENT } from "@/components/site/command-palette";
import { useHeaderOverlay } from "@/components/site/header-state";
import { fmtSigned } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { AimZone } from "./aim-zone";
import { armReveal, clearReveal, playReveal, scrambleText } from "./chapter-reveal";
import { SolverHud } from "./solver-hud";
import {
  AIM_CHAPTER,
  clamp01,
  createStoryBus,
  lerp,
  panelVisibility,
  sideAt,
  step,
  type StoryBus,
  type StoryChapterSpec,
  type StoryLayout,
} from "./story-bus";
import "@/components/motion/motion.css";
import "./home.css";

type RevealState = "static" | "armed" | "play";

const HomeStage = dynamic(() => import("./home-stage"), { ssr: false });

export interface HomeChapterInput {
  spec: StoryChapterSpec;
  /** Server-rendered chapter text (ChapterContent). */
  content: ReactNode;
}

export interface HomeStoryProps {
  intro: ReactNode;
  chapters: HomeChapterInput[];
  /** C5's "Read the code" link, rendered beside the fire control. */
  aimLink?: ReactNode;
}

const SIDES_QUERY = "(orientation: landscape) and (min-width: 600px)";

interface LetterGeo {
  el: HTMLElement;
  dx: number;
  dy: number;
  px: number;
  py: number;
  delay: number;
}

interface Geo {
  top: number;
  bottom: number;
  vh: number;
  vw: number;
  region: number;
  starts: number[];
  lens: number[];
  letters: LetterGeo[];
  wings: { el: HTMLElement; dx: number; dy: number; s: number } | null;
  meta: HTMLElement[];
}

export function HomeStory({ intro, chapters, aimLink }: HomeStoryProps) {
  const [bus] = useState<StoryBus>(createStoryBus);
  const [panels] = useState(() =>
    chapters.map(() => ({ op: motionValue(0), y: motionValue(0), pe: motionValue<"auto" | "none">("none") })),
  );
  const [stageOpacity] = useState(() => motionValue(0));
  const [readoutOpacity] = useState(() => motionValue(0));
  const [readoutX] = useState(() => motionValue(0));
  const side = useSpring(bus.sideTarget, spring.heavy);

  const reduced = useReducedMotion() ?? false;
  const sides = useMediaQuery(SIDES_QUERY, true);
  const layout: StoryLayout = sides ? "sides" : "stack";
  const { resolvedTheme } = useTheme();
  const tone = resolvedTheme === "light" ? "light" : "dark";
  const lenis = useLenis();

  const [active, setActive] = useState(-1);
  const [finished, setFinished] = useState(false);
  const [region, setRegion] = useState(420);
  useHeaderOverlay(!finished);

  const storyRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const articleRefs = useRef<(HTMLElement | null)[]>([]);
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reveal = useRef<RevealState[]>(chapters.map(() => "static"));
  const geo = useRef<Geo | null>(null);
  const pendingFire = useRef(false);

  const sidesList = chapters.map((c) => c.spec.side);
  const sidesKey = sidesList.join(",");

  // ── measurement ─────────────────────────────────────────────────────────────────────────
  const measure = useCallback(() => {
    const story = storyRef.current;
    const pin = pinRef.current;
    const stage = stageRef.current;
    if (!story || !pin || !stage) return;
    const sy = window.scrollY;
    const vw = document.documentElement.clientWidth;
    const top = story.getBoundingClientRect().top + sy;
    const bottom = top + story.offsetHeight;
    const vh = pin.offsetHeight || window.innerHeight;
    const regionPx = probeRef.current?.offsetHeight ?? Math.round(vh * 0.5);
    const starts: number[] = [];
    const lens: number[] = [];
    articleRefs.current.forEach((el) => {
      if (!el) return;
      starts.push(el.getBoundingClientRect().top + sy);
      lens.push(Math.max(1, el.offsetHeight - vh));
    });

    // where the robot appears during the collapse (same formula as the stage camera)
    const headerH = 56;
    const tx = vw / 2;
    const ty = sides ? headerH + (vh - headerH) * 0.5 : headerH + 6 + Math.max(140, regionPx - headerH - 12) / 2;

    // letters: untransformed centres relative to the pinned layer
    const pr = pin.getBoundingClientRect();
    const els = Array.from(pin.querySelectorAll<HTMLElement>("[data-letter]"));
    els.forEach((el) => {
      el.style.transform = "";
      el.style.filter = "";
      el.style.opacity = "";
    });
    let maxD = 1;
    const raw = els.map((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2 - pr.left;
      const cy = r.top + r.height / 2 - pr.top;
      const dx = tx - cx;
      const dy = ty - cy;
      const d = Math.hypot(dx, dy);
      maxD = Math.max(maxD, d);
      return { el, dx, dy, d };
    });
    const letters = raw.map(({ el, dx, dy, d }) => ({
      el,
      dx,
      dy,
      // perpendicular (counter-clockwise) for the swirl
      px: d > 0 ? -dy / d : 0,
      py: d > 0 ? dx / d : 0,
      // the nearest letters are absorbed first, the far ones accelerate in after them
      delay: 0.2 * (d / maxD),
    }));

    // wings → header mark
    let wings: Geo["wings"] = null;
    const hero = pin.querySelector<HTMLElement>("[data-home-wings]");
    const head = document.querySelector<SVGElement>("header .apex-wings");
    if (hero && head) {
      hero.style.transform = "";
      const a = hero.getBoundingClientRect();
      const b = head.getBoundingClientRect();
      wings = {
        el: hero,
        dx: b.left + b.width / 2 - (a.left + a.width / 2 - pr.left),
        dy: b.top + b.height / 2 - (a.top + a.height / 2 - pr.top),
        s: a.width > 0 ? b.width / a.width : 0.25,
      };
    }
    const meta = Array.from(pin.querySelectorAll<HTMLElement>("[data-home-meta], [data-home-cue]"));

    geo.current = { top, bottom, vh, vw, region: regionPx, starts, lens, letters, wings, meta };
    setRegion((r) => (Math.abs(r - regionPx) > 1 ? regionPx : r));
  }, [sides]);

  // ── the driver: window scroll → story position → everything ─────────────────────────────
  const update = useCallback(() => {
    const g = geo.current;
    if (!g || !g.starts.length) return;
    const y = window.scrollY;
    const n = g.starts.length;
    const sideNow = side.get();
    const contentW = Math.min(g.vw, 1440 + 2 * Math.min(56, Math.max(16, g.vw * 0.04)));

    if (reduced) {
      // FLOW: chapter under the reading line → a static pose; no scrub anywhere
      const line = layout === "sides" ? y + g.vh * 0.5 : y + g.region + (g.vh - g.region) * 0.35;
      let ch = -1;
      for (let i = 0; i < n; i++) if (line >= g.starts[i]) ch = i;
      const pos = ch < 0 ? 0.5 : 1 + ch + 0.5;
      bus.pos.set(pos);
      bus.collapse.set(1);
      bus.exit.set(0);
      bus.chapter.set(ch);
      const s = layout === "sides" ? 1 : 0;
      bus.sideTarget.set(s);
      side.jump(s);
      stageOpacity.set(1);
      readoutOpacity.set(ch >= 0 ? 1 : 0);
      readoutX.set(layout === "sides" ? contentW * 0.255 : 0);
      panels.forEach((p, i) => {
        p.op.set(1);
        p.y.set(0);
        p.pe.set("auto");
        const box = boxRefs.current[i];
        if (box && reveal.current[i] !== "static") {
          clearReveal(box);
          reveal.current[i] = "static";
        }
      });
      g.letters.forEach((l) => {
        l.el.style.transform = "";
        l.el.style.opacity = "";
        l.el.style.filter = "";
      });
      if (g.wings) g.wings.el.style.transform = "";
      g.meta.forEach((m) => {
        m.style.opacity = "";
        m.style.transform = "";
      });
      setFinished(y > g.bottom - 56);
      return;
    }

    // collapse: the first viewport of scroll
    const c = clamp01((y - g.top - 0.03 * g.vh) / (0.86 * g.vh));
    let pos: number;
    let ch = -1;
    if (y < g.starts[0]) pos = Math.min(c, 0.999);
    else {
      const lastEnd = g.starts[n - 1] + g.lens[n - 1];
      pos = 1 + n + (y - lastEnd) / g.vh;
      for (let i = 0; i < n; i++) {
        if (y < g.starts[i] + g.lens[i]) {
          pos = 1 + i + (y - g.starts[i]) / g.lens[i];
          ch = i;
          break;
        }
      }
    }
    const exit = step(1 + n, 1 + n + 0.55, pos);
    bus.pos.set(pos);
    bus.collapse.set(c);
    bus.exit.set(exit);
    bus.chapter.set(ch);
    bus.sideTarget.set(layout === "sides" ? sideAt(pos, sidesList) : 0);

    stageOpacity.set(step(0.24, 0.62, c) * (1 - exit));
    readoutOpacity.set(step(0.96, 1.16, pos) * (1 - step(1 + n - 0.02, 1 + n + 0.2, pos)));
    readoutX.set(layout === "sides" ? sideNow * contentW * 0.255 : 0);

    // chapter panels: scroll fade × clearance (the text waits until the robot has left its half)
    panels.forEach((p, i) => {
      const v = panelVisibility(pos, i, i === n - 1);
      const clear = layout === "sides" ? step(0.45, 0.9, sideNow * sidesList[i]) : 1;
      const op = Math.round(v.visible * clear * 1000) / 1000;
      p.op.set(op);
      p.y.set(Math.round(((1 - v.enter) * 28 - v.leave * 28) * 10) / 10);
      p.pe.set(op > 0.5 ? "auto" : "none");
      // entrance: armed while hidden, replayed each time the panel appears (either direction)
      const box = boxRefs.current[i];
      if (box) {
        const state = reveal.current[i];
        if (op > 0.04 && state !== "play") {
          if (state !== "armed") armReveal(box);
          playReveal(box);
          reveal.current[i] = "play";
        } else if (op === 0 && state !== "armed") {
          armReveal(box);
          reveal.current[i] = "armed";
        }
      }
    });

    // the name: every letter on its own vector into the stage centre, accelerating, with a swirl
    g.letters.forEach((l) => {
      const p = clamp01((c - l.delay) / 0.66);
      if (p <= 0) {
        if (l.el.style.transform) {
          l.el.style.transform = "";
          l.el.style.opacity = "";
          l.el.style.filter = "";
        }
        return;
      }
      const e = p * p * (1.4 - 0.4 * p); // accelerating, lands softly at 1
      const swirl = Math.sin(Math.PI * Math.min(1, e)) * 0.14 * Math.hypot(l.dx, l.dy);
      const tx = l.dx * e + l.px * swirl;
      const ty = l.dy * e + l.py * swirl;
      l.el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${(e * 28).toFixed(2)}deg) scale(${(1 - 0.9 * e).toFixed(3)})`;
      l.el.style.opacity = (1 - step(0.55, 1, e)).toFixed(3);
      l.el.style.filter = e > 0.02 ? `blur(${(6 * e).toFixed(2)}px)` : "";
    });
    // wings lift into the header's mark
    if (g.wings) {
      const w = step(0.0, 0.46, c);
      const wi = w * w * (3 - 2 * w);
      g.wings.el.style.transform = w > 0 ? `translate3d(${(g.wings.dx * wi).toFixed(1)}px, ${(g.wings.dy * wi).toFixed(1)}px, 0) scale(${lerp(1, g.wings.s, wi).toFixed(3)})` : "";
      g.wings.el.style.opacity = w > 0 ? (1 - step(0.36, 0.47, c)).toFixed(3) : "";
    }
    const m = step(0, 0.2, c);
    g.meta.forEach((el) => {
      el.style.opacity = m > 0 ? (1 - m).toFixed(3) : "";
      el.style.transform = m > 0 ? `translate3d(0, ${(-14 * m).toFixed(1)}px, 0)` : "";
    });

    setFinished(y > g.bottom - 56);
  }, [bus, side, panels, stageOpacity, readoutOpacity, readoutX, reduced, layout, sidesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // run the driver on scroll, on spring motion (clearance) and on resize
  useLayoutEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };
    const remeasure = () => {
      measure();
      update();
    };
    remeasure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    const ro = new ResizeObserver(remeasure);
    if (storyRef.current) ro.observe(storyRef.current);
    const unsub = side.on("change", schedule);
    // fonts change the wordmark's letter positions
    document.fonts?.ready.then(remeasure).catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      ro.disconnect();
      unsub();
    };
  }, [measure, update, side]);

  useMotionValueEvent(bus.chapter, "change", (v) => setActive(v));

  // the facts line under the name decodes like a telemetry readout as it fades in (first visit to
  // the screen only — if its CSS entrance has already finished, it stays still)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = pinRef.current?.querySelector<HTMLElement>("[data-home-decode]");
    if (!el || typeof el.getAnimations !== "function") return;
    const anim = el.getAnimations().find((a) => (a as CSSAnimation).animationName === "home-rise-in");
    const t = typeof anim?.currentTime === "number" ? anim.currentTime / 1000 : null;
    if (t === null || t > 1.2) return;
    scrambleText(el, 0.95, Math.max(0, 0.62 - t));
  }, []);

  // keyboard focus inside a pinned chapter: scroll to that chapter's reading position
  const focusChapter = useCallback(
    (i: number) => {
      const g = geo.current;
      if (!g || reduced) return;
      const pos = g.starts[i] + g.lens[i] * 0.5;
      const cur = window.scrollY;
      if (Math.abs(cur - pos) < g.lens[i] * 0.3) return;
      if (lenis) lenis.scrollTo(pos, { immediate: true, force: true });
      else window.scrollTo(0, pos);
    },
    [lenis, reduced],
  );

  // ⌘K "Fire POLLEN": fire if we're in C5, otherwise travel there first
  useEffect(() => {
    const onFire = () => {
      if (bus.chapter.get() === AIM_CHAPTER) {
        bus.input.fire += 1;
        return;
      }
      const g = geo.current;
      if (!g) return;
      pendingFire.current = true;
      const pos = g.starts[AIM_CHAPTER] + g.lens[AIM_CHAPTER] * 0.45;
      if (lenis) lenis.scrollTo(pos, { duration: 1.6, force: true });
      else window.scrollTo({ top: pos, behavior: reduced ? "auto" : "smooth" });
    };
    window.addEventListener(FIRE_EVENT, onFire);
    return () => window.removeEventListener(FIRE_EVENT, onFire);
  }, [bus, lenis, reduced]);
  useMotionValueEvent(bus.aimBlend, "change", (v) => {
    if (pendingFire.current && v > 0.95) {
      pendingFire.current = false;
      bus.input.fire += 1;
    }
  });

  const fire = useCallback(() => {
    bus.input.fire += 1;
  }, [bus]);

  const aimSide = chapters[AIM_CHAPTER]?.spec.side ?? 1;

  return (
    <section
      id="home-story"
      ref={storyRef}
      className="home-story"
      aria-labelledby="home-title"
      style={{ "--home-chapters": chapters.length } as React.CSSProperties}
    >
      {/* the name — first in the document; pinned while it collapses */}
      <div className="home-intro">
        <div ref={pinRef} className="home-intro-pin">
          {intro}
        </div>
      </div>

      {/* the stage: one canvas, pinned for the whole story */}
      <div className="home-track" aria-hidden={false}>
        <div ref={stageRef} className="home-stage">
          <div ref={probeRef} className="home-region-probe" aria-hidden="true" />
          <motion.div className="absolute inset-0" style={{ opacity: stageOpacity }}>
            <HomeStage bus={bus} side={side} chapters={chapters.map((c) => c.spec)} layout={layout} reduced={reduced} tone={tone} stackRegion={region} />
          </motion.div>
          <StageReadout bus={bus} opacity={readoutOpacity} x={readoutX} layout={layout} />
          <AimZone bus={bus} active={active === AIM_CHAPTER} layout={layout} side={aimSide} region={region} stageRef={stageRef} />
        </div>
      </div>

      {/* chapters: in flow (find-in-page, focus, screen readers); panels pin and fade in place */}
      {chapters.map((c, i) => (
        <article
          key={c.spec.id}
          id={`home-${c.spec.id}`}
          ref={(el) => {
            articleRefs.current[i] = el;
          }}
          className="home-chapter"
          data-side={c.spec.side === 1 ? "right" : "left"}
          aria-labelledby={`home-${c.spec.id}-title`}
          onFocusCapture={() => focusChapter(i)}
        >
          <div className="home-pin">
            <div className="home-row container-page">
              <motion.div
                ref={(el: HTMLDivElement | null) => {
                  boxRefs.current[i] = el;
                }}
                className="home-box"
                style={{ opacity: panels[i].op, y: panels[i].y, pointerEvents: panels[i].pe }}
              >
                {c.content}
                {i === AIM_CHAPTER && (
                  <div data-hr="fade" style={{ "--hd": "0.42s" } as React.CSSProperties}>
                    <SolverHud bus={bus} active={active === AIM_CHAPTER} onFire={fire} link={aimLink} layout={layout} />
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

// ─── telemetry under the robot: HDG · TURRET · LOCK (USER-REQUIREMENTS #2 copy) ───────────────

function StageReadout({
  bus,
  opacity,
  x,
  layout,
}: {
  bus: StoryBus;
  opacity: MotionValue<number>;
  x: MotionValue<number>;
  layout: StoryLayout;
}) {
  const hdg = useTransform(bus.hdgDeg, (v) => `${fmtSigned(v, 1)}°`);
  const tur = useTransform(bus.turretDeg, (v) => `${fmtSigned(v, 1)}°`);
  const lockText = useTransform(bus.lock, (v): string => (v > 0.5 ? "LOCK" : v < -0.5 ? "LIMIT" : "SLEW"));
  const lockColor = useTransform(bus.lock, (v) => (v > 0.5 ? "var(--pollen-line)" : "transparent"));
  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase",
        layout === "sides"
          ? "bottom-[clamp(18px,4.2vh,40px)] left-1/2 w-[min(46vw,560px)] -translate-x-1/2 text-center"
          : "top-[calc(var(--header-h)+6px)] left-[var(--page-margin)] text-left",
      )}
      style={{ opacity, x }}
    >
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap tabular-nums max-sm:gap-x-3 sm:justify-center">
        <span>
          HDG <motion.span className="text-fg">{hdg}</motion.span>
        </span>
        <span>
          TURRET <motion.span className="text-fg">{tur}</motion.span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <motion.span className="size-1.5 rounded-full border border-pollen-line" style={{ backgroundColor: lockColor }} />
          <motion.span className="text-fg">{lockText}</motion.span>
        </span>
      </p>
      <p className={cn("mt-1.5", layout === "stack" && "hidden min-[420px]:block")}>Scroll to spin the chassis — the turret holds its lock</p>
      <ConceptModelCaption className={cn("mt-1.5 opacity-80", layout === "stack" && "hidden")} />
    </motion.div>
  );
}
