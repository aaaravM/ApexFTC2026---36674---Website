// Motion tokens (DESIGN_SPEC §2) for JS animation — the CSS twins are in globals.css
// (--ease-out / --ease-in-out / --ease-in, --dur-micro … --dur-large).
//
//   import { spring, ease, dur } from "@/lib/motion";
//   <motion.div animate={{ x }} transition={spring.servo} />
//   <motion.div transition={{ duration: dur.medium, ease: ease.out }} />
//   // R3F: cur = THREE.MathUtils.damp(cur, target, damp.turret, delta)

import type { Transition } from "motion/react";

/** Cubic-bezier control points (motion accepts these arrays as `ease`). */
export const ease = {
  /** entrances, reveals */
  out: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** state changes, transitions */
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  /** exits only */
  in: [0.55, 0, 1, 0.45] as [number, number, number, number],
};

/** Durations in SECONDS (motion's unit). */
export const dur = {
  micro: 0.12,
  small: 0.22,
  medium: 0.42,
  large: 0.9,
} as const;

/** Springs. servo: turret, reticle, active indicators. heavy: exploded parts, chassis, robot side moves. */
export const spring = {
  servo: { type: "spring", stiffness: 260, damping: 30, mass: 1 } satisfies Transition,
  heavy: { type: "spring", stiffness: 120, damping: 24, mass: 1.6 } satisfies Transition,
} as const;

/** λ values for THREE.MathUtils.damp(current, target, λ, delta) inside useFrame. */
export const damp = {
  turret: 10,
  chassis: 5,
} as const;

/** Stagger between items (s); never more than 6 items in one stagger. */
export const stagger = 0.04;

/** Standard section reveal (Reveal component). */
export const revealTransition: Transition = { duration: dur.medium, ease: ease.out };
