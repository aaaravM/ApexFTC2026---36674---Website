"use client"

// Feature Sticky Section — from Cult UI (https://www.cult-ui.com/docs/components/feature-sticky-section)
// MIT License · Copyright (c) 2023 Jordan Gilliam.
// Adapted for Apex Robotics (Meet the Robot subsystem walkthrough):
//   • the bundled OSSSection demo (Vite/VoidZero logos, ~470 lines) is removed
//   • trigger clicks scroll through Lenis when it is running (native smooth scroll otherwise),
//     offset for the fixed 56px header; instant under prefers-reduced-motion
//   • Wrapper uses the hairline token
// Mechanics unchanged: headless compound parts, IntersectionObserver active-panel tracking,
// controlled `value` / `onValueChange` (drive the 3D robot from it), data-state hooks,
// aria-current on the active trigger. Render all panels in the same client tree (no Suspense).
//
//   <StickySection.Root value={i} onValueChange={setI}>
//     <StickySection.List>{subsystems.map((s, n) => (
//       <StickySection.Item key={s.id} index={n}><StickySection.Trigger index={n}>{s.code}</StickySection.Trigger></StickySection.Item>))}
//     </StickySection.List>
//     <StickySection.Content>{subsystems.map((s, n) => <StickySection.Panel key={s.id} index={n} id={`robot-${s.id}`}>…</StickySection.Panel>)}</StickySection.Content>
//   </StickySection.Root>

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type ForwardedRef,
  type ReactNode,
} from "react"
import { Slot } from "@radix-ui/react-slot"
import { useControllableState } from "@radix-ui/react-use-controllable-state"
import { useLenis } from "lenis/react"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------
 * Context
 * ----------------------------------------------------------------------- */

interface StickySectionContextValue {
  activeIndex: number
  registerPanel: (index: number, el: HTMLElement | null) => void
  unregisterPanel: (index: number) => void
  scrollToPanel: (index: number) => void
}

const StickySectionContext = createContext<StickySectionContextValue | null>(
  null
)

function useStickySection() {
  const ctx = useContext(StickySectionContext)
  if (!ctx) {
    throw new Error(
      "StickySection components must be used within StickySection.Root"
    )
  }
  return ctx
}

/* -------------------------------------------------------------------------
 * Root
 * ----------------------------------------------------------------------- */

export interface StickySectionRootProps
  extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> {
  /** Controlled active index */
  value?: number
  /** Uncontrolled default active index */
  defaultValue?: number
  /** Callback when active index changes */
  onValueChange?: (value: number) => void
  /** Merge props onto child element instead of rendering a div */
  asChild?: boolean
}

const Root = ({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  asChild = false,
  children,
  ...props
}: StickySectionRootProps) => {
  const [activeIndex, setActiveIndex] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })

  const panelRefs = useRef<Map<number, HTMLElement>>(new Map())
  const isClickScrolling = useRef(false)
  const lenis = useLenis()
  const ratioMap = useRef<Map<number, number>>(new Map())

  const registerPanel = useCallback((index: number, el: HTMLElement | null) => {
    if (el) {
      panelRefs.current.set(index, el)
    } else {
      panelRefs.current.delete(index)
    }
  }, [])

  const unregisterPanel = useCallback((index: number) => {
    panelRefs.current.delete(index)
  }, [])

  const scrollToPanel = useCallback(
    (index: number) => {
      setActiveIndex(index)
      isClickScrolling.current = true
      const target = panelRefs.current.get(index)
      if (target) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const offset = -72 // fixed 56px header + breathing room
        if (lenis) {
          lenis.scrollTo(target, { offset, immediate: reduce, force: true })
        } else {
          const y = target.getBoundingClientRect().top + window.scrollY + offset
          window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" })
        }
        setTimeout(() => {
          isClickScrolling.current = false
        }, reduce ? 50 : 900)
      }
    },
    [setActiveIndex, lenis]
  )

  useEffect(() => {
    const refs = Array.from(panelRefs.current.entries())
      .sort(([a], [b]) => a - b)
      .map(([, el]) => el)
      .filter(Boolean)

    if (refs.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) {
          return
        }

        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index)
          if (!Number.isNaN(index)) {
            ratioMap.current.set(index, entry.intersectionRatio)
          }
        }

        let bestIndex = 0
        let bestRatio = -1
        for (const [idx, ratio] of ratioMap.current) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestIndex = idx
          }
        }

        if (bestRatio > 0) {
          setActiveIndex(bestIndex)
        }
      },
      {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      }
    )

    for (const ref of refs) {
      observer.observe(ref)
    }
    return () => observer.disconnect()
  }, [setActiveIndex])

  const contextValue: StickySectionContextValue = {
    activeIndex,
    registerPanel,
    unregisterPanel,
    scrollToPanel,
  }

  const Comp = asChild ? Slot : "div"

  return (
    <StickySectionContext.Provider value={contextValue}>
      <Comp data-slot="sticky-section-root" {...props}>
        {children}
      </Comp>
    </StickySectionContext.Provider>
  )
}

