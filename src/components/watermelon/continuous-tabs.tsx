'use client';

// Continuous Tabs (base) — from Watermelon UI (https://ui.watermelon.sh), MIT License ·
// Copyright (c) 2025-present Watermelon Contributors.
// Adapted for Apex Robotics (Team filter: ALL · LEAD · CAD · CODE · BUILD · SOCIALS):
//   • renders on the server (the original returned null until mounted → layout shift)
//   • real tabs: role=tablist/tab, aria-selected, aria-controls, roving tabindex, ←/→/Home/End
//   • unique layoutId per instance; hairline track, 2px radius, mono uppercase labels with
//     optional counts; active pill = surface-2 + border-ui with a 1px pollen tick; servo spring
//   • controlled (`value` / `onValueChange`) or uncontrolled (`defaultActiveId`)
//
//   <ContinuousTabs aria-label="Filter by discipline" panelId="team-grid"
//     tabs={[{ id: "all", label: "All", count: 12 }, { id: "cad", label: "CAD", count: 7 }]}
//     value={filter} onValueChange={setFilter} />

import { useId, useRef, useState, type FC, type KeyboardEvent } from 'react';
import { motion, LayoutGroup, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  /** Optional count shown after the label (e.g. roster size). */
  count?: number;
}

export interface ContinuousTabsProps {
  tabs: TabItem[];
  value?: string;
  defaultActiveId?: string;
  onValueChange?: (id: string) => void;
  /** Legacy Watermelon prop. */
  onChange?: (id: string) => void;
  /** id of the element the tabs control (the filtered grid / panel). */
  panelId?: string;
  'aria-label'?: string;
  className?: string;
}

const servo = { type: 'spring' as const, stiffness: 260, damping: 30, mass: 1 };

export const ContinuousTabs: FC<ContinuousTabsProps> = ({
  tabs,
  value,
  defaultActiveId,
  onValueChange,
  onChange,
  panelId,
  'aria-label': ariaLabel,
  className,
}) => {
  const uid = useId();
  const reduce = useReducedMotion();
  const [internal, setInternal] = useState<string>(defaultActiveId ?? tabs[0]?.id ?? '');
  const active = value ?? internal;
  const refs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const select = (id: string, focus = false) => {
    if (value === undefined) setInternal(id);
    onValueChange?.(id);
    onChange?.(id);
    if (focus) refs.current.get(id)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = tabs.findIndex((t) => t.id === active);
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    if (n >= 0) {
      e.preventDefault();
      select(tabs[n].id, true);
    }
  };

  return (
    <LayoutGroup id={uid}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          'relative inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-sm border border-hairline bg-bg p-0.5',
          className,
        )}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) refs.current.set(tab.id, el);
                else refs.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              id={`${uid}-${tab.id}`}
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={onKeyDown}
              className={cn(
                'relative flex min-h-10 shrink-0 items-center gap-2 rounded-sm px-3.5 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors duration-[120ms]',
                isActive ? 'text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="ct-pill"
                  transition={reduce ? { duration: 0 } : servo}
                  className="absolute inset-0 rounded-sm border border-border-ui bg-surface-2"
                >
                  <span className="absolute inset-x-3 -bottom-px h-px bg-pollen-line" />
                </motion.span>
              )}
              <span className="relative z-10">{tab.label}</span>
              {tab.count !== undefined && (
                <span className="relative z-10 text-fg-muted tabular-nums">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
};

export default ContinuousTabs;
