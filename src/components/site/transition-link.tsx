// TransitionLink — next/link that tags the navigation for the page-transition recipe.
//   <TransitionLink href="/robot">…</TransitionLink>                       slides forward (default)
//   <TransitionLink href="/team" direction="back">← Team</TransitionLink>  slides back
//   <TransitionLink href="/" direction="none">…</TransitionLink>          no directional slide
// Pages wrap their content in <PageTransition> (page-transition.tsx) so the types animate.
// Server-safe (next/link works in Server Components).

import Link from "next/link";
import type { ComponentProps } from "react";

export type NavDirection = "forward" | "back" | "none";

export const transitionTypesFor = (direction: NavDirection = "forward"): string[] | undefined =>
  direction === "none" ? undefined : [direction === "back" ? "nav-back" : "nav-forward"];

export type TransitionLinkProps = ComponentProps<typeof Link> & { direction?: NavDirection };

export function TransitionLink({ direction = "forward", transitionTypes, ...props }: TransitionLinkProps) {
  return <Link transitionTypes={transitionTypes ?? transitionTypesFor(direction)} {...props} />;
}
