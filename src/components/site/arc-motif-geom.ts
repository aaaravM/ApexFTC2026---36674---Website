// Shared, pure helpers for the trajectory plate (./arc-motif.tsx renders the drawing on the server,
// ./arc-motif-client.tsx rebuilds parts of it while it animates). No React, no "use client": both
// sides import the same numbers.

/** The CELL glyph, inches: an open catcher. A symbol sized to the ball, not the CELL's real depth:
 *  the near lip sits `clear` below where the ball crosses it, the back wall rises above where the
 *  ball meets it (so the ball is caught), the floor is `depth` below the near lip. */
export const CUP = { halfW: 3.6, clear: 0.6, depth: 3.4 } as const;

/** Time ticks along the arc, seconds apart. */
export const TICK_S = 0.1;

/** Ground hatch under the floor line: 45° strokes `size` in long, every `step` in. */
const HATCH = { step: 2, size: 1.7 } as const;

/** The ground hatch between x1 and x2 (inches, floor at y = 0, drawn below it). */
export function hatchPath(x1: number, x2: number) {
  let d = "";
  for (let x = Math.ceil(x1 / HATCH.step) * HATCH.step; x <= x2; x += HATCH.step) d += `M${x} 0l-${HATCH.size} ${HATCH.size}`;
  return d;
}

/** How far the hatch reaches below the floor, inches (CSS keeps the range dimension clear of it). */
export const HATCH_DEPTH_IN = HATCH.size;
