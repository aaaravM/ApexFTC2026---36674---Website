"use client"

// Family Drawer — from Cult UI (https://www.cult-ui.com/docs/components/family-drawer)
// MIT License · Copyright (c) 2023 Jordan Gilliam.
// Restyled for Apex Robotics: square 2px corners, hairline border, system tokens, visible focus,
// 44px touch targets, Lenis stopped while open (data-lenis-prevent on the sheet).
// Mechanics unchanged: vaul (Radix Dialog → focus trap, Esc, Title/Description) + measured height.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Slot } from "@radix-ui/react-slot"
import { useLenis } from "lenis/react"
import { AnimatePresence, motion } from "motion/react"
import useMeasure from "react-use-measure"
import { Drawer } from "vaul"

import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

type ViewComponent = React.ComponentType<Record<string, unknown>>

interface ViewsRegistry {
  [viewName: string]: ViewComponent
}

// ============================================================================
// Context
// ============================================================================

interface FamilyDrawerContextValue {
  isOpen: boolean
  view: string
  setView: (view: string) => void
  opacityDuration: number
  elementRef: ReturnType<typeof useMeasure>[0]
  bounds: ReturnType<typeof useMeasure>[1]
  views: ViewsRegistry | undefined
}

const FamilyDrawerContext = createContext<FamilyDrawerContextValue | undefined>(
  undefined
)

function useFamilyDrawer() {
  const context = useContext(FamilyDrawerContext)
  if (!context) {
    throw new Error(
      "FamilyDrawer components must be used within FamilyDrawerRoot"
    )
  }
  return context
}

// ============================================================================
// Root Component
// ============================================================================

interface FamilyDrawerRootProps {
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  defaultView?: string
  onViewChange?: (view: string) => void
  views?: ViewsRegistry
}

function FamilyDrawerRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  defaultView = "default",
  onViewChange,
  views: customViews,
}: FamilyDrawerRootProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [view, setView] = useState(defaultView)
  const [elementRef, bounds] = useMeasure()
  // previous/current measured height, tracked in state (React's "adjust state while rendering")
  const [heights, setHeights] = useState({ prev: 0, cur: 0 })
  if (bounds.height !== heights.cur) setHeights({ prev: heights.cur, cur: bounds.height })

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  // The page behind an open sheet must not scroll.
  const lenis = useLenis()
  useEffect(() => {
    if (!lenis) return
    if (isOpen) lenis.stop()
    else lenis.start()
  }, [isOpen, lenis])

  const opacityDuration = useMemo(() => {
    const MIN_DURATION = 0.15
    const MAX_DURATION = 0.27
    if (!heights.prev) return MIN_DURATION
    return Math.min(Math.max(Math.abs(heights.cur - heights.prev) / 500, MIN_DURATION), MAX_DURATION)
  }, [heights])

  const handleViewChange = (newView: string) => {
    setView(newView)
    onViewChange?.(newView)
  }

  const views =
    customViews && Object.keys(customViews).length > 0 ? customViews : undefined

  const contextValue: FamilyDrawerContextValue = {
    isOpen,
    view,
    setView: handleViewChange,
    opacityDuration,
    elementRef,
    bounds,
    views,
  }

  return (
    <FamilyDrawerContext.Provider value={contextValue}>
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        {children}
      </Drawer.Root>
    </FamilyDrawerContext.Provider>
  )
}

// ============================================================================
// Trigger Component
// ============================================================================

interface FamilyDrawerTriggerProps {
  children: ReactNode
  asChild?: boolean
  className?: string
}

function FamilyDrawerTrigger({
  children,
  asChild = false,
  className,
}: FamilyDrawerTriggerProps) {
  if (asChild) {
    return (
      <Drawer.Trigger asChild>
        <Slot>{children}</Slot>
      </Drawer.Trigger>
    )
  }

  return (
    <Drawer.Trigger asChild>
      <button
        className={cn(
          "bg-surface-2 text-fg hover:bg-surface-1 h-11 cursor-pointer rounded-sm border border-border-ui px-4 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
          className
        )}
        type="button"
      >
        {children}
      </button>
    </Drawer.Trigger>
  )
}

