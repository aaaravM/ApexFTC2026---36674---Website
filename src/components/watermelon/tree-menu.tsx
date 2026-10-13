'use client';

// Tree Menu (base) — from Watermelon UI (https://ui.watermelon.sh), MIT License ·
// Copyright (c) 2025-present Watermelon Contributors.
// Adapted for Apex Robotics ("Explore the codebase" on /code):
//   • mono paths, folder / file glyphs, right-aligned meta (line counts), breadcrumb as a path
//     ("TeamCode/ subsystems/"); 2px radius, tokens only; react-icons → lucide
//   • a11y: real buttons, aria-current on the selected file, a polite live region announcing
//     the folder you moved into; reduced motion respected via <MotionConfig reducedMotion="user">
//   • mechanics unchanged: items above the clicked one fly up, below fly down, the label morphs
//     into the breadcrumb (layoutId, namespaced per instance)
//
//   <TreeMenu menuData={toMenu(codebaseTree)} onSelect={(item) => setFile(item.id)} />

import { useId, useRef, useState, type FC } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { CornerUpLeft, FileCode2, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MenuItem {
  id: string;
  label: string;
  /** Right-aligned meta, e.g. "582 lines". */
  meta?: string;
  /** One-line description (shown under the label for files). */
  description?: string;
  children?: MenuItem[];
}

interface TreeMenuProps {
  menuData?: MenuItem[];
  onSelect?: (item: MenuItem) => void;
  /** Root label shown in the breadcrumb ("TeamCode"). */
  rootLabel?: string;
  className?: string;
}

export const TreeMenu: FC<TreeMenuProps> = ({ menuData = [], onSelect, rootLabel = 'TeamCode', className }) => {
  const uid = useId();
  const [path, setPath] = useState<MenuItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const clickedIndexRef = useRef<number | null>(null);

  const currentItems = path.length === 0 ? menuData : path[path.length - 1].children || [];

  const handleNavigateForward = (item: MenuItem, index: number) => {
    if (item.children?.length) {
      clickedIndexRef.current = index;
      setPath((prev) => [...prev, item]);
      setActiveItemId(null);
      setAnnounce(`Opened ${[rootLabel, ...path.map((p) => p.label), item.label].join('/')}`);
    } else {
      setActiveItemId(item.id);
      onSelect?.(item);
    }
  };

  const handleNavigateBack = (index: number) => {
    clickedIndexRef.current = null;
    setPath((prev) => prev.slice(0, index));
    setAnnounce(`Back to ${[rootLabel, ...path.slice(0, index).map((p) => p.label)].join('/')}`);
  };

  const containerVariants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.04 } },
    exit: {},
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: (index: number) => {
      const clicked = clickedIndexRef.current;
      if (clicked !== null) {
        if (index < clicked) return { opacity: 0, y: -80, transition: { duration: 0.3, ease: [0.55, 0, 1, 0.45] } };
        if (index > clicked) return { opacity: 0, y: 80, transition: { duration: 0.3, ease: [0.55, 0, 1, 0.45] } };
        return { opacity: 0, transition: { duration: 0.2 } };
      }
      return { opacity: 0, y: -8, transition: { duration: 0.2 } };
    },
  };

  return (
    <div className={cn('flex w-full flex-col', className)}>
      {/* Breadcrumb */}
      <nav aria-label="Folder path" className="mb-4 flex flex-wrap items-center gap-1 font-mono text-[12px]">
        <button
          type="button"
          onClick={() => handleNavigateBack(0)}
          disabled={path.length === 0}
          className="rounded-sm px-1.5 py-1 text-fg-muted hover:text-fg disabled:text-fg disabled:opacity-100"
        >
          {rootLabel}/
        </button>
        <AnimatePresence mode="popLayout">
          {path.map((item, idx) => (
            <motion.button
              key={`path-${item.id}`}
              type="button"
              layout="position"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4, transition: { duration: 0.25 } }}
              onClick={() => handleNavigateBack(idx + 1)}
              disabled={idx === path.length - 1}
              className="flex items-center gap-1 rounded-sm px-1.5 py-1 text-fg-muted hover:text-fg disabled:text-fg"
            >
              <motion.span layoutId={`${uid}-name-${item.id}`} className="inline-block max-w-48 truncate">
                {item.label}/
              </motion.span>
            </motion.button>
          ))}
        </AnimatePresence>
        {path.length > 0 && (
          <button
            type="button"
            onClick={() => handleNavigateBack(path.length - 1)}
            aria-label="Up one folder"
            className="ml-auto inline-flex size-8 items-center justify-center rounded-sm border border-hairline text-fg-muted hover:border-border-ui hover:text-fg"
          >
            <CornerUpLeft className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </nav>

      {/* List */}
      <div className="relative border-t border-hairline">
        <AnimatePresence mode="popLayout">
          <motion.ul
            key={path.length === 0 ? 'root' : path[path.length - 1].id}
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex w-full flex-col"
          >
            {currentItems.map((item, index) => {
              const hasChildren = !!item.children?.length;
              const selected = activeItemId === item.id;
              return (
                <motion.li key={item.id} custom={index} variants={itemVariants} className="w-full border-b border-hairline">
                  <button
                    type="button"
                    onClick={() => handleNavigateForward(item, index)}
                    aria-current={selected ? 'true' : undefined}
                    aria-expanded={hasChildren ? false : undefined}
                    className={cn(
                      'group relative grid w-full grid-cols-[1.25rem_1fr_auto] items-center gap-x-3 px-2 py-3 text-left transition-colors duration-[120ms]',
                      selected ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-1 hover:text-fg',
                    )}
                  >
                    {selected && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 bg-pollen-line" />}
                    {hasChildren ? (
                      <Folder className="size-4" aria-hidden="true" strokeWidth={1.25} />
                    ) : (
                      <FileCode2 className="size-4" aria-hidden="true" strokeWidth={1.25} />
                    )}
                    <span className="min-w-0">
                      <motion.span
                        layoutId={hasChildren ? `${uid}-name-${item.id}` : undefined}
                        className={cn('inline-block font-mono text-[13px]', hasChildren ? 'text-fg' : undefined)}
                      >
                        {item.label}
                        {hasChildren ? '/' : ''}
                      </motion.span>
                      {item.description && <span className="mt-0.5 block truncate text-[13px] text-fg-muted">{item.description}</span>}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.06em] text-fg-muted tabular-nums">
                      {item.meta ?? (hasChildren ? `${item.children!.length} items` : '')}
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
};

export default TreeMenu;
