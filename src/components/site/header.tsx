"use client";

// Site header (DESIGN_SPEC §3): fixed 56px bar, hairline bottom border, bg/85 + blur on
// subpages; transparent over the home hero until the story ends (see header-state.ts).
// Left: wings mark (draws on once per session) + APEX ROBOTICS + FTC 36674.
// Right (≥900px): nav with a sliding 1px pollen underline (motion layoutId, servo spring),
// ⌘K, theme toggle. <900px: MENU → family drawer. (No clock — removed at the team's request.)
// Anchored during page transitions (viewTransitionName "site-header").

import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ApexWings } from "@/components/brand/apex-wings";
import { RollText } from "@/components/motion";
import { pageBlurbs, site } from "@/content/site";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { openCommandPalette } from "./command-palette";
import { useHeaderOverlayState } from "./header-state";
import { ShortcutKbd } from "./kbd";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

export const isActivePath = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function Header() {
  const pathname = usePathname();
  return <HeaderView pathname={pathname} />;
}

/** Same header with no active link — the Suspense fallback while the pathname is unknown
 *  (only happens in the prerendered fallback shell of a dynamic route). */
export function HeaderFallback() {
  return <HeaderView pathname="" />;
}

function HeaderView({ pathname }: { pathname: string }) {
  const overlay = useHeaderOverlayState();
  const transparent = overlay ?? pathname === "/";

  return (
    <header
      data-vt-anchor=""
      data-transparent={transparent || undefined}
      style={{ viewTransitionName: "site-header" }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-[var(--header-h)] border-b transition-[background-color,border-color,backdrop-filter] duration-[420ms] ease-out",
        transparent
          ? "border-transparent bg-transparent"
          : "border-hairline bg-[var(--header-bg)] backdrop-blur-md backdrop-saturate-150",
      )}
    >
      <a
        href="#main"
        className="sr-only z-[90] rounded-sm bg-pollen px-3 py-2 font-mono text-[11px] tracking-[0.08em] text-pollen-ink uppercase focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <div className="container-page flex h-full items-center justify-between gap-6">
        <Brand />

        <div className="hidden items-center gap-5 min-[900px]:flex xl:gap-7">
          <DesktopNav pathname={pathname} />
          <span aria-hidden="true" className="h-4 w-px bg-hairline" />
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Open command palette"
            aria-keyshortcuts="Control+K Meta+K"
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-hairline px-2.5 text-fg-muted transition-colors duration-[120ms] hover:border-border-ui hover:text-fg"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.25" />
              <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.25" />
            </svg>
            <ShortcutKbd className="border-0 bg-transparent px-0" />
          </button>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 min-[900px]:hidden">
          <MobileMenu pathname={pathname} />
        </div>
      </div>
    </header>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      transitionTypes={["nav-back"]}
      className="group flex shrink-0 items-center gap-3 rounded-sm py-2"
      aria-label={`${site.name} — home`}
    >
      <ApexWings size={30} animate="draw" className="text-fg" />
      <span className="font-display text-[13px] leading-none font-normal tracking-[0.16em] whitespace-nowrap text-fg uppercase [font-stretch:125%]">
        Apex Robotics
      </span>
      <span className="hidden font-mono text-[10px] leading-none tracking-[0.08em] whitespace-nowrap text-fg-muted min-[420px]:inline min-[900px]:hidden min-[1080px]:inline">
        FTC {site.teamNumber}
      </span>
    </Link>
  );
}

function DesktopNav({ pathname }: { pathname: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <nav aria-label="Primary">
      <LayoutGroup id="site-nav">
        <ul className="flex items-center gap-1 xl:gap-2" onMouseLeave={() => setHovered(null)}>
          {site.nav.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  transitionTypes={["nav-forward"]}
                  aria-current={active ? "page" : undefined}
                  title={pageBlurbs[item.href]}
                  onMouseEnter={() => setHovered(item.href)}
                  onFocus={() => setHovered(item.href)}
                  onBlur={() => setHovered(null)}
                  className={cn(
                    "relative flex h-[var(--header-h)] items-center px-2 text-[14px] transition-colors duration-[120ms] focus-visible:outline-offset-[-10px]",
                    active ? "text-fg" : "text-fg-muted hover:text-fg",
                  )}
                >
                  <RollText>{item.short}</RollText>
                  {/* hover: label rolls + hairline underline draws */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-2 bottom-[15px] h-px origin-left bg-current transition-transform duration-[220ms] ease-out motion-reduce:transition-none",
                      hovered === item.href && !active ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                  {/* active: pollen underline slides between items on the header's bottom rule */}
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      aria-hidden="true"
                      className="absolute inset-x-2 -bottom-px h-px bg-pollen-line"
                      transition={spring.servo}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </LayoutGroup>
    </nav>
  );
}
