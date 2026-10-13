/**
 * Skiper 40 — "CssLink" hover underlines, from Skiper UI (free tier).
 * Author: @gurvinder-singh02 · https://skiper-ui.com · Attribution to Skiper UI is required for
 * the free version (credited in the site footer colophon).
 *
 * Adapted for Apex Robotics: pure CSS (server-safe — the original "use client" was unnecessary),
 * hairline underline in currentColor, system easing, visible focus (underline also draws on
 * :focus-visible), reduced-motion safe, internal links use next/link with nav-forward page
 * transitions; external links open in a new tab with an sr-only hint.
 *
 *   <LinkDraw href="/robot">Meet the robot</LinkDraw>                underline draws in from the left
 *   <LinkExternal href="https://ftcscout.org/…">FTC Scout</LinkExternal>   + ↗ that rises into place
 *   <Link000> / <Link001> are the original names, kept as aliases.
 */

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const underline = cn(
  "before:pointer-events-none before:absolute before:bottom-[-0.12em] before:left-0 before:h-px before:w-full before:bg-current before:content-['']",
  "before:origin-right before:scale-x-0 before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.22,1,0.36,1)]",
  "hover:before:origin-left hover:before:scale-x-100 focus-visible:before:origin-left focus-visible:before:scale-x-100",
  "motion-reduce:before:transition-none",
);

type LinkProps = {
  children: ReactNode;
  href: string;
  className?: string;
  /** Page-transition type for internal links (default nav-forward). */
  transition?: "nav-forward" | "nav-back" | null;
};

export function LinkDraw({ children, href, className, transition = "nav-forward" }: LinkProps) {
  const internal = href.startsWith("/") && !href.startsWith("//");
  const classes = cn("group relative inline-flex items-center", underline, className);
  if (internal) {
    return (
      <Link href={href} className={classes} transitionTypes={transition ? [transition] : undefined}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={classes}>
      {children}
    </a>
  );
}

export function LinkExternal({ children, href, className }: Omit<LinkProps, "transition">) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn("group relative inline-flex items-center", underline, className)}>
      {children}
      <svg
        className="ml-[0.3em] size-[0.55em] translate-y-0.5 opacity-50 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
        fill="none"
        viewBox="0 0 10 10"
        aria-hidden="true"
      >
        <path d="M1.004 9.166 9.337.833m0 0v8.333m0-8.333H1.004" stroke="currentColor" strokeWidth="1.25" />
      </svg>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Original Skiper names. */
export const Link000 = LinkDraw;
export const Link001 = LinkExternal;

/** Original demo, re-pointed (not used on the site). */
export const Skiper40 = () => (
  <div className="flex flex-col items-start gap-4">
    <LinkDraw href="/robot">Meet the robot</LinkDraw>
    <LinkExternal href="https://skiper-ui.com">skiper-ui.com</LinkExternal>
  </div>
);