/* -------------------------------------------------------------------------
 * List
 * ----------------------------------------------------------------------- */

export interface StickySectionListProps extends ComponentPropsWithoutRef<"ul"> {
  asChild?: boolean
}

const List = ({
  asChild = false,
  children,
  ...props
}: StickySectionListProps) => {
  const Comp = asChild ? Slot : "ul"
  return (
    <Comp data-slot="sticky-section-list" {...props}>
      {children}
    </Comp>
  )
}

/* -------------------------------------------------------------------------
 * Item
 * ----------------------------------------------------------------------- */

export interface StickySectionItemProps extends ComponentPropsWithoutRef<"li"> {
  /** Index of the panel this item corresponds to */
  index: number
  asChild?: boolean
}

const Item = ({
  index,
  asChild = false,
  children,
  ...props
}: StickySectionItemProps) => {
  const { activeIndex } = useStickySection()
  const Comp = asChild ? Slot : "li"

  return (
    <Comp
      data-slot="sticky-section-item"
      data-state={activeIndex === index ? "active" : "inactive"}
      {...props}
    >
      {children}
    </Comp>
  )
}

/* -------------------------------------------------------------------------
 * Trigger
 * ----------------------------------------------------------------------- */

export interface StickySectionTriggerProps
  extends ComponentPropsWithoutRef<"button"> {
  /** Index of the panel to scroll to when clicked */
  index: number
  asChild?: boolean
}

const Trigger = (
  {
    index,
    asChild = false,
    onClick,
    children,
    ...props
  }: StickySectionTriggerProps,
  ref: ForwardedRef<HTMLButtonElement>
) => {
  const { activeIndex, scrollToPanel } = useStickySection()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    scrollToPanel(index)
    onClick?.(e)
  }

  const triggerProps = {
    "data-slot": "sticky-section-trigger",
    "data-state": activeIndex === index ? "active" : "inactive",
    "aria-current": activeIndex === index ? ("true" as const) : undefined,
    type: "button" as const,
    onClick: handleClick,
  }

  if (asChild) {
    return (
      <Slot ref={ref} {...triggerProps} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button ref={ref} {...triggerProps} {...props}>
      {children}
    </button>
  )
}

const TriggerWithRef = forwardRef(Trigger)

/* -------------------------------------------------------------------------
 * Content
 * ----------------------------------------------------------------------- */

export interface StickySectionContentProps
  extends ComponentPropsWithoutRef<"div"> {
  asChild?: boolean
}

const Content = ({
  asChild = false,
  children,
  ...props
}: StickySectionContentProps) => {
  const Comp = asChild ? Slot : "div"
  return (
    <Comp data-slot="sticky-section-content" {...props}>
      {children}
    </Comp>
  )
}

/* -------------------------------------------------------------------------
 * Panel
 * ----------------------------------------------------------------------- */

export interface StickySectionPanelProps
  extends ComponentPropsWithoutRef<"div"> {
  /** Index of this panel for intersection tracking */
  index: number
  asChild?: boolean
}

const Panel = (
  { index, asChild = false, children, ...props }: StickySectionPanelProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) => {
  const { registerPanel, unregisterPanel } = useStickySection()

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      registerPanel(index, el)
      if (typeof forwardedRef === "function") {
        forwardedRef(el)
      } else if (forwardedRef) {
        forwardedRef.current = el
      }
    },
    [index, registerPanel, forwardedRef]
  )

  useEffect(() => {
    return () => unregisterPanel(index)
  }, [index, unregisterPanel])

  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      data-index={index}
      data-slot="sticky-section-panel"
      ref={setRef}
      {...props}
    >
      {children}
    </Comp>
  )
}

const PanelWithRef = forwardRef(Panel)

/* -------------------------------------------------------------------------
 * Wrapper
 * ----------------------------------------------------------------------- */

export type StickySectionWrapperProps = ComponentPropsWithoutRef<"div">

const Wrapper = ({
  className,
  children,
  ...props
}: StickySectionWrapperProps) => (
  <div
    className={cn(
      "relative mx-auto max-w-[calc(-2rem+100vw)] overflow-x-clip border-x border-hairline",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

/* -------------------------------------------------------------------------
 * Namespace export
 * ----------------------------------------------------------------------- */

export const StickySection = {
  Root,
  List,
  Item,
  Trigger: TriggerWithRef,
  Content,
  Panel: PanelWithRef,
  Wrapper,
}
