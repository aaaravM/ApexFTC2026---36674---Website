"use client";

// VIEW 1 — GENERAL ASSEMBLY: the CAD workspace.
//   • assembly switcher: Cult UI direction-aware-tabs (FULL ASSEMBLY · DRIVETRAIN · INTAKE ·
//     TURRET + SHOOTER). Its tab row spans the workspace and its panel (the parts list / specs of
//     the selected assembly) sits beside the viewer: the tabs root is `display: contents`, so both
//     of its children are placed directly on this grid.
//   • the 3D view (SceneShell → ViewerScene), standard views via Cult UI halo-segmented
//   • EXPLODE and SECTION A–A as slide-rule range inputs; dimensions toggle; reset
// Keyboard: the view itself is focusable (arrows orbit, +/− zoom, 0 fits); every control is native.
// Motion: the view's border plots itself and a scan line sweeps across it, "plotting" the model in
// (PlotScan); the first time the controls are fully in view, SECTION A–A demos itself once — the
// cutting plane sweeps through the robot and settles back to off. Any interaction cancels the demo;
// reduced motion never runs it.

import { animate, type AnimationPlaybackControls } from "motion/react";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import { HaloSegmented } from "@/components/ui/halo-segmented";
import { SceneShell } from "@/components/three";
import { Button } from "@/components/site/button";
import { Pending } from "@/components/site/pending";
import { SpecTable, type SpecTableRow } from "@/components/site/spec-table";
import { ConceptModelCaption } from "@/components/site/concept-model-caption";
import { ENVELOPE, IN, type SubsystemId } from "@/components/robot";
import { getSubsystem, subsystems } from "@/content/robot";
import { fmtFixed, fmtInt } from "@/lib/format";
import { usePrefersReducedMotion, useScrollTo } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { styles } from "./styles";
import { cadStore, useCadAssembly } from "./cad-store";
import { assemblies, type Assembly, type AssemblyId } from "./content";
import { PlotFrame } from "./plot-frame";
import { PlotScan } from "./plot-motion";
import { RulerRange, type RulerTick } from "./ruler-range";
import { AnnotationLayer } from "./three/annotations";
import { BALLOON_NUMBER, ViewerScene, type SceneInputs, type ViewerApi, type ViewName } from "./viewer-scene";
import { ViewerPoster } from "./viewer-poster";

const VIEW_LABEL: Record<ViewName, string> = { iso: "Isometric", front: "Front", right: "Right side", top: "Top" };
const VIEW_ITEMS = [
  { value: "iso", label: "Iso" },
  { value: "front", label: "Front" },
  { value: "right", label: "Right" },
  { value: "top", label: "Top" },
];

// SECTION A–A travel: from the envelope's left face (+9 in, robot +Y) to 8.5 in right of centre.
const CUT_FROM_IN = 9;
const CUT_SPAN_IN = 17.5;
const CL = CUT_FROM_IN / CUT_SPAN_IN;
const cutIn = (s: number) => CUT_FROM_IN - s * CUT_SPAN_IN;

const EXPLODE_TICKS: RulerTick[] = Array.from({ length: 21 }, (_, i) => ({
  at: i / 20,
  major: i % 10 === 0,
  label: i === 0 ? "0" : i === 10 ? "50" : i === 20 ? "100 %" : undefined,
}));
const SECTION_TICKS: RulerTick[] = [
  { at: 0, major: true, label: "Off" },
  // 8 … −8 in, one tick per inch
  ...Array.from({ length: 17 }, (_, k): RulerTick => {
    const y = 8 - k;
    return { at: (CUT_FROM_IN - y) / CUT_SPAN_IN, major: y === 0, label: y === 0 ? "℄" : undefined };
  }),
  { at: 1, major: true, label: "R 8.5 in" },
];

/** Which tab a parts-list item belongs to (vision + electronics live in the full assembly only). */
const TAB_OF: Partial<Record<SubsystemId, AssemblyId>> = {
  drivetrain: "drive",
  odometry: "drive",
  intake: "intake",
  hopper: "intake",
  turret: "turret",
  shooter: "turret",
};

