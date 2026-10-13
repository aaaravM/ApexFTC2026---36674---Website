// Deterministic pseudo-random numbers. cacheComponents forbids Math.random() during render
// (prerender error), and random values also break hydration. Use a seeded generator instead:
//
//   const rand = mulberry32(36674);      // team number as the seed
//   const jitter = rand() * 4 - 2;       // same value on server and client, every build
//
// Math.random() is still fine inside effects, timers and event handlers.

export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A generator seeded with the team number. Create one per component/module, not per render. */
export const teamRandom = () => mulberry32(36674);

/** Stable hash of a string → 32-bit seed (e.g. seed a pattern from a member's slug). */
export function seedFrom(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
