"use client";

// ArcPlatePlayer — the animation half of the trajectory plate (./arc-motif.tsx). The server renders
// the finished plate; this wrapper only moves it:
//   build — draw="scroll", when the plate scrolls into view: grid → floor (its hatch keeps pace) →
//           muzzle and its 14 in dimension → the 40° angle → the CELL → the arc draws itself (path
//           rebuilt from the solver's own ballPosition(), so it is always the exact curve), each 0.1 s
//           tick and the apex appearing as the pen passes them → range and apex dimensions, whose
//           numbers count up once their lines are drawn → the solver's answer, row by row → the note.
//   fire  — once the build is done: the ball loads in the muzzle and flies the arc in REAL flight
//           time (each tick it passes flashes), meets the CELL's back wall, drops in under gravity
//           with one small bounce, and rests. It fires once — again only when the plate comes back
//           into view after leaving it, when the pointer enters the drawing, or on "Replay shot".
//           Nothing loops (WCAG 2.2.2).
// Already on screen at load: no build (nothing flashes); the shot fires once.
// Reduced motion: nothing runs — the server's finished drawing stays.
// Hidden by Activity (cacheComponents): the cleanup restores the finished drawing.

import { cubicBezier } from "motion/react";
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ballPosition, G_IN_S2, type Solution, type SolveInput } from "@/lib/ballistics";
import { nf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { hatchPath } from "./arc-motif-geom";

export interface PlateFlight {
  input: SolveInput;
  /** The flight drawn: the solver's solution, or the max-RPM attempt when there is none. */
  shot: Solution;
  /** Seconds of flight drawn (time of flight, or until the attempt passes the target / lands). */
  tEnd: number;
  vs: number;
  samples: number;
  ballR: number;
  /** A shot into a CELL: when the ball meets the back wall, and where it comes to rest. */
  cup: { wallT: number; rest: { x: number; z: number } } | null;
  /** The marked apex (null when none is drawn). Its marker hides only while the ball crosses it. */
  apex: { x: number; z: number; t: number } | null;
}

const easeOut = cubicBezier(0.22, 1, 0.36, 1);
const easeInOut = cubicBezier(0.65, 0, 0.35, 1);
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
/** easeInOut⁻¹ — when the pen (which draws with easeInOut) reaches a given share of the flight */
const unease = (y: number) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (easeInOut(m) < y) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};

/** Seconds. The arc is drawn from ARC_AT for ARC_DUR; the shot fires FIRE_GAP after the build ends. */
const ARC_AT = 0.8;
const ARC_DUR = 1.05;
const FIRE_GAP = 0.3;
const OUT_S = 0.26;
const LOAD_S = 0.34;
/** Coefficient of restitution of the one bounce on the CELL's floor. */
const BOUNCE = 0.35;
const HOLD_S = 0.5;

type El = HTMLElement | SVGElement;
interface Track {
  at: number;
  dur: number;
  ease: (p: number) => number;
  set: (p: number) => void;
  done?: boolean;
}

