// Buttons (DESIGN_SPEC §3).
//   primary   — surface-2 fill, 1px border-ui, text; hover/focus fills POLLEN with ink text in 120ms
//   secondary — text link with "→" that nudges 4px and an underline that draws on hover/focus
//   ghost     — hairline-bordered quiet control (toolbars, toggles)
//
//   <Button onClick={…}>Fire</Button>
//   <ButtonLink href="/robot">Meet the robot</ButtonLink>                          internal, nav-forward
//   <ButtonLink href={site.links.sponsorPacket} external>View the packet</ButtonLink>  new-tab ↗
//   <ButtonLink href="/team" variant="secondary">Meet the team</ButtonLink>
// Server-safe.

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TransitionLink, type NavDirection } from "./transition-link";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none rounded-sm font-sans font-medium outline-offset-2 transition-[background-color,color,border-color] duration-[120ms] ease-out disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40";

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-[14px]",
  lg: "h-12 px-5 text-[15px]",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-surface-2 text-fg border border-border-ui hover:bg-pollen hover:text-pollen-ink hover:border-pollen-edge focus-visible:bg-pollen focus-visible:text-pollen-ink focus-visible:border-pollen-edge",
  secondary: "h-auto px-0 text-fg hover:text-fg",
  ghost: "border border-hairline text-fg-muted hover:text-fg hover:border-border-ui bg-transparent",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variant !== "secondary" && sizes[size], variants[variant], variant === "secondary" && "text-[15px]", className);
}

/** Inner content: label + arrow. Secondary gets the underline-draw + nudging arrow. */
function Inner({
  variant,
  children,
  arrow,
  external,
}: {
  variant: ButtonVariant;
  children: ReactNode;
  arrow?: boolean;
  external?: boolean;
}) {
  const glyph = external ? "↗" : "→";
  const showArrow = arrow ?? (variant === "secondary" || external);
  if (variant === "secondary") {
    return (
      <>
        <span className="link-draw pb-0.5 group-hover/btn:[background-size:100%_1px] group-focus-visible/btn:[background-size:100%_1px]">
          {children}
        </span>
        {showArrow && (
          <span
            aria-hidden="true"
            className="font-mono text-[0.9em] transition-transform duration-[220ms] ease-out group-hover/btn:translate-x-1 group-focus-visible/btn:translate-x-1 motion-reduce:transition-none"
          >
            {glyph}
          </span>
        )}
      </>
    );
  }
  return (
    <>
      <span>{children}</span>
      {showArrow && (
        <span
          aria-hidden="true"
          className="font-mono text-[0.9em] transition-transform duration-[220ms] ease-out group-hover/btn:translate-x-0.5 motion-reduce:transition-none"
        >
          {glyph}
        </span>
      )}
    </>
  );
}

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show the → glyph (default: secondary only). */
  arrow?: boolean;
};

export function Button({ variant = "primary", size = "md", arrow, className, children, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, className })} {...props}>
      <Inner variant={variant} arrow={arrow}>
        {children}
      </Inner>
    </button>
  );
}

export type ButtonLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: boolean;
  /** Opens in a new tab with rel="noopener noreferrer" and a ↗ glyph + sr-only hint. */
  external?: boolean;
  /** Page-transition direction for internal links (default forward). */
  direction?: NavDirection;
  prefetch?: boolean;
};

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  arrow,
  external,
  direction = "forward",
  prefetch,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const classes = buttonClasses({ variant, size, className });
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...props}>
        <Inner variant={variant} arrow={arrow} external>
          {children}
        </Inner>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <TransitionLink href={href} direction={direction} prefetch={prefetch} className={classes} {...props}>
      <Inner variant={variant} arrow={arrow}>
        {children}
      </Inner>
    </TransitionLink>
  );
}
