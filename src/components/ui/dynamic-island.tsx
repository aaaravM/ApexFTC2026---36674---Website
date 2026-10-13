"use client"

// Dynamic Island — from Cult UI (https://www.cult-ui.com/docs/components/dynamic-island)
// MIT License · Copyright (c) 2023 Jordan Gilliam.
// Adapted for Apex Robotics as the solver HUD ("instrument readout that morphs between states"):
//   • tokens: surface-1 panel, hairline border, 2px corners (no black pill, no squircle clip,
//     no hover shadow); content styles come from the consumer (mono, tabular)
//   • widths clamp to the viewport (100vw − 32px) so no preset overflows a phone
//   • reduced motion → size changes jump (no width/height springs)
//   • a11y: optional `announce` text is mirrored into an sr-only polite live region — announce
//     STATE changes only ("READY", "NO SOLUTION"), never per-frame numbers
//   • `radius` prop if a page really needs the original pill (default 2px, spec §1)
//
//   <DynamicIslandProvider initialSize="compact">
//     <DynamicIsland id="home-hud" announce={ready ? "Ready to fire" : "Aiming"}>
//       <DynamicContainer className="flex h-full items-center gap-3 px-4 font-mono text-[11px]">…</DynamicContainer>
//     </DynamicIsland>
//   </DynamicIslandProvider>
//   const { setSize } = useDynamicIslandSize(); setSize("long")

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react"
import { AnimatePresence, motion, useReducedMotion, useWillChange, type MotionValue } from "motion/react"

import { cn } from "@/lib/utils"

const stiffness = 260
const damping = 30
const MAX_WIDTH = 691
const MAX_HEIGHT_MOBILE_ULTRA = 400
const MAX_HEIGHT_MOBILE_MASSIVE = 700
const DEFAULT_RADIUS = 2

const min = (a: number, b: number) => (a < b ? a : b)

export type SizePresets =
  | "reset"
  | "empty"
  | "default"
  | "compact"
  | "compactLong"
  | "large"
  | "long"
  | "minimalLeading"
  | "minimalTrailing"
  | "compactMedium"
  | "medium"
  | "tall"
  | "ultra"
  | "massive"

const SIZE_PRESETS = {
  RESET: "reset",
  EMPTY: "empty",
  DEFAULT: "default",
  COMPACT: "compact",
  COMPACT_LONG: "compactLong",
  LARGE: "large",
  LONG: "long",
  MINIMAL_LEADING: "minimalLeading",
  MINIMAL_TRAILING: "minimalTrailing",
  COMPACT_MEDIUM: "compactMedium",
  MEDIUM: "medium",
  TALL: "tall",
  ULTRA: "ultra",
  MASSIVE: "massive",
} as const

type Preset = {
  width: number
  height?: number
  aspectRatio: number
  borderRadius: number
}

const DynamicIslandSizePresets: Record<SizePresets, Preset> = {
  [SIZE_PRESETS.RESET]: { width: 150, aspectRatio: 1, borderRadius: 20 },
  [SIZE_PRESETS.EMPTY]: { width: 0, aspectRatio: 0, borderRadius: 0 },
  [SIZE_PRESETS.DEFAULT]: { width: 150, aspectRatio: 44 / 150, borderRadius: 46 },
  [SIZE_PRESETS.MINIMAL_LEADING]: { width: 52.33, aspectRatio: 44 / 52.33, borderRadius: 22 },
  [SIZE_PRESETS.MINIMAL_TRAILING]: { width: 52.33, aspectRatio: 44 / 52.33, borderRadius: 22 },
  [SIZE_PRESETS.COMPACT]: { width: 235, aspectRatio: 44 / 235, borderRadius: 46 },
  [SIZE_PRESETS.COMPACT_LONG]: { width: 300, aspectRatio: 44 / 235, borderRadius: 46 },
  [SIZE_PRESETS.COMPACT_MEDIUM]: { width: 351, aspectRatio: 64 / 371, borderRadius: 44 },
  [SIZE_PRESETS.LONG]: { width: 371, aspectRatio: 84 / 371, borderRadius: 42 },
  [SIZE_PRESETS.MEDIUM]: { width: 371, aspectRatio: 210 / 371, borderRadius: 22 },
  [SIZE_PRESETS.LARGE]: { width: 371, aspectRatio: 84 / 371, borderRadius: 42 },
  [SIZE_PRESETS.TALL]: { width: 371, aspectRatio: 210 / 371, borderRadius: 42 },
  [SIZE_PRESETS.ULTRA]: { width: 630, aspectRatio: 630 / 800, borderRadius: 42 },
  [SIZE_PRESETS.MASSIVE]: { width: 891, height: 1900, aspectRatio: 891 / 891, borderRadius: 42 },
}

