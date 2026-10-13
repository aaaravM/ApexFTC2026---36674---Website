"use client";

// The sticky 3D stage of /robot: the lazy-loaded scene plus its instrument chrome —
//   top-left   view mode (cult halo-segmented: ASSEMBLED · EXPLODED · X-RAY)
//   top-right  live telemetry: chassis heading, turret angle, lock state + a top-down radar
//   bottom-l   parts index (cult feature-sticky-section triggers), desktop
//   bottom-r   what scrolling does + the concept-model caption, desktop
//   overlay    selection brackets on the active subsystem, 18 in cube / apex / range labels
// Per-frame numbers are written straight into these DOM nodes by the scene (no re-renders).

import dynamic from "next/dynamic";
import { useMemo, useSyncExternalStore, type MouseEvent } from "react";
import { HaloSegmented } from "@/components/ui/halo-segmented";
import { StickySection } from "@/components/ui/feature-sticky-section";
import { Cursor, CursorFollow, CursorProvider } from "@/components/ui/cursor";
import { Scramble } from "@/components/motion";
import { ConceptModelCaption } from "@/components/site/concept-model-caption";
import { cn } from "@/lib/utils";
import { AIM_STOP, CAMERA_AZIMUTH_DEG, STOPS } from "./data";
import { RobotPoster } from "./poster";
import type { SceneColors } from "./scene";
import { IDLE_READOUT, type OverlayNodes, type RobotPageStore, type ViewMode } from "./store";

const RobotScene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => <RobotPoster className="absolute inset-0" />,
});

const MODES = [
  { value: "assembled", label: "Assembled" },
  { value: "exploded", label: "Exploded" },
  { value: "xray", label: "X-ray" },
];

const FALLBACK_COLORS: Record<"dark" | "light", SceneColors> = {
  dark: { text: "#ECECE7", muted: "#9C9C96", line: "#5E5E5A", pollen: "#F7E326" },
  light: { text: "#111110", muted: "#5C5C57", line: "#A3A39C", pollen: "#7A6A00" },
};

/** Line colours for the 3D overlays, read from the live CSS tokens (they follow the theme). */
function useSceneColors(tone: "dark" | "light"): SceneColors {
  return useMemo(() => {
    const fb = FALLBACK_COLORS[tone];
    if (typeof window === "undefined") return fb;
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string, d: string) => cs.getPropertyValue(name).trim() || d;
    // the turntable ring sits between hairline and muted so it reads on both grounds
    return { text: v("--text", fb.text), muted: v("--muted", fb.muted), line: fb.line, pollen: v("--pollen-line", fb.pollen) };
  }, [tone]);
}

export interface RobotStageProps {
  store: RobotPageStore;
  active: number;
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
  tone: "dark" | "light";
  reduced: boolean;
}

