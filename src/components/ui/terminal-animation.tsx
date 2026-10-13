"use client"

// Terminal Animation — from Cult UI (https://www.cult-ui.com/docs/components/terminal-animation)
// MIT License · Copyright (c) 2023 Jordan Gilliam.
// Adapted for Apex Robotics (Code page console):
//   • neon line colours replaced by semantic tone classes (TERMINAL_TONES); the demo Vite tabs are
//     replaced by our real build log; the violet "BackgroundGradient" is now a flat surface
//   • square window with a hairline border; the slide-up on reveal is 24px (was 256px)
//   • starts typing when scrolled into view (`startOnVisible`, default true)
//   • reduced motion: the command and every line render immediately, no blinking caret
//   • tabs: roving tabindex + left/right arrow keys on top of the tablist semantics
//   • caret keyframes (`animate-caret-blink`) live in src/app/globals.css
// Feed it REAL output only (e.g. solver numbers computed from src/lib/ballistics.ts at build time).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Slot } from "@radix-ui/react-slot"
import { useControllableState } from "@radix-ui/react-use-controllable-state"

import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TerminalLine {
  text: string
  color?: string
  delay?: number
}

export interface TabContent {
  label: string
  command: string
  lines: TerminalLine[]
}

export type TerminalAnimationRootProps = React.ComponentProps<"div"> & {
  /** Tab content for each command */
  tabs: TabContent[]
  /** Initial active tab index (uncontrolled) */
  defaultActiveTab?: number
  /** Active tab index (controlled) */
  activeTab?: number
  /** Callback when active tab changes */
  onActiveTabChange?: (index: number) => void
  /** Optional background image URL; renders a full-bleed layer when provided */
  backgroundImage?: string
  /** Force dark mode for the terminal regardless of page theme */
  alwaysDark?: boolean
  /** Hide cursor after output completes */
  hideCursorOnComplete?: boolean
  /** Wait until the terminal scrolls into view before typing (default true). */
  startOnVisible?: boolean
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface TerminalAnimationContextValue {
  activeTab: number
  setActiveTab: (index: number) => void
  commandTyped: string
  isTypingCommand: boolean
  showCursor: boolean
  visibleLines: number
  currentTab: TabContent
  tabs: TabContent[]
}

const TerminalAnimationContext = createContext<
  TerminalAnimationContextValue | undefined
>(undefined)

function useTerminalAnimationContext() {
  const ctx = useContext(TerminalAnimationContext)
  if (!ctx) {
    throw new Error(
      "TerminalAnimation components must be used within TerminalAnimationRoot"
    )
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Tones + default tabs
// ---------------------------------------------------------------------------

/** Semantic line colours: use these for `TerminalLine.color` (literal strings, Tailwind-scannable). */
export const TERMINAL_TONES = {
  fg: "text-fg",
  muted: "text-fg-muted",
  dim: "text-fg-muted/60",
  ok: "text-pollen-text",
  error: "text-data-red",
} as const

/** Our real build (docs/00-START-HERE.md in the robot repo). */
export const defaultTerminalTabs: TabContent[] = [
  {
    label: "build",
    command: "./gradlew :TeamCode:assembleDebug",
    lines: [
      { text: "", delay: 120 },
      { text: "BUILD SUCCESSFUL", color: TERMINAL_TONES.ok, delay: 600 },
      { text: "TeamCode/build/outputs/apk/debug/TeamCode-debug.apk   (52.5 MB)", color: TERMINAL_TONES.muted, delay: 160 },
    ],
  },
]

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function TerminalAnimationRoot({
  tabs,
  defaultActiveTab = 0,
  activeTab: activeTabProp,
  onActiveTabChange,
  backgroundImage,
  alwaysDark = false,
  hideCursorOnComplete = true,
  startOnVisible = true,
  className,
  children,
  ...props
}: TerminalAnimationRootProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(!startOnVisible)

  useEffect(() => {
    if (!startOnVisible || inView || !rootRef.current) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold: 0.25 }
    )
    io.observe(rootRef.current)
    return () => io.disconnect()
  }, [startOnVisible, inView])

  const [activeTab, setActiveTab] = useControllableState({
    prop: activeTabProp,
    defaultProp: defaultActiveTab,
    onChange: onActiveTabChange,
  })

  const [visibleLines, setVisibleLines] = useState(0)
  const [commandTyped, setCommandTyped] = useState("")
  const [isTypingCommand, setIsTypingCommand] = useState(true)
  const [showCursor, setShowCursor] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout)
    timeoutRef.current = []
  }, [])

  const animateTab = useCallback(
    (tabIndex: number) => {
      clearTimeouts()
      setVisibleLines(0)
      setCommandTyped("")
      setIsTypingCommand(true)
      setShowCursor(true)

      const tab = tabs[tabIndex]
      if (!tab) {
        return
      }

      // Reduced motion: show the finished state at once.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setCommandTyped(tab.command)
        setIsTypingCommand(false)
        setVisibleLines(tab.lines.length)
        setShowCursor(false)
        return
      }

      const command = tab.command
      let charIndex = 0

      const typeCommand = () => {
        if (charIndex <= command.length) {
          setCommandTyped(command.slice(0, charIndex))
          charIndex++
          const t = setTimeout(typeCommand, 25 + Math.random() * 35)
          timeoutRef.current.push(t)
        } else {
          const t = setTimeout(() => {
            setIsTypingCommand(false)
            showLines(0)
          }, 250)
          timeoutRef.current.push(t)
        }
      }

      const showLines = (lineIndex: number) => {
        if (lineIndex <= tab.lines.length) {
          setVisibleLines(lineIndex)
          if (lineIndex < tab.lines.length) {
            const delay = tab.lines[lineIndex].delay ?? 100
            const t = setTimeout(() => showLines(lineIndex + 1), delay)
            timeoutRef.current.push(t)
          } else if (hideCursorOnComplete) {
            const t = setTimeout(() => setShowCursor(false), 600)
            timeoutRef.current.push(t)
          }
        }
      }

      const t = setTimeout(typeCommand, 300)
      timeoutRef.current.push(t)
    },
    [clearTimeouts, hideCursorOnComplete, tabs]
  )

  useEffect(() => {
    if (!inView) return
    const start = setTimeout(() => animateTab(activeTab), 0)
    return () => {
      clearTimeout(start)
      clearTimeouts()
    }
  }, [activeTab, animateTab, clearTimeouts, inView])

  const currentTab = tabs[activeTab] ?? tabs[0]
  const safeActiveTab = Math.min(activeTab, tabs.length - 1)

  const value: TerminalAnimationContextValue = {
    activeTab: safeActiveTab,
    setActiveTab,
    commandTyped,
    isTypingCommand,
    showCursor,
    visibleLines,
    currentTab,
    tabs,
  }

  return (
    <TerminalAnimationContext.Provider value={value}>
      <div
        ref={rootRef}
        className={cn(alwaysDark && "dark", className)}
        data-slot="terminal-animation-root"
        {...props}
      >
        {backgroundImage && (
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center"
            data-slot="terminal-animation-background"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}
        {children}
      </div>
    </TerminalAnimationContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// BackgroundGradient
// ---------------------------------------------------------------------------

export type TerminalAnimationBackgroundGradientProps =
  React.ComponentProps<"div">

const backgroundGradientClasses = "absolute inset-0 bg-surface-2"

export function TerminalAnimationBackgroundGradient({
  className,
  ...props
}: TerminalAnimationBackgroundGradientProps) {
  return (
    <div
      aria-hidden
      className={cn(backgroundGradientClasses, className)}
      data-slot="terminal-animation-background-gradient"
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export type TerminalAnimationContainerProps = React.ComponentProps<"div">

const containerClasses = "relative w-full"

export function TerminalAnimationContainer({
  className,
  ...props
}: TerminalAnimationContainerProps) {
  return (
    <div
      className={cn(containerClasses, className)}
      data-slot="terminal-animation-container"
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

export type TerminalAnimationWindowProps = React.ComponentProps<"div"> & {
  /** Terminal window background color; defaults to bg-card when unset */
  backgroundColor?: string
  /** Minimum height of the terminal window */
  minHeight?: string
  /** Animate slide-up when element enters viewport */
  animateOnVisible?: boolean
}

const windowClasses = "relative flex flex-col overflow-hidden rounded-none border border-hairline"

export function TerminalAnimationWindow({
  className,
  backgroundColor,
  minHeight = "28rem",
  animateOnVisible = true,
  style,
  ...props
}: TerminalAnimationWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (!(animateOnVisible && windowRef.current)) {
      return
    }
    const el = windowRef.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHasAnimated(true)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [animateOnVisible])

  return (
    <div
      className={cn(
        windowClasses,
        !backgroundColor && "bg-surface-1",
        animateOnVisible &&
          "transition-[translate,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        animateOnVisible && !hasAnimated && "translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
        animateOnVisible && hasAnimated && "translate-y-0 opacity-100",
        className
      )}
      data-slot="terminal-animation-window"
      ref={windowRef}
      style={
        backgroundColor
          ? { backgroundColor, minHeight, ...style }
          : { minHeight, ...style }
      }
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export type TerminalAnimationContentProps = React.ComponentProps<"div">

const contentClasses = "flex-1 px-4 py-5 font-mono text-[13px] leading-6 sm:px-6 sm:py-6"

export function TerminalAnimationContent({
  className,
  ...props
}: TerminalAnimationContentProps) {
  return (
    <div
      className={cn(contentClasses, className)}
      data-slot="terminal-animation-content"
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// BlinkingCursor
// ---------------------------------------------------------------------------

export type TerminalAnimationBlinkingCursorProps = React.ComponentProps<"span">

export function TerminalAnimationBlinkingCursor({
  className,
  ...props
}: TerminalAnimationBlinkingCursorProps) {
  // Requires `animate-caret-blink` utility in global CSS for downstream installs.
  return (
    <span
      aria-hidden
      className={cn(
        "animate-caret-blink bg-fg ml-0.5 inline-block h-[15px] w-[7px] translate-y-[3px] motion-reduce:animate-none",
        className
      )}
      data-slot="terminal-animation-blinking-cursor"
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// CommandBar
// ---------------------------------------------------------------------------

export type TerminalAnimationCommandBarProps = React.ComponentProps<"div"> & {
  /** Custom cursor element when typing; defaults to unstyled block cursor */
  cursor?: ReactNode
}

export function TerminalAnimationCommandBar({
  className,
  cursor,
  ...props
}: TerminalAnimationCommandBarProps) {
  const { commandTyped, isTypingCommand, showCursor } =
    useTerminalAnimationContext()

  const defaultCursor = <span aria-hidden="true">▌</span>

  return (
    <div
      className={className}
      data-slot="terminal-animation-command"
      {...props}
    >
      {commandTyped}
      {isTypingCommand && showCursor && (cursor ?? defaultCursor)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// OutputLine
// ---------------------------------------------------------------------------

export type TerminalAnimationOutputLineProps = React.ComponentProps<"div"> & {
  line: TerminalLine
  visible: boolean
}

export function TerminalAnimationOutputLine({
  line,
  visible,
  className,
  ...props
}: TerminalAnimationOutputLineProps) {
  if (!visible) {
    return null
  }
  return (
    <div
      className={className}
      data-slot="terminal-animation-output-line"
      {...props}
    >
      <span className={line.color} data-line-color={line.color}>
        {line.text || "\u00A0"}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export type TerminalAnimationOutputProps = React.ComponentProps<"div"> & {
  /** Custom renderer for each line; receives line, index, and visibility */
  renderLine?: (
    line: TerminalLine,
    index: number,
    visible: boolean
  ) => ReactNode
}

export function TerminalAnimationOutput({
  className,
  renderLine,
  ...props
}: TerminalAnimationOutputProps) {
  const { isTypingCommand, visibleLines, currentTab, activeTab } =
    useTerminalAnimationContext()

  if (isTypingCommand) {
    return null
  }

  return (
    <div
      aria-atomic="false"
      aria-live="polite"
      className={className}
      data-slot="terminal-animation-output"
      role="log"
      {...props}
    >
      {currentTab.lines.map((line, i) => {
        const visible = i < visibleLines
        const key = `${activeTab}-${i}`
        if (renderLine) {
          const content = renderLine(line, i, visible)
          if (!(visible || content)) {
            return null
          }
          return <div key={key}>{content}</div>
        }
        return (
          <TerminalAnimationOutputLine
            key={key}
            line={line}
            visible={visible}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TrailingPrompt
// ---------------------------------------------------------------------------

export type TerminalAnimationTrailingPromptProps = React.ComponentProps<"div">

export function TerminalAnimationTrailingPrompt({
  className,
  children,
  ...props
}: TerminalAnimationTrailingPromptProps) {
  const { isTypingCommand, showCursor, visibleLines, currentTab } =
    useTerminalAnimationContext()

  const show =
    !isTypingCommand && showCursor && visibleLines >= currentTab.lines.length

  if (!show) {
    return null
  }

  return (
    <div
      className={className}
      data-slot="terminal-animation-trailing-prompt"
      {...props}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TabList
// ---------------------------------------------------------------------------

export type TerminalAnimationTabListProps = React.ComponentProps<"div">

export function TerminalAnimationTabList({
  className,
  ...props
}: TerminalAnimationTabListProps) {
  return (
    <div
      aria-label="Terminal commands"
      className={className}
      data-slot="terminal-animation-tab-list"
      role="tablist"
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// TabTrigger
// ---------------------------------------------------------------------------

export type TerminalAnimationTabTriggerProps =
  React.ComponentPropsWithoutRef<"button"> & {
    /** Tab index to activate when clicked */
    index: number
    /** Merge props onto child element instead of rendering a button */
    asChild?: boolean
  }

export function TerminalAnimationTabTrigger({
  index,
  asChild = false,
  className,
  children,
  ...props
}: TerminalAnimationTabTriggerProps) {
  const { activeTab, setActiveTab, tabs } = useTerminalAnimationContext()
  const isActive = activeTab === index

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length
    setActiveTab(next)
    const list = (e.currentTarget as HTMLElement).closest("[role=tablist]")
    const target = list?.querySelectorAll<HTMLElement>("[role=tab]")[next]
    target?.focus()
  }

  const triggerProps = {
    role: "tab" as const,
    "aria-selected": isActive,
    tabIndex: isActive ? 0 : -1,
    "data-state": isActive ? "active" : "inactive",
    onClick: () => setActiveTab(index),
    onKeyDown,
    children,
  }

  if (asChild) {
    return <Slot {...triggerProps} {...props} className={className} />
  }

  return (
    <button
      data-slot="terminal-animation-tab-trigger"
      type="button"
      {...triggerProps}
      className={className}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTerminalAnimation() {
  return useTerminalAnimationContext()
}
