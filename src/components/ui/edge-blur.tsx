// Edge Blur — from Cult UI (https://www.cult-ui.com/docs/components/edge-blur)
// MIT License · Copyright (c) 2023 Jordan Gilliam.
// Adapted for Apex Robotics: progressive blur under the fixed header (content dissolves as it
// scrolls under). Server-safe (no hooks), 3 layers on phones / 5 on desktop, z below the header,
// and `fixed={false}` to use it inside a positioned container.
// NEVER mount it over the live WebGL hero — backdrop-filter re-blurs every canvas frame.
//
//   <EdgeBlur position="top" height={96} />        subpage top edge (under the 56px header)
//   <EdgeBlur position="bottom" fixed={false} />   inside a scroll panel (parent: relative)

import { cn } from "@/lib/utils"

interface EdgeBlurProps {
  position?: "top" | "bottom"
  height?: number
  fixed?: boolean
  className?: string
}

const LAYERS = [1, 2, 3, 6, 12]

export function EdgeBlur({ position = "bottom", height = 75, fixed = true, className }: EdgeBlurProps) {
  const isTop = position === "top"
  const mask = `linear-gradient(to ${isTop ? "bottom" : "top"}, black, transparent)`

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none inset-x-0 isolate z-40",
        fixed ? "fixed" : "absolute",
        isTop ? "top-0" : "bottom-0",
        className
      )}
      style={{ height }}
    >
      {LAYERS.map((blur, i) => (
        <div
          key={blur}
          className={cn("absolute inset-0", i % 2 === 1 && "hidden md:block")}
          style={{
            backdropFilter: `blur(${blur}px)`,
            WebkitBackdropFilter: `blur(${blur}px)`,
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
      ))}
    </div>
  )
}

export function TopBlur({ height = 75 }: { height?: number }) {
  return <EdgeBlur position="top" height={height} />
}

export function BottomBlur({ height = 75 }: { height?: number }) {
  return <EdgeBlur position="bottom" height={height} />
}
