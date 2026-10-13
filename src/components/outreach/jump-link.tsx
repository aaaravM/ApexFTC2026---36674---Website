"use client";

// JumpLink — an in-page anchor dressed as a site button, with a "↓" that nudges down on hover.
//
//   <JumpLink href="#outreach-book">How to book</JumpLink>                  secondary (text + underline)
//   <JumpLink href="#outreach-book" variant="primary">Book a session</JumpLink>
//
// Targets carry `scroll-mt-[calc(var(--header-h)+24px)]`, which is what places them below the fixed
// header. The browser's native jump honours it (touch / reduced motion, where Lenis is off). Lenis
// ALSO honours scroll-margin and then adds its global anchor offset (-64), which would double the
// gap — so when Lenis is running this link scrolls with offset 0 itself and keeps the click from
// reaching Lenis' own anchor handler. The URL hash is still updated.
// A plain <a>, not next/link: a hash on the same page must not start a route transition.
// Used by /outreach and /sponsors. String labels roll up on hover/focus and the link leans toward a
// fine pointer (motion kit); `className` goes on that magnetic wrapper (margins / placement).

import { useLenis } from "lenis/react";
import type { MouseEvent, ReactNode } from "react";
import { Magnetic, RollText } from "@/components/motion";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/site/button";

export interface JumpLinkProps {
  /** "#id" of a section on the same page. */
  href: `#${string}`;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function JumpLink({ href, children, variant = "secondary", size = "md", className }: JumpLinkProps) {
  const lenis = useLenis();
  const secondary = variant === "secondary";

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!lenis || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    lenis.scrollTo(target, { offset: 0 });
    history.replaceState(history.state, "", href);
    // Keep the native behaviour of moving the focus start point to the target (keyboard users).
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };

  const label = typeof children === "string" ? <RollText>{children}</RollText> : children;

  return (
    <Magnetic className={className}>
      <a href={href} onClick={onClick} className={buttonClasses({ variant, size })}>
        {secondary ? (
          <span className="link-draw pb-0.5 group-hover/btn:[background-size:100%_1px] group-focus-visible/btn:[background-size:100%_1px]">
            {label}
          </span>
        ) : (
          <span>{label}</span>
        )}
        <span
          aria-hidden="true"
          className="font-mono text-[0.9em] transition-transform duration-[220ms] ease-out group-hover/btn:translate-y-0.5 group-focus-visible/btn:translate-y-0.5 motion-reduce:transition-none"
        >
          ↓
        </span>
      </a>
    </Magnetic>
  );
}
