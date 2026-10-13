// ─────────────────────────────────────────────────────────────────────────────
// ApexWings — the team's engraved wings mark as live vector paths.
//
//   <ApexWings size={28} animate="draw" />           header: draws on once per session
//   <ApexWings size={120} animate="draw" className="text-wing" />   large display ink
//   <ApexWings size={40} animate="flap" />           flaps on mount, and on hover/focus of a parent `.group`
//   <ApexWings size={64} />                          static
//
// Animation is pure CSS (globals.css § "Wings mark"), so it starts at first paint, before
// hydration, with no flash. "draw": all 72 sub-paths stroke themselves in together (700ms), the
// fill crossfades in (250ms), then each wing flaps ±3° about its root and settles (servo-like).
// Once per session: an inline script in the root layout marks <html data-wings="drawn"> on later
// loads, and <WingsSessionFlag/> sets it after the first run. Reduced motion → static mark.
// Colour = currentColor (use `text-wing` for large display marks, spec §1). Server-safe.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";
import { WING_LEFT_PATH, WING_RIGHT_PATH, WINGS_VIEWBOX } from "./wings-paths";

/** Each wing outline is one path with many sub-paths; split them so every stroke draws in parallel. */
const splitSubpaths = (d: string) =>
  d
    .split(/(?=M )/)
    .map((s) => s.trim())
    .filter(Boolean);

const LEFT_STROKES = splitSubpaths(WING_LEFT_PATH);
const RIGHT_STROKES = splitSubpaths(WING_RIGHT_PATH);

export type WingsAnimation = "draw" | "flap" | "none";

export interface ApexWingsProps {
  /** Rendered width in px (height follows the 803 × 578 aspect). Omit to size with CSS. */
  size?: number;
  animate?: WingsAnimation;
  className?: string;
  /** Accessible name. Omit for a decorative mark (aria-hidden). */
  title?: string;
}

export const WINGS_ASPECT = WINGS_VIEWBOX.height / WINGS_VIEWBOX.width;

export function ApexWings({ size, animate = "none", className, title }: ApexWingsProps) {
  const { width, height } = WINGS_VIEWBOX;
  const style = size ? { width: size, height: size * WINGS_ASPECT } : undefined;
  const draw = animate === "draw";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("apex-wings shrink-0 overflow-visible", className)}
      data-animate={animate}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g className="wing wing-l">
        <path d={WING_LEFT_PATH} className="wing-fill" fill="currentColor" fillRule="evenodd" />
        {draw && (
          <g className="wing-strokes" fill="none" stroke="currentColor">
            {LEFT_STROKES.map((d, i) => (
              <path key={i} d={d} className="wing-stroke" pathLength={1} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        )}
      </g>
      <g className="wing wing-r">
        <path d={WING_RIGHT_PATH} className="wing-fill" fill="currentColor" fillRule="evenodd" />
        {draw && (
          <g className="wing-strokes" fill="none" stroke="currentColor">
            {RIGHT_STROKES.map((d, i) => (
              <path key={i} d={d} className="wing-stroke" pathLength={1} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}
