"use client"

// Direction Aware Tabs — from Cult UI (https://www.cult-ui.com/docs/components/direction-aware-tabs)
// MIT License · Copyright (c) 2023 Jordan Gilliam.
// Adapted for Apex Robotics (CAD assembly switcher):
//   • real tabs: role=tablist/tab/tabpanel, aria-selected, aria-controls, roving tabindex,
//     ←/→/Home/End keys; unique layoutId per instance (useId + LayoutGroup)
//   • tokens: hairline track, 2px radius, mono uppercase labels, active = surface-2 bubble with
//     a 1px pollen tick; no neutral greys, no blend modes, no shadows
//   • content slides 48px (was 300px) on the servo spring; reduced motion → crossfade only
//   • controlled (`value` / `onValueChange`) or uncontrolled (`defaultValue`)
//
//   <DirectionAwareTabs aria-label="Assembly"
//     tabs={[{ id: 0, label: "Full assembly", content: <… /> }, { id: 1, label: "Drivetrain", content: <… /> }]}
//     onValueChange={(id) => setAssembly(id)} />

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react"
import useMeasure from "react-use-measure"

import { cn } from "@/lib/utils"

type Tab = {
  id: number
  label: string
  content: ReactNode
}

interface DirectionAwareTabsProps {
  tabs: Tab[]
  className?: string
  /** Extra classes for the tab track. */
  trackClassName?: string
  value?: number
  defaultValue?: number
  onValueChange?: (id: number) => void
  /** Legacy Cult callback (fires on every change). */
  onChange?: () => void
  "aria-label"?: string
  /** Kept for API compatibility (radius is fixed at 2px by the design system). */
  rounded?: string
  roundedInner?: string
}

const servo = { type: "spring" as const, stiffness: 260, damping: 30, mass: 1 }

function DirectionAwareTabs({
  tabs,
  className,
  trackClassName,
  value,
  defaultValue,
  onValueChange,
  onChange,
  "aria-label": ariaLabel,
}: DirectionAwareTabsProps) {
  const uid = useId()
  const reduce = useReducedMotion()
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.id ?? 0)
  const activeTab = value ?? internal
  const [direction, setDirection] = useState(0)
  const [ref, bounds] = useMeasure()
  const buttons = useRef<Map<number, HTMLButtonElement>>(new Map())

  const content = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.content ?? null, [activeTab, tabs])

  const select = (newTabId: number, focus = false) => {
    if (newTabId === activeTab) return
    setDirection(tabs.findIndex((t) => t.id === newTabId) > tabs.findIndex((t) => t.id === activeTab) ? 1 : -1)
    if (value === undefined) setInternal(newTabId)
    onValueChange?.(newTabId)
    onChange?.()
    if (focus) buttons.current.get(newTabId)?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = tabs.findIndex((t) => t.id === activeTab)
    let next = -1
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = tabs.length - 1
    if (next >= 0) {
      e.preventDefault()
      select(tabs[next].id, true)
    }
  }

  const slide = reduce ? 0 : 48
  const variants = {
    initial: (d: number) => ({ x: slide * d, opacity: 0, filter: reduce ? "blur(0px)" : "blur(2px)" }),
    active: { x: 0, opacity: 1, filter: "blur(0px)" },
    exit: (d: number) => ({ x: -slide * d, opacity: 0, filter: reduce ? "blur(0px)" : "blur(2px)" }),
  }

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <LayoutGroup id={uid}>
        <div
          role="tablist"
          aria-label={ariaLabel}
          className={cn("inline-flex max-w-full gap-0.5 self-start overflow-x-auto rounded-sm border border-hairline bg-bg p-0.5", trackClassName)}
        >
          {tabs.map((tab) => {
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) buttons.current.set(tab.id, el)
                  else buttons.current.delete(tab.id)
                }}
                type="button"
                role="tab"
                id={`${uid}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${uid}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(tab.id)}
                onKeyDown={onKeyDown}
                className={cn(
                  "relative flex min-h-10 shrink-0 items-center gap-2 rounded-sm px-3.5 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors duration-[120ms]",
                  selected ? "text-fg" : "text-fg-muted hover:text-fg"
                )}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {selected && (
                  <motion.span
                    layoutId="dat-bubble"
                    className="absolute inset-0 z-0 rounded-sm border border-border-ui bg-surface-2"
                    transition={reduce ? { duration: 0 } : servo}
                  >
                    <span className="absolute inset-x-3 -bottom-px h-px bg-pollen-line" />
                  </motion.span>
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </LayoutGroup>
      <motion.div
        className="relative w-full overflow-hidden"
        initial={false}
        animate={{ height: bounds.height || "auto" }}
        transition={reduce ? { duration: 0 } : servo}
      >
        <div
          ref={ref}
          role="tabpanel"
          id={`${uid}-panel`}
          aria-labelledby={`${uid}-tab-${activeTab}`}
          tabIndex={0}
          className="pt-4 outline-none"
        >
          <AnimatePresence custom={direction} mode="popLayout" initial={false}>
            <motion.div
              key={activeTab}
              variants={variants}
              initial="initial"
              animate="active"
              exit="exit"
              custom={direction}
              transition={reduce ? { duration: 0.15 } : servo}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export { DirectionAwareTabs }
export type { Tab as DirectionAwareTab }
