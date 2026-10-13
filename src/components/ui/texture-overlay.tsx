// Texture Overlay — from Cult UI (https://www.cult-ui.com/docs/components/texture-overlay)
// MIT License · Copyright (c) 2023 Jordan Gilliam.
// Adapted for Apex Robotics: theme-aware (patterns are black ink on light, inverted to white ink
// on dark), static, server-safe, aria-hidden. Default strength ≈ 6% (opacity 0.2 × pattern ink),
// the spec's 4–8% for engraved/printed panels. Parent needs `relative`.
//
//   <div className="relative"><TextureOverlay texture="crosshatch" />…</div>
//   <TextureOverlay texture="halftone" opacity={0.25} />
//   <TextureOverlay texture="grid" />            (blueprint paper)

import { cn } from "@/lib/utils"

export type TextureType =
  | "dots"
  | "grid"
  | "noise"
  | "crosshatch"
  | "diagonal"
  | "scatteredDots"
  | "halftone"
  | "triangular"
  | "chevron"
  | "paperGrain"
  | "horizontalLines"
  | "verticalLines"
  | "none"

interface TextureOverlayProps {
  texture: TextureType
  /** 0–1 multiplier on the pattern ink. Default 0.2 (≈ 6% visible). */
  opacity?: number
  className?: string
}

const texturePatterns: Record<TextureType, string> = {
  dots: "bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.4)_1px,transparent_0)] bg-[length:8px_8px]",
  grid: "bg-[linear-gradient(rgba(0,0,0,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.3)_1px,transparent_1px)] bg-[length:12px_12px]",
  noise:
    "bg-[radial-gradient(circle_at_2px_2px,rgba(0,0,0,0.25)_1px,transparent_0)] bg-[length:6px_6px]",
  crosshatch:
    "bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.3)_2px,rgba(0,0,0,0.3)_4px),repeating-linear-gradient(-45deg,transparent,transparent_2px,rgba(0,0,0,0.3)_2px,rgba(0,0,0,0.3)_4px)]",
  diagonal:
    "bg-[repeating-linear-gradient(-45deg,rgba(0,0,0,0.2),rgba(0,0,0,0.2)_1px,transparent_1px,transparent_6px)]",
  scatteredDots:
    "bg-[radial-gradient(circle_at_3px_7px,rgba(0,0,0,0.3)_1px,transparent_0),radial-gradient(circle_at_11px_2px,rgba(0,0,0,0.3)_1px,transparent_0),radial-gradient(circle_at_7px_12px,rgba(0,0,0,0.3)_1px,transparent_0)] bg-[length:16px_16px]",
  halftone:
    "bg-[radial-gradient(circle,rgba(0,0,0,0.4)_25%,transparent_25%)] bg-[length:10px_10px] bg-[position:0_0,5px_5px]",
  triangular:
    "bg-[conic-gradient(from_0deg_at_50%_50%,rgba(0,0,0,0.3)_0deg_120deg,transparent_120deg_240deg,rgba(0,0,0,0.3)_240deg_360deg)] bg-[length:8px_8px] bg-[position:0_0,4px_4px]",
  chevron:
    "bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.2)_0px,rgba(0,0,0,0.2)_2px,transparent_2px,transparent_8px),repeating-linear-gradient(-45deg,rgba(0,0,0,0.2)_0px,rgba(0,0,0,0.2)_2px,transparent_2px,transparent_8px)]",
  paperGrain:
    "bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.1)_0px,transparent_1px,transparent_3px),repeating-linear-gradient(90deg,rgba(0,0,0,0.1)_0px,transparent_1px,transparent_4px),repeating-linear-gradient(45deg,rgba(0,0,0,0.05)_0px,transparent_1px,transparent_5px)]",
  horizontalLines:
    "bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.25)_0px,rgba(0,0,0,0.25)_1px,transparent_1px,transparent_4px)]",
  verticalLines:
    "bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.25)_0px,rgba(0,0,0,0.25)_1px,transparent_1px,transparent_4px)]",
  none: "",
}

export function TextureOverlay({ texture, opacity = 0.2, className }: TextureOverlayProps) {
  if (texture === "none") return null
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 dark:invert", texturePatterns[texture], className)}
      style={{ opacity }}
    />
  )
}