type BlobStateType = {
  size: SizePresets
  previousSize: SizePresets | undefined
  animationQueue: Array<{ size: SizePresets; delay: number }>
  isAnimating: boolean
}

type BlobAction =
  | { type: "SET_SIZE"; newSize: SizePresets }
  | { type: "INITIALIZE"; firstState: SizePresets }
  | { type: "SCHEDULE_ANIMATION"; animationSteps: Array<{ size: SizePresets; delay: number }> }
  | { type: "ANIMATION_END" }

type BlobContextType = {
  state: BlobStateType
  dispatch: React.Dispatch<BlobAction>
  setSize: (size: SizePresets) => void
  scheduleAnimation: (animationSteps: Array<{ size: SizePresets; delay: number }>) => void
  presets: Record<SizePresets, Preset>
}

const BlobContext = createContext<BlobContextType | undefined>(undefined)

const blobReducer = (state: BlobStateType, action: BlobAction): BlobStateType => {
  switch (action.type) {
    case "SET_SIZE":
      return { ...state, size: action.newSize, previousSize: state.size, isAnimating: false }
    case "SCHEDULE_ANIMATION":
      return { ...state, animationQueue: action.animationSteps, isAnimating: action.animationSteps.length > 0 }
    case "INITIALIZE":
      return { ...state, size: action.firstState, previousSize: SIZE_PRESETS.EMPTY, isAnimating: false }
    case "ANIMATION_END":
      return { ...state, isAnimating: false }
    default:
      return state
  }
}

interface DynamicIslandProviderProps {
  children: React.ReactNode
  initialSize?: SizePresets
  initialAnimation?: Array<{ size: SizePresets; delay: number }>
}

const DynamicIslandProvider: React.FC<DynamicIslandProviderProps> = ({
  children,
  initialSize = SIZE_PRESETS.DEFAULT,
  initialAnimation = [],
}) => {
  const initialState: BlobStateType = {
    size: initialSize,
    previousSize: SIZE_PRESETS.EMPTY,
    animationQueue: initialAnimation,
    isAnimating: initialAnimation.length > 0,
  }

  const [state, dispatch] = useReducer(blobReducer, initialState)

  useEffect(() => {
    let cancelled = false
    const processQueue = async () => {
      for (const step of state.animationQueue) {
        await new Promise((resolve) => setTimeout(resolve, step.delay))
        if (cancelled) return
        dispatch({ type: "SET_SIZE", newSize: step.size })
      }
      if (!cancelled) dispatch({ type: "ANIMATION_END" })
    }
    if (state.animationQueue.length > 0) processQueue()
    return () => {
      cancelled = true
    }
  }, [state.animationQueue])

  const setSize = useCallback(
    (newSize: SizePresets) => {
      if (newSize !== state.size) dispatch({ type: "SET_SIZE", newSize })
    },
    [state.size]
  )

  const scheduleAnimation = useCallback(
    (animationSteps: Array<{ size: SizePresets; delay: number }>) => {
      dispatch({ type: "SCHEDULE_ANIMATION", animationSteps })
    },
    []
  )

  return (
    <BlobContext.Provider value={{ state, dispatch, setSize, scheduleAnimation, presets: DynamicIslandSizePresets }}>
      {children}
    </BlobContext.Provider>
  )
}

const useDynamicIslandSize = () => {
  const context = useContext(BlobContext)
  if (!context) throw new Error("useDynamicIslandSize must be used within a DynamicIslandProvider")
  return context
}

const useScheduledAnimations = (animations: Array<{ size: SizePresets; delay: number }>) => {
  const { scheduleAnimation } = useDynamicIslandSize()
  const animationsRef = useRef(animations)
  useEffect(() => {
    scheduleAnimation(animationsRef.current)
  }, [scheduleAnimation])
}

const DynamicIslandContainer = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("z-10 flex h-full w-full items-end justify-center bg-transparent", className)}>{children}</div>
)

type ScreenSize = "mobile" | "tablet" | "desktop"

const DynamicIsland = ({
  children,
  id,
  className,
  containerClassName,
  announce,
  radius = DEFAULT_RADIUS,
  ...props
}: {
  children: ReactNode
  id: string
  className?: string
  containerClassName?: string
  /** Discrete state text for screen readers (polite live region). */
  announce?: string
  /** Corner radius in px for every preset (default 2 — the system radius). */
  radius?: number
  [key: string]: unknown
}) => {
  const willChange = useWillChange()
  const [screen, setScreen] = useState<{ size: ScreenSize; width: number }>({ size: "desktop", width: 1440 })

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      setScreen({ size: w <= 640 ? "mobile" : w <= 1024 ? "tablet" : "desktop", width: w })
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <DynamicIslandContainer className={containerClassName}>
      <DynamicIslandContent
        id={id}
        willChange={willChange}
        screenSize={screen.size}
        viewportWidth={screen.width}
        radius={radius}
        className={className}
        {...props}
      >
        {children}
      </DynamicIslandContent>
      {announce !== undefined && (
        <span role="status" aria-live="polite" className="sr-only">
          {announce}
        </span>
      )}
    </DynamicIslandContainer>
  )
}

