"use client";

// SceneShell — the ONE way to mount an R3F <Canvas> on this site (DESIGN_SPEC §4, §9).
//
//   <SceneShell poster={<RobotPoster />} className="absolute inset-0" camera={{ fov: 30 }}>
//     <Robot … />                      ← children render inside the Canvas
//   </SceneShell>
//
// What it does for you:
//   • browser-only: the static HTML (and the prerender) carries `poster`, the canvas mounts in the
//     browser via React 19.3 `use(browser())` inside <Suspense> — no SSR WebGL, no hydration risk
//   • pauses rendering when the route is hidden by <Activity> (cacheComponents keeps up to 3
//     visited routes mounted; a plain Canvas keeps calling gl.render — lab-verified) and when the
//     canvas scrolls offscreen (IntersectionObserver) → frameloop "never"; resumes on show
//   • clamps dpr to [1, 1.75]; antialias on; transparent clear (the page --bg shows through)
//   • keeps the poster on top until the first frames have rendered, then fades it out (≤250ms),
//     and marks <html data-scene-ready="1"> for Playwright QA
//   • `frameloop` prop: "always" (default) or "demand"; it is restored when shown again
//   • reduced motion is NOT handled here (scenes decide: no idle animation, no scroll scrub)
//
// One WebGL context per page. Never put a canvas per card (Chrome kills the oldest at 16).

import { Canvas, type CanvasProps, type RootState } from "@react-three/fiber";
import { Suspense, use, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { browser } from "react-dom";
import { cn } from "@/lib/utils";

export type SceneShellProps = Omit<CanvasProps, "frameloop" | "dpr"> & {
  /** Static fallback shown on the server, before WebGL is ready, and under the fade. */
  poster?: ReactNode;
  /** Wrapper classes (the wrapper is `relative`; size it here). */
  className?: string;
  /** Classes for the Canvas element itself. */
  canvasClassName?: string;
  frameloop?: "always" | "demand";
  /** Max device-pixel-ratio (default 1.75). */
  maxDpr?: number;
  /** Pause when offscreen (default true). */
  pauseOffscreen?: boolean;
  /** Accessible description of the scene (the canvas gets role="img"). */
  label?: string;
  children?: ReactNode;
};

export function SceneShell({ poster, className, label, ...rest }: SceneShellProps) {
  return (
    <div className={cn("relative", className)}>
      <Suspense fallback={poster ? <div className="absolute inset-0">{poster}</div> : null}>
        <BrowserScene poster={poster} label={label} {...rest} />
      </Suspense>
    </div>
  );
}

function BrowserScene({
  poster,
  canvasClassName,
  frameloop = "always",
  maxDpr = 1.75,
  pauseOffscreen = true,
  label,
  onCreated,
  children,
  style,
  gl,
  ...props
}: Omit<SceneShellProps, "className">) {
  use(browser("WebGL scenes only render in the browser"));

  const store = useRef<RootState | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useRef(true);
  const shown = useRef(true);
  const [ready, setReady] = useState(false);

  const apply = useCallback(() => {
    const s = store.current;
    if (!s) return;
    s.setFrameloop(visible.current && shown.current ? frameloop : "never");
    if (visible.current && shown.current && frameloop === "demand") s.invalidate();
  }, [frameloop]);

  // Activity: layout-effect cleanup runs when the route is hidden, the body re-runs when shown.
  useLayoutEffect(() => {
    shown.current = true;
    apply();
    return () => {
      shown.current = false;
      store.current?.setFrameloop("never");
    };
  }, [apply]);

  // Offscreen pause.
  useEffect(() => {
    if (!pauseOffscreen || !wrap.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = !!e?.isIntersecting;
        apply();
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(wrap.current);
    return () => io.disconnect();
  }, [pauseOffscreen, apply]);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        {...props}
        frameloop={frameloop}
        dpr={[1, maxDpr]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", ...(typeof gl === "object" ? gl : {}) }}
        className={canvasClassName}
        style={{ position: "absolute", inset: 0, ...style }}
        aria-label={label}
        role={label ? "img" : undefined}
        onCreated={(state) => {
          store.current = state;
          apply();
          onCreated?.(state);
          // two frames after creation the first image is on screen
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              setReady(true);
              document.documentElement.dataset.sceneReady = "1";
            }),
          );
        }}
      >
        {children}
      </Canvas>
      {poster && (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-[250ms] ease-out motion-reduce:transition-none",
            ready ? "opacity-0" : "opacity-100",
          )}
        >
          {poster}
        </div>
      )}
    </div>
  );
}
