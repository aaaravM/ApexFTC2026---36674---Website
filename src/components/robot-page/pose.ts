// Scroll → walkthrough pose. Pure maths shared by the DOM (which stop is active) and the 3D
// scene (chassis yaw + camera blend), so the two can never disagree.
//
// Between two stops the robot turns like a turntable with detents (a Geneva drive): it lingers
// near each stop so you can read about that subsystem, and spins quickly between them. A small
// linear share keeps it moving whenever you scroll. Fully reversible: it is a pure function of
// the scroll position.

export interface ScrollPose {
  /** Segment start stop. */
  i: number;
  /** 0–1 progress through the segment (linear in scroll). */
  t: number;
  /** Eased progress used for yaw + camera. */
  g: number;
  /** The stop the viewer is closest to (switches at the segment midpoint). */
  nearest: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** 6t⁵ − 15t⁴ + 10t³ */
export const smootherstep = (t: number) => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/** Geneva-style dwell: 18 % linear + 82 % concentrated in the middle 44 % of the segment. */
export const dwell = (t: number) => 0.18 * t + 0.82 * smootherstep((t - 0.28) / 0.44);

/** Out of the hero the spin starts the moment you scroll (no dwell at the top of the page). */
export const leave = (t: number) => {
  const x = clamp01(t);
  return 0.35 * x + 0.65 * (1 - (1 - x) * (1 - x) * (1 - x));
};

export function scrollPose(stops: readonly number[], s: number): ScrollPose {
  const n = stops.length;
  if (n === 0 || s <= stops[0]) return { i: 0, t: 0, g: 0, nearest: 0 };
  for (let i = 0; i < n - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (s <= b) {
      const t = clamp01((s - a) / Math.max(1, b - a));
      const g = i === 0 ? leave(t) : dwell(t);
      return { i, t, g, nearest: t < 0.5 ? i : i + 1 };
    }
  }
  return { i: n - 1, t: 0, g: 0, nearest: n - 1 };
}