// ============================================================================
// Portal Component
// ============================================================================

function FamilyDrawerPortal({ children }: { children: ReactNode }) {
  return <Drawer.Portal>{children}</Drawer.Portal>
}

// ============================================================================
// Overlay Component
// ============================================================================

interface FamilyDrawerOverlayProps {
  className?: string
  onClick?: () => void
}

function FamilyDrawerOverlay({ className, onClick }: FamilyDrawerOverlayProps) {
  const { setView } = useFamilyDrawer()

  return (
    <Drawer.Overlay
      className={cn("fixed inset-0 z-[60] bg-black/60", className)}
      onClick={onClick || (() => setView("default"))}
    />
  )
}

// ============================================================================
// Content Component
// ============================================================================

interface FamilyDrawerContentProps {
  children: ReactNode
  className?: string
  asChild?: boolean
}

function FamilyDrawerContent({
  children,
  className,
  asChild = false,
}: FamilyDrawerContentProps) {
  const { bounds } = useFamilyDrawer()

  const content = (
    <motion.div
      data-lenis-prevent=""
      animate={{
        height: bounds.height,
        transition: {
          duration: 0.27,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
    >
      {children}
    </motion.div>
  )

  const classes = cn(
    "bg-surface-1 text-fg fixed inset-x-2 bottom-2 z-[60] mx-auto max-w-[560px] overflow-hidden rounded-sm border border-hairline outline-none",
    className
  )

  if (asChild) {
    return (
      <Drawer.Content asChild className={classes}>
        <Slot>{content}</Slot>
      </Drawer.Content>
    )
  }

  return (
    <Drawer.Content asChild className={classes}>
      {content}
    </Drawer.Content>
  )
}

// ============================================================================
// Animated Wrapper Component
// ============================================================================

interface FamilyDrawerAnimatedWrapperProps {
  children: ReactNode
  className?: string
}

function FamilyDrawerAnimatedWrapper({
  children,
  className,
}: FamilyDrawerAnimatedWrapperProps) {
  const { elementRef } = useFamilyDrawer()

  return (
    <div ref={elementRef} className={cn("px-5 pt-2.5 pb-5", className)}>
      {children}
    </div>
  )
}

// ============================================================================
// Animated Content Component
// ============================================================================

interface FamilyDrawerAnimatedContentProps {
  children: ReactNode
}

function FamilyDrawerAnimatedContent({
  children,
}: FamilyDrawerAnimatedContentProps) {
  const { view, opacityDuration } = useFamilyDrawer()

  return (
    <AnimatePresence initial={false} mode="popLayout" custom={view}>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        key={view}
        transition={{
          duration: opacityDuration,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// Close Component
// ============================================================================

interface FamilyDrawerCloseProps {
  children?: ReactNode
  asChild?: boolean
  className?: string
}

function FamilyDrawerClose({
  children,
  asChild = false,
  className,
}: FamilyDrawerCloseProps) {
  const defaultClose = (
    <button
      data-vaul-no-drag=""
      aria-label="Close menu"
      className={cn(
        "text-fg-muted hover:text-fg hover:border-border-ui absolute top-4 right-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm border border-hairline transition-colors",
        className
      )}
      type="button"
    >
      {children || <CloseIcon />}
    </button>
  )

  if (asChild) {
    return (
      <Drawer.Close asChild>
        <Slot>{defaultClose}</Slot>
      </Drawer.Close>
    )
  }

  return <Drawer.Close asChild>{defaultClose}</Drawer.Close>
}

// ============================================================================
// Helper Components
// ============================================================================

type FamilyDrawerTitleProps = React.ComponentProps<typeof Drawer.Title>

/**
 * Accessible title for the drawer. Every view must render one (directly or via
 * `FamilyDrawerHeader`) so screen readers can announce the dialog.
 */
function FamilyDrawerTitle({ className, ...props }: FamilyDrawerTitleProps) {
  return (
    <Drawer.Title
      data-slot="family-drawer-title"
      className={cn(
        "text-fg font-display text-[22px] font-medium [font-stretch:112%]",
        className
      )}
      {...props}
    />
  )
}

type FamilyDrawerDescriptionProps = React.ComponentProps<
  typeof Drawer.Description
>

function FamilyDrawerDescription({
  className,
  ...props
}: FamilyDrawerDescriptionProps) {
  return (
    <Drawer.Description
      data-slot="family-drawer-description"
      className={cn("text-fg-muted text-[15px] leading-[22px]", className)}
      {...props}
    />
  )
}

interface FamilyDrawerHeaderProps {
  icon: ReactNode
  title: string
  description: string
  className?: string
}

function FamilyDrawerHeader({
  icon,
  title,
  description,
  className,
}: FamilyDrawerHeaderProps) {
  return (
    <header className={cn("mt-5", className)}>
      {icon}
      <FamilyDrawerTitle className="mt-2.5">{title}</FamilyDrawerTitle>
      <FamilyDrawerDescription className="mt-3">
        {description}
      </FamilyDrawerDescription>
    </header>
  )
}

interface FamilyDrawerButtonProps {
  children: ReactNode
  onClick: () => void
  className?: string
  asChild?: boolean
}

function FamilyDrawerButton({
  children,
  onClick,
  className,
  asChild = false,
}: FamilyDrawerButtonProps) {
  const button = (
    <button
      data-vaul-no-drag=""
      className={cn(
        "bg-surface-2 text-fg hover:bg-pollen hover:text-pollen-ink hover:border-pollen-edge flex h-12 w-full cursor-pointer items-center gap-3 rounded-sm border border-border-ui px-4 text-[15px] font-medium transition-colors duration-[120ms]",
        className
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )

  if (asChild) {
    return <Slot>{button}</Slot>
  }

  return button
}

interface FamilyDrawerSecondaryButtonProps {
  children: ReactNode
  onClick: () => void
  className: string
  asChild?: boolean
}

function FamilyDrawerSecondaryButton({
  children,
  onClick,
  className,
  asChild = false,
}: FamilyDrawerSecondaryButtonProps) {
  const button = (
    <button
      data-vaul-no-drag=""
      type="button"
      className={cn(
        "flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-sm text-center text-[15px] font-medium transition-colors",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )

  if (asChild) {
    return <Slot>{button}</Slot>
  }

  return button
}

// ============================================================================
// View Content Renderer
// ============================================================================

interface FamilyDrawerViewContentProps {
  views?: ViewsRegistry
}

function FamilyDrawerViewContent(
  {
    views: propViews,
  }: FamilyDrawerViewContentProps = {} as FamilyDrawerViewContentProps
) {
  const { view, views: contextViews } = useFamilyDrawer()

  const views = propViews || contextViews

  if (!views) {
    throw new Error(
      "FamilyDrawerViewContent requires views to be provided via props or FamilyDrawerRoot"
    )
  }

  const ViewComponent = views[view]

  if (!ViewComponent) {
    const DefaultComponent = views.default
    return DefaultComponent ? <DefaultComponent /> : null
  }

  return <ViewComponent />
}

// ============================================================================
// Icons
// ============================================================================

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M10.5 1.5 1.5 10.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M10.5 10.5 1.5 1.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  )
}

// ============================================================================
// Exports
// ============================================================================

export {
  FamilyDrawerRoot,
  FamilyDrawerTrigger,
  FamilyDrawerPortal,
  FamilyDrawerOverlay,
  FamilyDrawerContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerAnimatedContent,
  FamilyDrawerClose,
  FamilyDrawerHeader,
  FamilyDrawerTitle,
  FamilyDrawerDescription,
  FamilyDrawerButton,
  FamilyDrawerSecondaryButton,
  FamilyDrawerViewContent,
  useFamilyDrawer,
  type ViewsRegistry,
  type ViewComponent,
}
