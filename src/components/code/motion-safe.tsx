"use client";

// Hydration-safe twins of the motion kit's Stagger / StaggerItem / Parallax (same API and look).
// The kit versions branch on useReducedMotion() during render, which is null on the server and true
// on a reduced-motion client: React then reports a hydration mismatch and does NOT patch the
// attributes, so staggered items keep the server's `opacity: 0` and stay invisible. These render the
// same markup on the server and during hydration, and apply the reduced-motion path after mount
// (items appear at once, no parallax). Drop-in: switch the import back to "@/components/motion"
// once the kit is fixed.

import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "motion/react";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { useMounted } from "@/lib/hooks";
import { dur, ease } from "@/lib/motion";

function useReduceAfterMount() {
  const mounted = useMounted();
  return (useReducedMotion() ?? false) && mounted;
}

const ReduceCtx = createContext(false);

const group: Variants = {
  hidden: {},
  show: (delayChildren: number = 0) => ({ transition: { staggerChildren: 0.06, delayChildren } }),
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

export function Parallax({ children, speed = 0.12, className }: { children: ReactNode; speed?: number; className?: string }) {
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