const calculateDimensions = (
  size: SizePresets,
  screenSize: ScreenSize,
  currentSize: Preset,
  viewportWidth: number
): { width: string; height: number } => {
  if (size === "massive" && screenSize === "mobile") return { width: "350px", height: MAX_HEIGHT_MOBILE_MASSIVE }
  if (size === "ultra" && screenSize === "mobile") return { width: "350px", height: MAX_HEIGHT_MOBILE_ULTRA }
  // Never wider than the viewport minus the 16px gutters.
  const width = min(min(currentSize.width, MAX_WIDTH), Math.max(0, viewportWidth - 32))
  return { width: `${width}px`, height: currentSize.aspectRatio * width }
}

const DynamicIslandContent = ({
  children,
  id,
  willChange,
  screenSize,
  viewportWidth,
  radius,
  className,
  ...props
}: {
  children: React.ReactNode
  id: string
  willChange: MotionValue<string>
  screenSize: ScreenSize
  viewportWidth: number
  radius: number
  className?: string
  [key: string]: unknown
}) => {
  const { state, presets } = useDynamicIslandSize()
  const reduce = useReducedMotion()
  const currentSize = presets[state.size]
  const dimensions = calculateDimensions(state.size, screenSize, currentSize, viewportWidth)

  return (
    <motion.div
      id={id}
      className={cn(
        "mx-auto h-0 w-0 items-center justify-center overflow-hidden border border-hairline bg-surface-1 text-center text-fg",
        className
      )}
      animate={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: Math.min(radius, currentSize.borderRadius),
        transition: reduce ? { duration: 0 } : { type: "spring", stiffness, damping },
      }}
      style={{ willChange }}
      {...props}
    >
      <AnimatePresence>{children}</AnimatePresence>
    </motion.div>
  )
}

type DynamicContainerProps = {
  className?: string
  children?: React.ReactNode
}

const DynamicContainer = ({ className, children }: DynamicContainerProps) => {
  const willChange = useWillChange()
  const { state } = useDynamicIslandSize()
  const { size, previousSize } = state
  const isSizeChanged = size !== previousSize

  return (
    <motion.div
      initial={{ opacity: isSizeChanged ? 0 : 1, scale: isSizeChanged ? 0.96 : 1, y: isSizeChanged ? 4 : 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness, damping }}
      exit={{ opacity: 0, filter: "blur(4px)", scale: 0.98, y: 8 }}
      style={{ willChange }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

type DynamicChildrenProps = {
  className?: string
  children?: React.ReactNode
}

const DynamicDiv = ({ className, children }: DynamicChildrenProps) => {
  const { state } = useDynamicIslandSize()
  const { size, previousSize } = state
  const willChange = useWillChange()
  return (
    <motion.div
      initial={{ opacity: size === previousSize ? 1 : 0, scale: size === previousSize ? 1 : 0.96 }}
      animate={{
        opacity: size === previousSize ? 0 : 1,
        scale: size === previousSize ? 0.96 : 1,
        transition: { type: "spring", stiffness, damping },
      }}
      exit={{ opacity: 0, filter: "blur(4px)", scale: 0 }}
      style={{ willChange }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

type MotionProps = {
  className: string
  children: React.ReactNode
}

const DynamicTitle = ({ className, children }: MotionProps) => {
  const { state } = useDynamicIslandSize()
  const { size, previousSize } = state
  const willChange = useWillChange()
  return (
    <motion.h3
      className={className}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: size === previousSize ? 0 : 1,
        scale: size === previousSize ? 0.96 : 1,
        transition: { type: "spring", stiffness, damping },
      }}
      style={{ willChange }}
    >
      {children}
    </motion.h3>
  )
}

const DynamicDescription = ({ className, children }: MotionProps) => {
  const { state } = useDynamicIslandSize()
  const { size, previousSize } = state
  const willChange = useWillChange()
  return (
    <motion.p
      className={className}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: size === previousSize ? 0 : 1,
        scale: size === previousSize ? 0.96 : 1,
        transition: { type: "spring", stiffness, damping },
      }}
      style={{ willChange }}
    >
      {children}
    </motion.p>
  )
}

export {
  DynamicContainer,
  DynamicTitle,
  DynamicDescription,
  DynamicIsland,
  SIZE_PRESETS,
  stiffness,
  DynamicDiv,
  damping,
  DynamicIslandSizePresets,
  BlobContext,
  useDynamicIslandSize,
  useScheduledAnimations,
  DynamicIslandProvider,
}

export default DynamicIsland