const SPEC_PICKS: Record<Exclude<AssemblyId, "full">, [SubsystemId, string[]][]> = {
  drive: [
    ["drivetrain", ["Wheels", "Motors", "Free speed"]],
    ["odometry", ["Computer", "Pod offsets", "Fused IMU"]],
  ],
  intake: [
    ["intake", ["Main roller", "Side rollers"]],
    ["hopper", ["Sensor", "POLLEN hue", "Ball present", "Rule"]],
  ],
  turret: [
    ["turret", ["Travel", "Gearing", "Control"]],
    ["shooter", ["Flywheel", "Hood", "Muzzle"]],
  ],
};

function specRows(id: Exclude<AssemblyId, "full">): SpecTableRow[] {
  return SPEC_PICKS[id].flatMap(([sid, labels]) => getSubsystem(sid).specs.filter((r) => labels.includes(r.label)));
}

// ─── error boundary: keep the poster when WebGL is unavailable ─────────────────
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// ─── the assembly panel (tab content) ──────────────────────────────────────────
function AssemblyPanel({
  a,
  hover,
  onHover,
  onOpen,
  onStory,
}: {
  a: Assembly;
  hover: SubsystemId | null;
  onHover: (id: SubsystemId | null) => void;
  onOpen: (id: AssemblyId) => void;
  onStory: (anchor: string) => void;
}) {
  return (
    <div className="border border-fg bg-bg">
      <div className="flex items-baseline justify-between gap-3 border-b border-fg px-4 py-2.5">
        <span className="type-label text-fg">{a.cad}</span>
        <span className="type-label truncate text-fg-muted">{a.contains}</span>
      </div>
      <div className="px-4 pt-4 pb-5 sm:px-5">
        <h3 className="type-h3">{a.title}</h3>
        <p className="mt-2 text-[15px] leading-6 text-fg-muted">{a.summary}</p>

        {a.id === "full" ? (
          <div className="mt-5">
            <p className="type-label text-fg-muted" id="cad-bom-label">
              Parts list · item = balloon
            </p>
            <ul aria-labelledby="cad-bom-label" className="mt-2 border-y border-hairline" onMouseLeave={() => onHover(null)}>
              {subsystems.map((s) => {
                const tab = TAB_OF[s.id];
                const on = hover === s.id;
                return (
                  <li
                    key={s.id}
                    onMouseEnter={() => onHover(s.id)}
                    className={cn(
                      "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 border-hairline py-1.5 [&+&]:border-t",
                      on && "bg-surface-2",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-6 place-items-center rounded-full border font-mono text-[10px] tabular-nums",
                        on ? "border-fg border-2" : "border-fg",
                      )}
                    >
                      {BALLOON_NUMBER[s.id]}
                    </span>
                    <span className="min-w-0 truncate text-[14px] leading-5">
                      <span className="sr-only">Item {BALLOON_NUMBER[s.id]}: </span>
                      {s.name}
                    </span>
                    {tab ? (
                      <button
                        type="button"
                        onClick={() => onOpen(tab)}
                        onFocus={() => onHover(s.id)}
                        onBlur={() => onHover(null)}
                        className="link-draw font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase hover:text-fg focus-visible:text-fg"
                      >
                        {assemblies.find((x) => x.id === tab)!.cad}
                        <span aria-hidden="true"> →</span>
                        <span className="sr-only"> — open the {s.name.toLowerCase()} assembly</span>
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">CAD-001</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <SpecTable className="mt-5" dense rows={specRows(a.id)} />
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          {a.story && (
            <a
              href={`#${a.story.id}`}
              onClick={(e) => {
                e.preventDefault();
                onStory(`#${a.story!.id}`);
              }}
              className="group/s inline-flex items-center gap-2 text-[14px] text-fg"
            >
              <span className="link-draw pb-0.5 group-hover/s:[background-size:100%_1px]">Design story {a.story.code}</span>
              <span aria-hidden="true" className="font-mono text-[12px]">
                ↓
              </span>
            </a>
          )}
          {a.onshape ? (
            <a href={a.onshape} target="_blank" rel="noopener noreferrer" className="link-draw text-[14px] text-fg">
              Open in Onshape ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <Pending label="Public Onshape link pending" inline />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── the workspace ─────────────────────────────────────────────────────────────
export function CadWorkspace() {
  const assemblyId = useCadAssembly();
  const assembly = assemblies.find((a) => a.id === assemblyId)!;
  const reduced = usePrefersReducedMotion();
  const scrollTo = useScrollTo();

  const [explode, setExplode] = useState(0);
  const [cut, setCut] = useState(0);
  const [dims, setDims] = useState(true);
  const [hover, setHover] = useState<SubsystemId | null>(null);
  const [view, setView] = useState<ViewName | null>("iso");
  const [touched, setTouched] = useState(false);

  const api = useRef<ViewerApi>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const demo = useRef<AnimationPlaybackControls | null>(null);
  const demoDone = useRef(false);

  // SECTION A–A auto-demo: once, when the controls are first fully in view
  useEffect(() => {
    const el = controlsRef.current;
    if (!el || reduced || demoDone.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (demoDone.current || !entries.some((e) => e.isIntersecting)) return;
        demoDone.current = true;
        io.disconnect();
        const inOut: [number, number, number, number] = [0.65, 0, 0.35, 1];
        demo.current = animate(0, 1, {
          delay: 0.7,
          duration: 2,
          ease: inOut,
          onUpdate: setCut,
          onComplete: () => {
            demo.current = animate(1, 0, {
              delay: 0.45,
              duration: 1.2,
              ease: inOut,
              onUpdate: setCut,
              onComplete: () => {
                setCut(0);
                demo.current = null;
              },
            });
          },
        });
      },
      { threshold: 0.95 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      demo.current?.stop();
    };
  }, [reduced]);
  const stopDemo = () => {
    demoDone.current = true;
    if (demo.current) {
      demo.current.stop();
      demo.current = null;
    }
  };
  const layer = useRef<AnnotationLayer | null>(null);
  const viewport = useRef<HTMLDivElement>(null);

  // the annotation overlay is imperative DOM owned by this component
  const overlayRef = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      layer.current = new AnnotationLayer(el, { svgClass: styles.annSvg, labelClass: styles.annLabel, hatchId: "cad-ann-hatch" });
    } else {
      layer.current?.destroy();
      layer.current = null;
    }
  }, []);

  // ⌘/Ctrl + wheel (and trackpad pinch, which arrives as ctrl+wheel) zooms; a plain wheel scrolls the page
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      api.current?.zoomBy(Math.exp(-e.deltaY * 0.0022));
      setTouched(true);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    const a = api.current;
    if (!a) return;
    const step = (15 * Math.PI) / 180;
    const map: Record<string, () => void> = {
      ArrowLeft: () => a.orbitBy(-step, 0),
      ArrowRight: () => a.orbitBy(step, 0),
      ArrowUp: () => a.orbitBy(0, -step * 0.66),
      ArrowDown: () => a.orbitBy(0, step * 0.66),
      "+": () => a.zoomBy(1.2),
      "=": () => a.zoomBy(1.2),
      "-": () => a.zoomBy(1 / 1.2),
      "0": () => a.fit(),
      Home: () => a.fit(),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
      setTouched(true);
    }
  };

  const selectView = (v: string) => {
    const vn = v as ViewName;
    setView(vn);
    api.current?.setView(vn);
  };

  const onViewChange = useCallback((v: ViewName | null) => {
    setView(v);
    if (v === null) setTouched(true);
  }, [setView, setTouched]);

  const reset = () => {
    stopDemo();
    setExplode(0);
    setCut(0);
    setDims(true);
    setHover(null);
    setView("iso");
    api.current?.setView("iso");
  };

  const sectionY = cutIn(cut);
  const inputs: SceneInputs = {
    assembly: assembly.id,
    focus: assembly.subsystems,
    hover,
    explode,
    sectionX: cut > 0 ? sectionY * IN : null,
    dims,
    reduced,
  };
  // clamp to the envelope so the readout never claims a cut outside the robot
  const yShown = Math.max(-ENVELOPE / IN / 2, Math.min(ENVELOPE / IN / 2, sectionY));
  const cutDisplay = cut === 0 ? "OFF" : Math.abs(yShown) < 0.005 ? "℄ CENTRELINE" : `Y ${yShown > 0 ? "+" : "−"}${fmtFixed(Math.abs(yShown), 2)} in`;
  const cutText =
    cut === 0
      ? "Section off"
      : Math.abs(yShown) < 0.005
        ? "Cutting plane on the centreline"
        : `Cutting plane ${fmtFixed(Math.abs(yShown), 2)} inches ${yShown > 0 ? "left" : "right"} of the centreline`;

  const tabs = assemblies.map((a, i) => ({
    id: i,
    label: a.tab,
    content: (
      <AssemblyPanel
        a={a}
        hover={hover}
        onHover={setHover}
        onOpen={(id) => {
          setHover(null);
          cadStore.set(id);
        }}
        onStory={(anchor) => scrollTo(anchor, { offset: -80 })}
      />
    ),
  }));
  const activeIndex = assemblies.findIndex((a) => a.id === assembly.id);

  const poster = <ViewerPoster />;

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] gap-x-[var(--gutter)] gap-y-4 lg:grid-cols-12",
        // the tabs' two children (tab row, panel) are placed on this grid directly
        "[&>:first-child>[role=tablist]]:order-1 [&>:first-child>:nth-child(2)]:order-4",
        "lg:[&>:first-child>[role=tablist]]:col-span-12 lg:[&>:first-child>[role=tablist]]:row-start-1",
        "lg:[&>:first-child>:nth-child(2)]:col-span-4 lg:[&>:first-child>:nth-child(2)]:col-start-9 lg:[&>:first-child>:nth-child(2)]:row-span-2 lg:[&>:first-child>:nth-child(2)]:row-start-2 lg:[&>:first-child>:nth-child(2)]:self-start",
        "[&>:first-child>:nth-child(2)>[role=tabpanel]]:pt-0",
      )}
    >
      <DirectionAwareTabs
        className="contents"
        trackClassName="flex-wrap sm:flex-nowrap"
        aria-label="Assembly"
        tabs={tabs}
        value={activeIndex}
        onValueChange={(i) => {
          setHover(null);
          cadStore.set(assemblies[i].id);
        }}
      />

      {/* the view */}
      <div className="order-2 lg:col-span-8 lg:row-start-2">
        <div
          ref={viewport}
          tabIndex={0}
          role="group"
          aria-roledescription="3D view"
          aria-label={`APEX-R1 ${assembly.title.toLowerCase()}, ${view ? VIEW_LABEL[view].toLowerCase() : "custom"} view. Arrow keys orbit, plus and minus zoom, 0 fits the view.`}
          onKeyDown={onKeyDown}
          onPointerDown={() => {
            stopDemo();
            setTouched(true);
          }}
          className={cn(
            styles.viewport,
            styles.viewportCanvas,
            "relative h-[clamp(380px,62vw,480px)] outline-offset-[-4px] sm:h-[clamp(420px,52vw,560px)] lg:h-[clamp(520px,44vw,640px)]",
          )}
        >
          <SceneBoundary
            fallback={
              <div className="absolute inset-0">
                {poster}
                <p className="absolute inset-x-4 bottom-4 font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase">
                  3D view unavailable — WebGL is off in this browser
                </p>
              </div>
            }
          >
            <SceneShell
              className="absolute inset-0"
              poster={poster}
              label="APEX-R1 concept model drawn as a blueprint"
              frameloop="demand"
              flat
              gl={{ stencil: true }}
            >
              <ViewerScene inputs={inputs} apiRef={api} layerRef={layer} onViewChange={onViewChange} />
            </SceneShell>
          </SceneBoundary>

          {/* the view border plots itself in when scrolled to */}
          <PlotFrame className="inset-0 z-[1]" duration={1.2} />
          {/* …and the model is plotted in behind a sweeping scan line */}
          <PlotScan />

          {/* drafting annotations (imperative SVG + labels, re-projected each rendered frame) */}
          <div ref={overlayRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden text-fg" />

          {/* HUD */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-2.5 sm:p-3">
            <div className="hidden min-w-0 sm:block">
              <p className="font-mono text-[11px] leading-4 tracking-[0.08em] text-fg uppercase">
                View 1 · {view ? VIEW_LABEL[view] : "Custom"}
              </p>
              <p className="font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
                Orthographic · grid 24 mm
                {cut > 0 ? ` · Section A–A ${cutDisplay}` : ""}
              </p>
            </div>
            <div className="pointer-events-auto ml-auto">
              <HaloSegmented items={VIEW_ITEMS} value={view ?? ""} onValueChange={selectView} aria-label="Standard view" size="sm" />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-2.5 sm:p-3">
            <ConceptModelCaption className="max-w-[26ch] sm:max-w-none" />
            <div className="pointer-events-auto flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => api.current?.zoomBy(1 / 1.25)}
                className="grid size-9 place-items-center rounded-sm border border-border-ui bg-bg font-mono text-[15px] text-fg hover:bg-surface-2"
              >
                −
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => api.current?.zoomBy(1.25)}
                className="grid size-9 place-items-center rounded-sm border border-border-ui bg-bg font-mono text-[15px] text-fg hover:bg-surface-2"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => api.current?.fit()}
                className="h-9 rounded-sm border border-border-ui bg-bg px-2.5 font-mono text-[11px] tracking-[0.08em] text-fg uppercase hover:bg-surface-2"
              >
                Fit
              </button>
            </div>
          </div>
          <p
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 top-14 px-3 text-center sm:top-auto sm:bottom-14 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase transition-opacity duration-[420ms]",
              touched ? "opacity-0" : "opacity-100",
            )}
          >
            <span className="hidden pointer-fine:inline">Drag to orbit · right-drag to pan · ⌘/Ctrl + scroll to zoom</span>
            <span className="pointer-fine:hidden">Swipe sideways to turn · pinch to zoom</span>
          </p>
        </div>
      </div>

      {/* controls */}
      <div ref={controlsRef} className="order-3 lg:col-span-8 lg:row-start-3" onPointerDownCapture={stopDemo} onKeyDownCapture={stopDemo}>
        <div className="grid gap-x-8 gap-y-5 border border-fg bg-bg px-4 pt-4 pb-3 sm:grid-cols-2 sm:px-5">
          <RulerRange
            id="cad-explode"
            label="Explode"
            value={explode}
            onValueChange={(v) => {
              setExplode(v);
              setTouched(true);
            }}
            display={`${fmtInt(explode * 100).padStart(3, "0")} %`}
            valueText={`${fmtInt(explode * 100)} percent exploded`}
            ticks={EXPLODE_TICKS}
          />
          <RulerRange
            id="cad-section"
            label={
              <>
                Section A–A <span className="sr-only">(cutting plane)</span>
              </>
            }
            value={cut}
            onValueChange={(v) => {
              stopDemo();
              setCut(v);
              setTouched(true);
            }}
            display={cutDisplay}
            valueText={cutText}
            ticks={SECTION_TICKS}
            snaps={[CL]}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3 sm:col-span-2">
            <p className="max-w-[60ch] text-[13px] leading-5 text-fg-muted">
              {cut > 0
                ? "Hatched faces are where the plane cuts solid material — the ball path runs up the centreline."
                : explode > 0.12
                  ? "Balloons number the subsystems; the parts list uses the same numbers."
                  : "Dimensions are the team's numbers: the R102 start cube, the 14 in muzzle and the fixed 40° hood."}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" aria-pressed={dims} onClick={() => setDims((d) => !d)} className="font-mono text-[11px] tracking-[0.08em] uppercase">
                <span aria-hidden="true" className={cn("size-1.5 rounded-full", dims ? "bg-fg" : "border border-border-ui")} />
                Dimensions
              </Button>
              <Button variant="ghost" size="sm" onClick={reset} className="font-mono text-[11px] tracking-[0.08em] uppercase">
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
