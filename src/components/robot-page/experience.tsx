"use client";

// The sticky walkthrough of /robot (DESIGN_SPEC §5 ROBOT): text column on the left, the 3D stage
// pinned on the right (on phones: pinned on top, text scrolling underneath).
//
//   [ hero ]            [                    ]
//   [ 01 DRIVE ]        [   sticky 3D stage  ]   ← one WebGL context for the whole page
//   [ … 08 ELECTRONICS] [                    ]
//   [ 09 AIM ]          [                    ]
//
// Built on cult-ui's feature-sticky-section (Root / Panel / Trigger). The active stop is computed
// from the scroll position with the same function the 3D scene uses (./pose), so the parts list,
// the outline on the robot and the camera never disagree — and it still works without WebGL.

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { StickySection } from "@/components/ui/feature-sticky-section";
import { useMediaQuery, usePrefersReducedMotion, useScrollTo } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { SubsystemId } from "@/content/robot";
import { AimPanel } from "./aim-panel";
import { AIM_STOP, STOPS } from "./data";
import { scrollPose } from "./pose";
import { RobotStage } from "./stage";
import { RobotPageStore, type ViewMode } from "./store";

const noop = () => {};

function subscribeHtmlClass(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}
/** "light" | "dark" from the class next-themes puts on <html> (follows the theme toggle live). */
function useHtmlTone(): "dark" | "light" {
  return useSyncExternalStore(
    subscribeHtmlClass,
    () => (document.documentElement.classList.contains("light") ? "light" : "dark"),
    () => "dark",
  );
}

export interface RobotExperienceProps {
  hero: ReactNode;
  panels: { id: SubsystemId; content: ReactNode }[];
}

export function RobotExperience({ hero, panels }: RobotExperienceProps) {
  const [store] = useState(() => new RobotPageStore());
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<ViewMode>("assembled");
  const reduced = usePrefersReducedMotion();
  const desktop = useMediaQuery("(min-width: 1024px)", true);
  const tone = useHtmlTone();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const scrollTo = useScrollTo();

  // DOM → scene inputs
  useLayoutEffect(() => {
    store.setInputs({ mode, reduced, stacked: !desktop, active });
  }, [store, mode, reduced, desktop, active]);

  // Where each stop is "centred", in scroll pixels. Subsystem panels: their centre meets the
  // centre of the reading band (beside the stage on desktop, under it on phones) — or, when a
  // panel is taller than the band, its top meets the top of the band so it reads from the start.
  // AIM: its top reaches the band so the controls come first. Re-measured on resize / reflow.
  useEffect(() => {
    const root = section.current;
    if (!root) return;
    let raf = 0;
    let sraf = 0;

    // active stop from the scroll position (rAF-throttled; React only hears about changes)
    const sync = () => {
      sraf = 0;
      const ys = store.stops.map((s) => s.y);
      if (ys.length !== STOPS.length) return;
      setActive(scrollPose(ys, window.scrollY).nearest);
    };
    const onScroll = () => {
      if (!sraf) sraf = requestAnimationFrame(sync);
    };

    const measure = () => {
      raf = 0;
      const els = Array.from(root.querySelectorAll<HTMLElement>("[data-robot-stop]")).sort(
        (a, b) => Number(a.dataset.robotStop) - Number(b.dataset.robotStop),
      );
      if (els.length !== STOPS.length) return;
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 56;
      const vh = window.innerHeight;
      const stageH = stage.current?.getBoundingClientRect().height ?? 0;
      const bandTop = desktop ? header : header + stageH;
      const centre = (bandTop + vh) / 2;
      const bandH = vh - bandTop;
      let prev = -1;
      store.setStops(
        els.map((el, i) => {
          const r = el.getBoundingClientRect();
          const top = r.top + window.scrollY;
          const topAligned = i === AIM_STOP || r.height > bandH + 1;
          let y = i === 0 ? 0 : topAligned ? top - bandTop - 8 : top + r.height / 2 - centre;
          y = Math.max(prev + 1, y);
          prev = y;
          return { y };
        }),
      );
      sync();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", onScroll, { passive: true });
    schedule();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (sraf) cancelAnimationFrame(sraf);
    };
  }, [store, desktop]);

  // click a part of the 3D robot → scroll to its panel
  useEffect(() => {
    store.setOnPick((i) => {
      const id = STOPS[i]?.domId;
      if (id) scrollTo(`#${id}`);
    });
    return () => {
      store.setOnPick(null);
    };
  }, [store, scrollTo]);

  return (
    <StickySection.Root value={active} onValueChange={noop} asChild>
      <section
        ref={section}
        aria-label="APEX-R1, subsystem by subsystem"
        className="robot-walkthrough container-page grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-[var(--gutter)]"
        style={{ "--stage-h": "clamp(260px, 44svh, 480px)" } as CSSProperties}
      >
        {/* hero (stop 0) */}
        <StickySection.Panel index={0} data-robot-stop={0} className="relative lg:col-start-1 lg:row-start-1">
          <span id={STOPS[0].domId} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-px" />
          {hero}
        </StickySection.Panel>

        {/* the stage */}
        <div
          ref={stage}
          className={cn(
            "z-20 max-lg:sticky max-lg:top-[var(--header-h)] max-lg:-mx-[var(--page-margin)] max-lg:h-[var(--stage-h)] max-lg:border-y max-lg:border-hairline max-lg:bg-bg",
            "lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:-mr-[var(--page-margin)]",
          )}
        >
          <div className="h-full lg:sticky lg:top-[var(--header-h)] lg:h-[calc(100svh-var(--header-h))]">
            <RobotStage store={store} active={active} mode={mode} onModeChange={setMode} tone={tone} reduced={reduced} />
          </div>
          {/* phones: a soft edge so text slides under the stage cleanly */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-6 bg-linear-to-b from-bg to-transparent lg:hidden" />
        </div>

        {/* subsystem panels + AIM */}
        <StickySection.Content className="lg:col-start-1 lg:row-start-2">
          {panels.map((p, n) => {
            const stop = STOPS[n + 1];
            return (
              <StickySection.Panel
                key={p.id}
                index={n + 1}
                data-robot-stop={n + 1}
                className="relative flex min-h-[60svh] flex-col justify-center border-t border-hairline py-14 lg:min-h-[calc(100svh-var(--header-h))] lg:py-20"
              >
                <StopAnchor id={stop.domId} />
                {p.content}
              </StickySection.Panel>
            );
          })}
          <StickySection.Panel
            index={AIM_STOP}
            data-robot-stop={AIM_STOP}
            className="relative flex min-h-[calc(100svh-var(--header-h))] flex-col border-t border-hairline pt-14 pb-20 lg:pt-16 lg:pb-24"
          >
            <StopAnchor id={STOPS[AIM_STOP].domId} />
            <AimPanel store={store} />
          </StickySection.Panel>
        </StickySection.Content>
      </section>
    </StickySection.Root>
  );
}

/**
 * Scroll target for `#robot-<id>` (⌘K palette, the section navigator, hash links): a 1px-wide
 * strip as tall as the panel, so the navigator's IntersectionObserver always sees whichever stop
 * is under its band, even on a fast fling. On phones it is shifted up by one stage height, so
 * jumping to it lands the panel just BELOW the pinned stage instead of underneath it.
 */
function StopAnchor({ id }: { id: string }) {
  return (
    <span
      id={id}
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 w-px scroll-mt-[var(--header-h)] max-lg:-top-[calc(var(--stage-h)+16px)] max-lg:bottom-[calc(var(--stage-h)+16px)]"
    />
  );
}
