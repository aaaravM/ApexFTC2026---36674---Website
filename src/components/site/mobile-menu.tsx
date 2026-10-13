"use client";

// Mobile navigation (<900px): MENU → Cult UI family drawer (vaul) with the page index as big
// Hubot links with mono index numbers (TextRoll from Skiper UI on hover), season quick facts,
// theme toggle and GitHub.

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Mark } from "@/components/brand/mark";
import {
  FamilyDrawerAnimatedContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerClose,
  FamilyDrawerContent,
  FamilyDrawerDescription,
  FamilyDrawerOverlay,
  FamilyDrawerPortal,
  FamilyDrawerRoot,
  FamilyDrawerTitle,
  FamilyDrawerTrigger,
} from "@/components/ui/family-drawer";
import { TextRoll } from "@/components/ui/skiper-ui/skiper58";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const ITEMS = [{ href: "/", label: "Home", short: "Home", index: "00" }, ...site.nav];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function MobileMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);

  return (
    <FamilyDrawerRoot open={open} onOpenChange={setOpen}>
      <FamilyDrawerTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-hairline px-3 font-mono text-[11px] tracking-[0.08em] text-fg uppercase transition-colors hover:border-border-ui"
        >
          <span aria-hidden="true" className="flex w-3.5 flex-col gap-[3px]">
            <span className="h-px w-full bg-current" />
            <span className="h-px w-full bg-current" />
          </span>
          Menu
        </button>
      </FamilyDrawerTrigger>
      <FamilyDrawerPortal>
        <FamilyDrawerOverlay />
        <FamilyDrawerContent>
          <FamilyDrawerClose />
          <FamilyDrawerAnimatedWrapper className="px-5 pt-4 pb-5">
            <FamilyDrawerAnimatedContent>
              <FamilyDrawerTitle className="flex h-11 items-center font-mono text-[11px] font-normal tracking-[0.08em] text-fg-muted uppercase [font-stretch:100%]">
                [ Index ]
              </FamilyDrawerTitle>
              <FamilyDrawerDescription className="sr-only">Site pages and season facts</FamilyDrawerDescription>

              <nav aria-label="Mobile" className="mt-4">
                <ul className="border-t border-hairline">
                  {ITEMS.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href} className="border-b border-hairline">
                        <motion.div initial="initial" whileHover="hovered" whileFocus="hovered">
                          <Link
                            href={item.href}
                            transitionTypes={[item.href === "/" ? "nav-back" : "nav-forward"]}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setOpen(false)}
                            className="flex min-h-14 items-center gap-4 py-2"
                          >
                            <span className="w-6 shrink-0 font-mono text-[11px] tracking-[0.08em] text-fg-muted">{item.index}</span>
                            <span
                              className={cn(
                                "font-display text-[clamp(26px,7.4vw,34px)] leading-none font-medium [font-stretch:112%]",
                                active ? "text-fg" : "text-fg/80",
                              )}
                            >
                              <TextRoll inherit>{item.label}</TextRoll>
                            </span>
                            {active && <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-pollen-line" />}
                          </Link>
                        </motion.div>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <dl className="mt-6 grid grid-cols-2 gap-px border border-hairline bg-hairline">
                {[
                  { k: "Season", v: <><Mark id="biobuzz" symbol /> {site.season.years}</> },
                  { k: "Team", v: site.teamNumber },
                  { k: "Home", v: site.locationShort },
                  { k: "Rookie year", v: site.rookieYear },
                ].map((f) => (
                  <div key={f.k} className="bg-surface-1 px-3 py-2.5">
                    <dt className="font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">{f.k}</dt>
                    <dd className="mt-0.5 font-mono text-[12px] text-fg uppercase">{f.v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex items-center justify-between gap-3">
                <a
                  href={site.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-sm border border-hairline px-3 font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase hover:text-fg"
                >
                  Robot code ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">Theme</span>
                  <ThemeToggle className="size-11" />
                </div>
              </div>
            </FamilyDrawerAnimatedContent>
          </FamilyDrawerAnimatedWrapper>
        </FamilyDrawerContent>
      </FamilyDrawerPortal>
    </FamilyDrawerRoot>
  );
}