export function RobotStage({ store, active, mode, onModeChange, tone, reduced }: RobotStageProps) {
  const colors = useSceneColors(tone);
  const isAim = active === AIM_STOP;
  const stop = STOPS[active] ?? STOPS[0];
  const reg = <K extends keyof OverlayNodes>(key: K) =>
    (el: OverlayNodes[K] | null) => {
      store.register(key, el);
    };

  const onCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isAim) {
      store.fire();
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    store.requestPick(e.clientX - r.left, e.clientY - r.top);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 3D */}
      <div className={cn("absolute inset-0", isAim ? "cursor-crosshair" : "lg:cursor-pointer")} onClick={onCanvasClick}>
        <RobotScene
          store={store}
          tone={tone}
          reduced={reduced}
          colors={colors}
          poster={<RobotPoster className="absolute inset-0 bg-bg" />}
          label="APEX-R1 concept model in 3D. Scrolling spins the chassis while the turret stays locked on the HIVE; the active subsystem is outlined."
        />
        {isAim ? (
          <CursorProvider>
            <AimCursor store={store} />
          </CursorProvider>
        ) : null}
      </div>

      {/* a soft fade into the page ground under the chrome, so the parts index and captions stay
          legible over close-ups (desktop; DESIGN_SPEC §4 "fades into --bg via fog/vignette") */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-linear-to-t from-bg via-bg/60 to-transparent max-lg:hidden" />

      {/* overlay written by the scene every frame */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div ref={reg("bracket")} className="contents">
          {(["border-t border-l", "border-t border-r", "border-b border-l", "border-b border-r"] as const).map((b) => (
            <span key={b} className={cn("invisible absolute top-0 left-0 size-3.5 border-pollen-line opacity-0 will-change-transform", b)} />
          ))}
        </div>
        {/* phones: the panel label sits right under the stage, so the tag would only add clutter */}
        <div ref={reg("bracketTag")} className="invisible absolute top-0 left-0 opacity-0 will-change-transform max-lg:hidden">
          <span className="flex items-center gap-2 font-mono text-[10px] leading-4 tracking-[0.08em] whitespace-nowrap uppercase">
            <span className="bg-bg/80 px-1 text-fg tabular-nums">{isAim ? "CELL" : stop.index}</span>
            <span className="bg-bg/80 px-1 text-fg">
              {/* re-keyed per stop so the tag decodes like an instrument readout when it changes */}
              {isAim ? <AimTag store={store} /> : <Scramble key={stop.key} text={`${stop.title} · ${stop.tag}`} immediate duration={0.5} />}
            </span>
          </span>
        </div>
        <div ref={reg("cubeLabel")} className="invisible absolute top-0 left-0 opacity-0 will-change-transform">
          <span className="block -translate-x-1/2 -translate-y-[calc(100%+6px)] bg-bg/80 px-1 font-mono text-[10px] leading-4 tracking-[0.08em] whitespace-nowrap text-fg-muted uppercase">
            18 in sizing cube · R102
          </span>
        </div>
        {/* text for these two is written by the scene; Tailwind's translate-* (the CSS `translate`
            property) composes with the per-frame `transform`, so they stay centred on the point */}
        <div
          ref={reg("apexLabel")}
          className="invisible absolute top-0 left-0 -translate-x-1/2 -translate-y-[calc(100%+12px)] bg-bg/80 px-1 font-mono text-[10px] leading-4 tracking-[0.08em] whitespace-nowrap text-fg uppercase opacity-0 will-change-transform"
        />
        <div
          ref={reg("rangeLabel")}
          className="invisible absolute top-0 left-0 -translate-x-1/2 translate-y-2 font-mono text-[10px] leading-4 tracking-[0.08em] whitespace-nowrap text-fg-muted opacity-0 will-change-transform"
        />
        <div ref={reg("hitLabel")} className="invisible absolute top-0 left-0 opacity-0 will-change-transform">
          <span className="block -translate-x-1/2 -translate-y-[calc(100%+18px)] rounded-sm border border-pollen-edge bg-pollen px-1.5 font-mono text-[10px] leading-5 tracking-[0.08em] text-pollen-ink">
            IN
          </span>
        </div>
      </div>

      {/* top-left: view mode */}
      <div className="absolute top-3 left-3 max-lg:top-auto max-lg:bottom-3 lg:top-5 lg:left-5">
        <HaloSegmented
          items={MODES}
          value={mode}
          onValueChange={(v) => onModeChange(v as ViewMode)}
          aria-label="Robot view mode"
          size="sm"
          disabled={isAim}
          className={cn("transition-opacity duration-[220ms]", isAim && "opacity-40")}
        />
      </div>

      {/* top-right: telemetry */}
      <Telemetry reg={reg} />

      {/* bottom-left: parts index (desktop) */}
      <nav aria-label="Robot parts" className="absolute bottom-5 left-5 max-lg:hidden">
        <p className="type-label mb-2 text-fg-muted">[ Parts ]</p>
        <StickySection.List className="flex flex-col">
          {STOPS.map((s, i) => (
            <StickySection.Item key={s.key} index={i}>
              <StickySection.Trigger
                index={i}
                className="group flex h-6 items-center gap-2.5 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase transition-colors duration-[120ms] hover:text-fg data-[state=active]:text-fg"
              >
                <span
                  aria-hidden="true"
                  className="h-px w-3 bg-hairline-strong transition-[width,background-color] duration-[220ms] ease-out group-data-[state=active]:w-6 group-data-[state=active]:bg-pollen-line motion-reduce:transition-none"
                />
                <span className="tabular-nums">{s.index}</span>
                <span>{s.code}</span>
                <span className="sr-only"> — {s.title}</span>
              </StickySection.Trigger>
            </StickySection.Item>
          ))}
        </StickySection.List>
      </nav>

      {/* bottom-right: hint + honesty caption (desktop) */}
      <div className="absolute right-5 bottom-5 max-w-[300px] text-right max-lg:hidden">
        <p className="font-mono text-[10px] leading-4 tracking-[0.08em] text-fg uppercase">
          {isAim ? "Turn the dial — the chassis swings, the turret holds the HIVE" : "Scroll to spin the chassis — the turret holds its lock"}
        </p>
        <p className="mt-1 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
          {isAim ? "Click the stage to fire · ball flight at 0.5× time" : "Click a part to read about it"}
        </p>
        <ConceptModelCaption className="mt-3 border-t border-hairline pt-3" />
      </div>
    </div>
  );
}

