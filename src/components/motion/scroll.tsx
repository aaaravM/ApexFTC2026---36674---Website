"use client";

// Scroll-linked motion (transform-only; static under reduced motion).
//
// Parallax — content drifts against the scroll a little. Keep speeds small (0.05–0.2).
//   <Parallax speed={0.12}><BigFigure … /></Parallax>
//
// ScrollProgress — a 1px pollen line under the header that fills as you read a long page.
//   <ScrollProgress />   (render once per long page)
//
// Stagger / StaggerItem — children rise in sequence when the group scrolls into view (max 6 steps,
// later items arrive together). Use below the fold; above-the-fold content should not wait.
//   <Stagger className="grid grid-cols-3 gap-6">{items.map(i => <StaggerItem key={i.id}>…</StaggerItem>)}</Stagger>
//
// Magnetic — a control leans toward a fine pointer (max a few px) and springs back.
//   <Magnetic><Button>View the code</Button></Magnetic>

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { useFinePointer, useMounted } from "@/lib/hooks";
import { dur, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Reduced motion, applied only after hydration: the server and the hydrating client render the
 *  same markup (motion's useReducedMotion() is null on the server but true on a reduced-motion
 *  client, which would otherwise mismatch and leave staggered items stuck at opacity 0). */
function useReduceAfterMount() {
  const mounted = useMounted();
  return (useReducedMotion() ?? false) && mounted;
}

export function Parallax({
  children,
  speed = 0.12,
  className,
}: {
  children: ReactNode;
  /** Fraction of a viewport the content travels across its whole pass (default 0.12). */
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReduceAfterMount();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 50}vh`, `${-speed * 50}vh`]);
  return (
    <motion.div ref={ref} className={className} style={{ y: reduce ? 0 : y }}>
      {children}
    </motion.div>
  );
}

export function ScrollProgress({
  className,
  target,
}: {
  className?: string;
  /**
   * CSS selector of one section to track instead of the whole page: the line fills while that
   * section scrolls past and stays full afterwards (home: `target="#home-story"` — the line ends
   * with the scroll animation, then runs all the way across for the rest of the page).
   */
  target?: string;
}) {
  const { scrollY, scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  const metrics = useRef<{ top: number; span: number } | null>(null);

  useLayoutEffect(() => {
    if (!target) return;
    const el = document.querySelector<HTMLElement>(target);
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      metrics.current = { top: r.top + window.scrollY, span: Math.max(1, el.offsetHeight - window.innerHeight) };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [target]);

  const sectionProgress = useTransform(scrollY, (y) => {
    const m = metrics.current;
    return m ? Math.min(1, Math.max(0, (y - m.top) / m.span)) : 0;
  });
  const source = target ? sectionProgress : scrollYProgress;
  const smooth = useSpring(source, { stiffness: 220, damping: 40, mass: 0.5 });
  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-[var(--header-h)] z-[49] h-px origin-left bg-pollen-line",
        className,
      )}
      style={{ scaleX: reduce ? source : smooth }}
    />
  );
}

const ReduceCtx = createContext(false);

const group: Variants = {
  hidden: {},
  show: (delayChildren: number = 0) => ({
    transition: { staggerChildren: 0.06, delayChildren },
  }),
};
const groupInstant: Variants = { hidden: {}, show: {} };

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: dur.medium * 1.6, ease: ease.out } },
};
const itemInstant: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0 } },
};

type StaggerTag = "div" | "ul" | "ol" | "section" | "dl";
type ItemTag = "div" | "li" | "article" | "dd" | "dt";

export function Stagger({
  children,
  className,
  as = "div",
  delay = 0,
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  as?: StaggerTag;
  delay?: number;
  amount?: number;
}) {
  const reduce = useReduceAfterMount();
  const M = motion[as];
  return (
    <ReduceCtx.Provider value={reduce}>
      <M
        className={className}
        variants={reduce ? groupInstant : group}
        custom={delay}
        initial="hidden"
        {...(reduce ? { animate: "show" } : { whileInView: "show", viewport: { once: true, amount } })}
      >
        {children}
      </M>
    </ReduceCtx.Provider>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: ItemTag }) {
  const reduce = useContext(ReduceCtx);
  const M = motion[as];
  return (
    <M className={className} variants={reduce ? itemInstant : item}>
      {children}
    </M>
  );
}

export function Magnetic({
  children,
  strength = 0.22,
  max = 6,
  className,
}: {
  children: ReactNode;
  strength?: number;
  /** Max travel in px. */
  max?: number;
  className?: string;
}) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 });
  const active = fine && !reduce;
  const clamp = (v: number) => Math.max(-max, Math.min(max, v));
  return (
    <motion.span
      className={cn("inline-block", className)}
      style={active ? { x: sx, y: sy } : undefined}
      onPointerMove={
        active
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              x.set(clamp((e.clientX - (r.left + r.width / 2)) * strength));
              y.set(clamp((e.clientY - (r.top + r.height / 2)) * strength));
            }
          : undefined
      }
      onPointerLeave={
        active
          ? () => {
              x.set(0);
              y.set(0);
            }
          : undefined
      }
    >
      {children}
    </motion.span>
  );
}
