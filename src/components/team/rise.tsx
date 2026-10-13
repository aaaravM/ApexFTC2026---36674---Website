"use client";

// Rise — a list whose direct children rise in, one after another, when it scrolls into view
// (or on first paint with `immediate`). Same trigger as the motion kit (useArm: final state on the
// server, on-screen-at-load stays static, never armed under reduced motion), but CSS-driven and
// attribute-transparent, so it works where the kit's <Stagger> can't: lists that need an
// aria-label or data-* attributes, lists inside layout-animated roster cards — and it renders
// identical markup on server and client under reduced motion (no hydration mismatch).
// Children set their own index with style={{ "--i": n }} (team.css caps the delay).

import {
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useArm } from "@/components/motion";
import { cn } from "@/lib/utils";
import "./team.css";

export interface RiseProps extends HTMLAttributes<HTMLElement> {
  as?: "ul" | "ol" | "div";
  children: ReactNode;
  /** Seconds before the first child moves. */
  delay?: number;
  immediate?: boolean;
  /** rise (default) · stamp: chips stamp down one by one · slide: rows feed in from the left. */
  variant?: "rise" | "stamp" | "slide";
  [data: `data-${string}`]: string | undefined;
}

export function Rise({
  as: Tag = "ul",
  children,
  className,
  delay = 0,
  immediate,
  variant = "rise",
  style,
  ...rest
}: RiseProps) {
  const ref = useRef<HTMLElement>(null);
  useArm(ref, { immediate, inset: 0.06 });
  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn(
        "team-rise",
        variant !== "rise" && `team-rise--${variant}`,
        className,
      )}
      style={{ ...style, "--rise-delay": `${delay}s` } as CSSProperties}
      data-m={immediate ? "play" : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