// ─── Telemetry ──────────────────────────────────────────────────────────────────────────────

function Telemetry({ reg }: { reg: <K extends keyof OverlayNodes>(key: K) => (el: OverlayNodes[K] | null) => void }) {
  // initial pose (scroll 0): heading 0°, turret pointing at the HIVE (bearing − heading)
  const chassis0 = CAMERA_AZIMUTH_DEG + 180;
  const turret0 = 90;
  return (
    <div className="absolute top-3 right-3 flex items-start gap-3 lg:top-5 lg:right-5">
      <p className="sr-only">
        Telemetry: as you scroll, the chassis heading changes while the turret angle changes the opposite way, so the shooter keeps pointing at
        the HIVE — except at the turret&apos;s ±170° hard stops.
      </p>
      {/* phones: the radar + lock line only (the stage is short); the numbers from sm up */}
      <dl aria-hidden="true" className="font-mono text-[10px] leading-4 tracking-[0.08em] uppercase max-sm:pt-1">
        <div className="flex justify-end gap-3 max-sm:hidden">
          <dt className="text-fg-muted">Heading</dt>
          <dd ref={reg("heading")} className="w-[7.5ch] text-right text-fg tabular-nums">
            +000.0°
          </dd>
        </div>
        <div className="flex justify-end gap-3 max-sm:hidden">
          <dt className="text-fg-muted">Turret</dt>
          <dd ref={reg("turret")} className="w-[7.5ch] text-right text-fg tabular-nums">
            +125.0°
          </dd>
        </div>
        <div className="mt-1.5 flex items-center justify-end gap-1.5 max-sm:mt-0 max-sm:bg-bg/70 max-sm:px-1">
          <span
            ref={reg("lockDot")}
            data-state="lock"
            className="size-1.5 rounded-full bg-border-ui data-[state=limit]:bg-transparent data-[state=limit]:ring-1 data-[state=limit]:ring-fg-muted data-[state=lock]:bg-pollen-line"
          />
          <dd ref={reg("lock")} className="text-fg">
            Locked on HIVE
          </dd>
        </div>
      </dl>
      <svg viewBox="0 0 64 64" aria-hidden="true" className="size-11 shrink-0 text-fg sm:size-14 lg:size-16">
        <circle cx={32} cy={32} r={29.5} fill="none" stroke="var(--hairline-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={i}
            x1={32}
            y1={3}
            x2={32}
            y2={i % 2 ? 5 : 7}
            transform={`rotate(${i * 45} 32 32)`}
            stroke="var(--hairline-strong)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* the HIVE bearing (fixed in the world: screen-right) */}
        <circle cx={58} cy={32} r={2.4} fill="var(--pollen-line)" />
        <g ref={reg("radarChassis")} transform={`rotate(${chassis0} 32 32)`}>
          <rect x={24.5} y={24.5} width={15} height={15} fill="none" stroke="var(--muted)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <path d="M28.5 24.5 L32 20.5 L35.5 24.5" fill="none" stroke="var(--muted)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </g>
        <g ref={reg("radarTurret")} transform={`rotate(${turret0} 32 32)`}>
          <line x1={32} y1={32} x2={32} y2={8} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <circle cx={32} cy={32} r={2} fill="currentColor" />
        </g>
      </svg>
    </div>
  );
}

// ─── AIM bits that follow the live readout ──────────────────────────────────────────────────

function useReadout(store: RobotPageStore) {
  return useSyncExternalStore(store.subscribe, store.getReadout, () => IDLE_READOUT);
}

function AimTag({ store }: { store: RobotPageStore }) {
  const r = useReadout(store);
  if (!r.live) return <>Upward CELL · aim point</>;
  return <>{r.ready ? "Locked · ready to fire" : r.readiness}</>;
}

function AimCursor({ store }: { store: RobotPageStore }) {
  const r = useReadout(store);
  return (
    <>
      <Cursor locked={r.ready} blocked={r.live && !r.gates.solution} />
      <CursorFollow side="bottom" align="end">
        {r.ready ? "Click to fire" : r.readiness || "Aiming"}
      </CursorFollow>
    </>
  );
}
