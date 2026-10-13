'use client';

// Scroll Island (base) — from Watermelon UI (https://ui.watermelon.sh), MIT License ·
// Copyright (c) 2025-present Watermelon Contributors.
// Refactored for Apex Robotics as a page section navigator (Meet the Robot, Code, Outreach):
//   • reads the WINDOW scroll (works with Lenis) instead of rendering its own scroll container;
//     the label shows the CURRENT section (IntersectionObserver over your section ids)
//   • the conic-gradient ring is a hairline SVG progress ring; percent in mono; 2px corners
//   • topic clicks scroll via Lenis (offset for the header; instant under reduced motion)
//   • a11y: real buttons, aria-expanded/aria-controls, Esc closes and returns focus, no portal
//     hacks; the styled-jsx block is gone (nothing global injected)
//   • width clamps to min(400px, 100vw − 32px); appears after `showAfter` px of scroll
//
//   <ScrollIsland topics={subsystems.map((s) => ({ id: `robot-${s.id}`, title: s.name, meta: s.code }))} />

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import useMeasure from 'react-use-measure';
import { useScrollTo } from '@/lib/hooks';
import { cn } from '@/lib/utils';

export interface Topic {
  /** DOM id of the section (prefix per page: "robot-turret"). */
  id: string;
  title: string;
  /** Optional mono meta shown in the open list ("±170° · 5:1"). */
  meta?: string;
  /** Legacy Watermelon field (unused). */
  content?: string;
}

export interface ScrollIslandProps {
  topics: Topic[];
  /** Label before any section is active. */
  label?: string;
  /** Hide until the page has scrolled this many px (default 240). */
  showAfter?: number;
  className?: string;
}

const spring = { type: 'spring' as const, stiffness: 260, damping: 30, mass: 1 };

export function ScrollIsland({ topics, label = 'Index', showAfter = 240, className }: ScrollIslandProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ref, bounds] = useMeasure({ offsetSize: true });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const scrollTo = useScrollTo();
  const { scrollY, scrollYProgress } = useScroll();

  useMotionValueEvent(scrollYProgress, 'change', (v) => setProgress(Math.round(v * 100)));
  useMotionValueEvent(scrollY, 'change', (y) => setVisible(y > showAfter));

  // Current section = the last one whose top has passed 35% of the viewport.
  useEffect(() => {
    const els = topics.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveId(e.target.id);
      },
      { rootMargin: '-35% 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [topics]);

  // Esc closes and returns focus.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const current = topics.find((t) => t.id === activeId);
  const r = 9;
  const circ = 2 * Math.PI * r;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[39] bg-bg/50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 top-[calc(var(--header-h)+12px)] z-40 flex justify-center px-4 transition-[opacity,translate] duration-[420ms] ease-out motion-reduce:transition-none',
          visible || isOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
          className,
        )}
      >
        <motion.div
          className="pointer-events-auto flex flex-col overflow-hidden rounded-sm border border-hairline bg-surface-1"
          animate={{ height: bounds.height > 0 ? bounds.height : 'auto', width: isOpen ? 'min(400px, calc(100vw - 32px))' : 'min(260px, calc(100vw - 32px))' }}
          transition={reduce ? { duration: 0 } : spring}
          inert={!visible && !isOpen ? true : undefined}
        >
          <div ref={ref} className="flex w-full flex-col px-3">
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={isOpen}
              aria-controls={`${uid}-list`}
              onClick={() => setIsOpen((o) => !o)}
              className="group flex h-12 w-full items-center justify-between gap-4 text-left"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <svg viewBox="0 0 24 24" className="size-6 shrink-0 -rotate-90" aria-hidden="true">
                  <circle cx="12" cy="12" r={r} fill="none" stroke="var(--hairline)" strokeWidth="1.5" />
                  <circle
                    cx="12"
                    cy="12"
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray={`${(progress / 100) * circ} ${circ}`}
                  />
                </svg>
                <span className="truncate font-mono text-[11px] tracking-[0.08em] text-fg uppercase">{current?.title ?? label}</span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={reduce ? { duration: 0 } : spring} className="text-fg-muted group-hover:text-fg">
                  <ChevronDown size={14} aria-hidden="true" />
                </motion.span>
              </span>
              <span className="font-mono text-[11px] text-fg-muted tabular-nums">
                {progress}%<span className="sr-only"> scrolled</span>
              </span>
            </button>

            <AnimatePresence mode="popLayout" initial={false}>
              {isOpen && (
                <motion.ul
                  id={`${uid}-list`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  data-lenis-prevent=""
                  className="max-h-[min(60dvh,420px)] w-full overflow-y-auto border-t border-hairline py-2"
                >
                  {topics.map((t, i) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        aria-current={t.id === activeId ? 'location' : undefined}
                        onClick={() => {
                          setIsOpen(false);
                          scrollTo(`#${CSS.escape(t.id)}`);
                        }}
                        className={cn(
                          'grid w-full grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-sm px-2 py-2 text-left text-[14px] transition-colors',
                          t.id === activeId ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:text-fg',
                        )}
                      >
                        <span className="font-mono text-[10px] text-fg-muted tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                        <span className="truncate">{t.title}</span>
                        {t.meta && <span className="font-mono text-[10px] tracking-[0.06em] text-fg-muted uppercase">{t.meta}</span>}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default ScrollIsland;
