"use client";

// Hydration-safe twins of the motion kit's Stagger / StaggerItem / Parallax, used by /outreach and
// /sponsors. Same look and API as src/components/motion/scroll.tsx.
//
// Why: the kit's Stagger renders a plain static element when useReducedMotion() is true, but the
// server (no media query) renders the motion version with the items' hidden styles (opacity 0). The
// client tree then hydrates with a mismatch React does not patch, and under reduced motion every
// staggered item stays INVISIBLE. These versions render identical markup on server and client:
//   • Stagger/StaggerItem always use variants; reduced motion is handled by the root
//     <MotionConfig reducedMotion="user"> (no rise, just a short fade in).
//   • Parallax always binds its motion value; reduced motion is read after mount (a ref), so the
//     first render matches the server and the drift is 0 from the first scroll on.
// (Reported to integration — once the kit is fixed these can be swapped back to "@/components/motion".)

import { motion, useScroll, useTransform, type Variants } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { dur, ease } from "@/lib/motion";

const group: Variants = {
  hidden: {},
  show: (delayChildren: number = 0) => ({ transition: { staggerChildren: 0.06, delayChildren } }),
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: dur.medium * 1.6, ease: ease.out } },
};

type StaggerTag = "div" | "ul" | "ol" | "dl";
type ItemTag = "div" | "li" | "dd" | "dt";

export function Stagger({
  children,
  className,
  as = "div",
  delay = 0,
  amount = 0.2,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  as?: StaggerTag;
  delay?: number;
  amount?: number;
  "aria-label"?: string;
}) {
  const M = motion[as];
  return (
    <M
      className={className}
      aria-label={ariaLabel}
      variants={group}
      custom={delay}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </M>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: ItemTag }) {
  const M = motion[as];
  return (
    <M className={className} variants={item}>
      {children}
    </M>
  );
}

export function Parallax({ children, speed = 0.12, className }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useRef(false);
  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, (p) => (reduce.current ? "0vh" : `${(speed * 50 * (1 - 2 * p)).toFixed(3)}vh`));
  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}