export function ArcPlatePlayer({
  mode,
  flight,
  ballAtApex,
  className,
  style,
  children,
}: {
  mode: "none" | "scroll";
  flight: PlateFlight;
  /** The server drew the ball ON the apex marker (which then stays hidden under it until the ball moves). */
  ballAtApex?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const key = JSON.stringify(flight);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { input, shot, tEnd, vs, samples, ballR, cup, apex } = flight;

    const q = <T extends Element = El>(sel: string, scope: ParentNode = root) => scope.querySelector<T>(sel);
    const qa = <T extends Element = El>(sel: string, scope: ParentNode = root) => Array.from(scope.querySelectorAll<T>(sel));
    const stage = q<HTMLElement>("[data-ap='stage']");
    const arc = q<SVGPathElement>("[data-ap='arc']");
    const ball = q<SVGCircleElement>("[data-ap='ball']");
    const cupEl = q<SVGPathElement>("[data-ap='cup']");
    const mark = q<HTMLElement>("[data-ap='mark']");
    if (!stage || !arc || !ball) return;

    const arcD = arc.getAttribute("d") ?? "";
    const home = { cx: ball.getAttribute("cx") ?? "0", cy: ball.getAttribute("cy") ?? "0" };
    const homeX = Number(home.cx);
    const homeZ = -Number(home.cy) / vs;
    /** The ball leaves the apex: from now on the apex marker shows. */
    const freeApex = () => (root.dataset.ball = "free");
    const R = String(ballR);
    const Y = (z: number) => (-z * vs).toFixed(2);
    const theta = ((input.launchPitchDeg ?? 40) * Math.PI) / 180;
    const vz0 = shot.muzzleSpeedIn * Math.sin(theta);
    /** The arc up to time t, from the solver's own position function (so it is always the exact curve). */
    const pathTo = (t: number) => {
      const n = Math.max(1, Math.ceil((samples * t) / tEnd));
      let dd = "";
      for (let i = 0; i <= n; i++) {
        const p = ballPosition(input, shot, Math.min(t, (tEnd * i) / samples));
        dd += `${i ? "L" : "M"}${p.x.toFixed(2)} ${Y(p.z)}`;
      }
      return dd;
    };
    const place = (x: number, z: number) => {
      ball.setAttribute("cx", x.toFixed(2));
      ball.setAttribute("cy", Y(z));
    };
    const css = (el: Element) => (el as El).style;
    /** build time at which the pen reaches flight time t */
    const cue = (t: number) => ARC_AT + ARC_DUR * unease(clamp01(t / tEnd));

    // ── build timeline ───────────────────────────────────────────────────────────────────────────
    const tracks: Track[] = [];
    const add = (at: number, dur: number, set: (p: number) => void, ease = easeOut) => tracks.push({ at, dur, ease, set });
    const fade = (el: Element | null, at: number, dur = 0.35) => el && add(at, dur, (p) => (css(el).opacity = p >= 1 ? "" : String(p)));
    const grow = (el: Element | null, axis: "X" | "Y" | "", at: number, dur: number, ease = easeInOut) =>
      el && add(at, dur, (p) => (css(el).transform = p >= 1 ? "" : `scale${axis}(${p})`), ease);
    const attr = (el: Element | null, name: string, from: number, to: number, at: number, dur: number, ease = easeInOut) =>
      el && add(at, dur, (p) => el.setAttribute(name, String(p >= 1 ? to : from + (to - from) * p)), ease);
    const counts = (scope: Element | null, at: number, dur = 0.5) => {
      if (!scope) return;
      for (const el of qa<HTMLElement>("[data-ap-count]", scope)) {
        const to = Number(el.dataset.apCount);
        const f = nf({ minimumFractionDigits: Number(el.dataset.dec || 0), maximumFractionDigits: Number(el.dataset.dec || 0) });
        const final = el.textContent ?? "";
        add(at, dur, (p) => (el.textContent = p >= 1 ? final : f.format(to * p)), easeOut);
      }
    };
    /** A dimension: extension lines and line draw together → arrowheads; the number fades in as the
     *  line passes it and counts up. */
    const dimension = (dim: Element | null, at: number, axis: "X" | "Y") => {
      if (!dim) return;
      for (const ext of qa(".ap-ext", dim)) grow(ext, ext.classList.contains("ap-ext-top") ? "X" : "Y", at, 0.3);
      grow(q(".ap-line", dim), axis, at, 0.45);
      for (const a of qa(".ap-arrow", dim)) fade(a, at + 0.36, 0.16);
      fade(q(".ap-dim-label", dim), at + 0.2, 0.25);
      counts(q(".ap-dim-label", dim), at + 0.2, 0.5);
    };

    fade(q("[data-ap='grid']"), 0, 0.8);
    const floor = q<SVGLineElement>("[data-ap='floor']");
    const hatch = q<SVGPathElement>("[data-ap='hatch']");
    if (floor) {
      // grows out of the muzzle both ways; the hatch is redrawn under exactly the length drawn so far.
      // The line runs 240 in past each end of the stage (so it fills any drawing width): animate out to
      // what can be on screen — the stage ± 60% of its width — and set the full length at the end
      const x1 = Number(floor.getAttribute("x1"));
      const x2 = Number(floor.getAttribute("x2"));
      const span = x2 - x1 - 480;
      const to1 = Math.max(x1, x1 + 240 - 0.6 * span);
      const to2 = Math.min(x2, x2 - 240 + 0.6 * span);
      const hatchD = hatch?.getAttribute("d") ?? "";
      add(
        0.05,
        0.9,
        (p) => {
          floor.setAttribute("x1", String(p >= 1 ? x1 : to1 * p));
          floor.setAttribute("x2", String(p >= 1 ? x2 : to2 * p));
          hatch?.setAttribute("d", p >= 1 ? hatchD : p > 0 ? hatchPath(to1 * p, to2 * p) : "");
        },
        easeInOut,
      );
    }
    const muzzle = q("[data-ap='muzzle']");
    attr(muzzle, "r", 0, ballR, 0.15, 0.4, easeOut);
    dimension(q(".ap-dim-muzzle"), 0.3, "Y");
    const angle = q("[data-ap='angle']");
    if (angle) {
      grow(q(".ap-angle-ref", angle), "X", 0.55, 0.3);
      const a = q<SVGPathElement>(".ap-angle-arc path", angle);
      if (a) add(0.6, 0.45, (p) => (a.style.strokeDashoffset = String(1 - p)), easeInOut);
      fade(q(".ap-angle-label", angle), 0.75, 0.3);
      counts(angle, 0.75, 0.45);
    }
    // the target is drawn before the shot that reaches it
    fade(cupEl, 0.6, 0.35);
    for (const el of qa("[data-ap='aim']")) fade(el, 0.6, 0.35);
    for (const el of qa("[data-ap='cell']")) fade(el, 0.75, 0.3);
    add(ARC_AT, ARC_DUR, (p) => arc.setAttribute("d", p >= 1 ? arcD : pathTo(p * tEnd)), easeInOut);
    const ticks = qa<HTMLElement>("[data-ap='tick']").map((el) => ({ el, t: Number(el.dataset.t) }));
    for (const { el, t } of ticks) {
      fade(q(".ap-tick-mark", el), cue(t), 0.12);
      fade(q(".ap-tick-label", el), cue(t) + 0.05, 0.3);
    }
    dimension(q(".ap-dimh"), 1.2, "X");
    fade(q("[data-ap='verdict']"), 1.5, 0.45);
    fade(q("[data-ap='miss']"), cue(tEnd) + 0.1, 0.3);
    const callout = q("[data-ap='apex']");
    // the apex appears as the pen passes it (with no apex marked: as the pen reaches the CELL)
    const apexCue = apex && mark ? cue(apex.t) : cue(tEnd) + 0.05;
    if (callout) {
      grow(mark, "", apexCue, 0.3, easeOut);
      grow(q(".ap-leader", callout), callout.dataset.align === "center" ? "Y" : "", apexCue + 0.08, 0.25);
      fade(q(".ap-callout", callout), apexCue + 0.15, 0.35);
      counts(callout, apexCue + 0.15, 0.5);
    }
    dimension(q(".ap-dim-apex"), apexCue + 0.05, "Y");
    // the solver's answer arrives while the arc it describes is being drawn; only measured quantities
    // count (flywheel speed, flight time) — the fixed hood and the iteration count just settle in
    qa("[data-ap='row']").forEach((row, i) => {
      add(1.0 + i * 0.08, 0.5, (p) => {
        css(row).opacity = p >= 1 ? "" : String(p);
        css(row).transform = p >= 1 ? "" : `translateY(${(1 - p) * 8}px)`;
      });
      counts(row, 1.05 + i * 0.08, 0.6);
    });
    const rise = (el: Element | null, at: number, dur = 0.5) =>
      el &&
      add(at, dur, (p) => {
        css(el).opacity = p >= 1 ? "" : String(p);
        css(el).transform = p >= 1 ? "" : `translateY(${(1 - p) * 6}px)`;
      });
    rise(q("[data-ap='log']"), 1.4);
    rise(q("[data-ap='caption']"), 1.9);
    fade(q(".ap-foot"), 2.1, 0.4);
    const buildEnd = Math.max(...tracks.map((k) => k.at + k.dur));
    /** the flight log's column for a moment of the flight (one cell per row) */
    const logCol = (t: number) => qa(`[data-ap-log="${t}"]`);

    // ── state ────────────────────────────────────────────────────────────────────────────────────
    let rafBuild = 0;
    let rafBall = 0;
    let timer = 0;
    const flashes = new Set<number>();
    /** How much of the drawing is on screen (IntersectionObserver ratio). */
    let ratio = 0;
    const inView = () => ratio >= 0.35;
    let flying = false;
    /** fire once the plate is (back) in view */
    let needShot = false;
    let built = root.dataset.apBuilt === "1";
    let armed = false;

    const flash = (el: Element, ms: number) => {
      (el as El).dataset.hit = "";
      const id = window.setTimeout(() => {
        delete (el as El).dataset.hit;
        flashes.delete(id);
      }, ms);
      flashes.add(id);
    };
    /** The finished drawing (what the server rendered). */
    const restore = () => {
      for (const k of tracks) k.set(1);
      arc.setAttribute("d", arcD);
    };
    const finishBuild = () => {
      restore();
      built = true;
      root.dataset.apBuilt = "1";
    };
    const fireWhenSeen = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (inView()) fire();
        else needShot = true;
      }, delay);
    };

    // ── the shot: fade out of the CELL → load in the muzzle → real-time flight → the back wall →
    //    drop under gravity, one bounce, rest ─────────────────────────────────────────────────────
    const fire = () => {
      if (flying || !built) return;
      flying = true;
      needShot = false;
      freeApex();
      window.clearTimeout(timer);
      const shown = css(ball).opacity !== "0";
      const from = { cx: ball.getAttribute("cx"), cy: ball.getAttribute("cy") };
      const tOut = shown ? OUT_S : 0;
      const tLoad = tOut + LOAD_S;
      const tFly = cup ? Math.max(tEnd, cup.wallT) : tEnd;
      const tLand = tLoad + tFly;
      const end = ballPosition(input, shot, tFly);
      // into the CELL: the back wall stops it (and any climb), then it falls under G and bounces once
      const vzWall = cup ? Math.min(0, vz0 - G_IN_S2 * tFly) : 0;
      const drop = cup ? Math.max(0, end.z - cup.rest.z) : 0;
      const tDrop = cup ? (vzWall + Math.sqrt(vzWall * vzWall + 2 * G_IN_S2 * drop)) / G_IN_S2 : 0;
      const vUp = BOUNCE * (G_IN_S2 * tDrop - vzWall);
      const tSettle = tDrop + (2 * vUp) / G_IN_S2;
      // no CELL: hold where the flight ends, then (if the still drawing has it elsewhere) go back there
      const goHome = !cup && Math.hypot(end.x - homeX, end.z - homeZ) > 0.5;
      const tDone = cup ? tLand + tSettle : tLand + (goHome ? HOLD_S + 0.6 : 0);
      const flashed = new Set<number>();
      let hit = false;
      const near = (x: number, z: number) => !!apex && Math.hypot(x - apex.x, (z - apex.z) * vs) < ballR + 1;
      const t0 = performance.now();
      const frame = (now: number) => {
        const e = (now - t0) / 1000;
        let bx = homeX;
        let bz = homeZ;
        if (e < tOut) {
          if (from.cx && from.cy) {
            ball.setAttribute("cx", from.cx);
            ball.setAttribute("cy", from.cy);
          }
          css(ball).opacity = String(1 - e / tOut);
          bx = Number(from.cx);
          bz = -Number(from.cy) / vs;
        } else if (e < tLoad) {
          const p = easeOut(clamp01((e - tOut) / LOAD_S));
          bx = input.muzzle.x;
          bz = input.muzzle.z;
          place(bx, bz);
          css(ball).opacity = String(p);
          ball.setAttribute("r", String(ballR * (0.35 + 0.65 * p)));
        } else if (e < tLand) {
          const tf = e - tLoad;
          const p = ballPosition(input, shot, tf);
          ball.setAttribute("r", R);
          css(ball).opacity = "1";
          bx = p.x;
          bz = p.z;
          place(bx, bz);
          for (const k of ticks)
            if (tf >= k.t && !flashed.has(k.t)) {
              flashed.add(k.t);
              flash(k.el, 380);
              for (const cell of logCol(k.t)) flash(cell, 380);
            }
        } else if (cup) {
          if (!hit) {
            hit = true;
            if (cupEl) flash(cupEl, 520);
            for (const cell of logCol(tEnd)) flash(cell, 520);
          }
          const tau = e - tLand;
          bx = end.x + (cup.rest.x - end.x) * easeOut(clamp01(tau / tSettle));
          if (tau < tDrop) bz = end.z + vzWall * tau - 0.5 * G_IN_S2 * tau * tau;
          else {
            const tb = tau - tDrop;
            bz = cup.rest.z + vUp * tb - 0.5 * G_IN_S2 * tb * tb;
          }
          bz = Math.max(bz, cup.rest.z);
          place(bx, bz);
        } else {
          if (!hit) {
            hit = true;
            for (const cell of logCol(tEnd)) flash(cell, 520);
          }
          const tau = e - tLand;
          bx = end.x;
          bz = end.z;
          if (goHome && tau >= HOLD_S) {
            const back = tau >= HOLD_S + 0.3;
            if (back) {
              bx = homeX;
              bz = homeZ;
            }
            css(ball).opacity = String(back ? clamp01((tau - HOLD_S - 0.3) / 0.3) : 1 - clamp01((tau - HOLD_S) / 0.3));
          }
          place(bx, bz);
        }
        if (mark) mark.style.visibility = near(bx, bz) ? "hidden" : "";
        if (e < tDone) rafBall = requestAnimationFrame(frame);
        else {
          // the shot is over: the ball rests in the CELL — or back where the still drawing has it
          if (cup) place(cup.rest.x, cup.rest.z);
          else if (goHome) place(homeX, homeZ);
          ball.setAttribute("r", R);
          css(ball).opacity = "1";
          if (mark) mark.style.visibility = "";
          if (goHome && ballAtApex) root.dataset.ball = "apex";
          flying = false;
        }
      };
      rafBall = requestAnimationFrame(frame);
    };

    const playBuild = () => {
      armed = false;
      const t0 = performance.now();
      const frame = (now: number) => {
        const t = (now - t0) / 1000;
        for (const k of tracks) {
          if (k.done) continue;
          const p = clamp01((t - k.at) / k.dur);
          k.set(k.ease(p));
          if (p >= 1) k.done = true;
        }
        if (t < buildEnd) rafBuild = requestAnimationFrame(frame);
        else {
          finishBuild();
          fireWhenSeen(FIRE_GAP * 1000);
        }
      };
      rafBuild = requestAnimationFrame(frame);
    };

    // ── start ────────────────────────────────────────────────────────────────────────────────────
    const r = root.getBoundingClientRect();
    const onScreen = r.top < window.innerHeight && r.bottom > 0;
    if (mode === "scroll" && !built && !onScreen) {
      // armed: hidden until it scrolls into view (it is below the fold, so nothing visibly flashes)
      armed = true;
      for (const k of tracks) k.set(k.ease(0));
      arc.setAttribute("d", pathTo(0));
      css(ball).opacity = "0";
      freeApex();
    } else {
      finishBuild();
      needShot = mode === "scroll"; // fire once it is (still) in view
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
        if (ratio === 0) {
          // gone from the screen: the next time it comes back, fire once more
          if (mode === "scroll" && built && !armed) needShot = true;
          return;
        }
        if (!inView()) return;
        if (armed) playBuild();
        else if (needShot && !flying) {
          needShot = false;
          fireWhenSeen(600);
        }
      },
      // 0 tells us when it has left the screen entirely (a lone 0.4 threshold would not)
      { threshold: [0, 0.2, 0.4] },
    );
    io.observe(stage);

    // pointer over the drawing, or "Replay shot" (click — also Enter / Space): fire now. Focus alone
    // never starts motion.
    const onFire = () => {
      if (!armed && !flying) fire();
    };
    const replay = q<HTMLButtonElement>("[data-ap='replay']");
    stage.addEventListener("pointerenter", onFire);
    replay?.addEventListener("click", onFire);

    return () => {
      io.disconnect();
      cancelAnimationFrame(rafBuild);
      cancelAnimationFrame(rafBall);
      window.clearTimeout(timer);
      for (const id of flashes) window.clearTimeout(id);
      stage.removeEventListener("pointerenter", onFire);
      replay?.removeEventListener("click", onFire);
      // leave the finished drawing behind (Activity hides the route). Not marked as built unless the
      // build really ran, so StrictMode's mount → cleanup → mount still plays it.
      restore();
      ball.setAttribute("cx", home.cx);
      ball.setAttribute("cy", home.cy);
      ball.setAttribute("r", R);
      ball.style.removeProperty("opacity");
      if (mark) mark.style.visibility = "";
      if (cupEl) delete cupEl.dataset.hit;
      for (const el of qa<HTMLElement>("[data-ap='tick'], [data-ap-log]")) delete el.dataset.hit;
      if (ballAtApex) root.dataset.ball = "apex";
    };
    // `key` stands for `flight` (a fresh object on every server render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mode, ballAtApex]);

  return (
    <figure ref={ref} data-arc-plate="" data-ball={ballAtApex ? "apex" : undefined} className={cn("ap-plate", className)} style={style}>
      {children}
    </figure>
  );
}
