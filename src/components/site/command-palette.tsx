"use client";

// Command palette (cmdk) — ⌘K / Ctrl+K / "/" anywhere (except while typing).
// Pages, people, robot subsystems, resources and actions (toggle theme, copy team number,
// "Fire POLLEN" on the home page). Mounted once in the root layout.
//
//   openCommandPalette()                         open it from any button
//   window.addEventListener(FIRE_EVENT, …)       home page: react to the "Fire POLLEN" action
//
// a11y: Radix Dialog (focus trap, Esc, focus return) with a real title/description; cmdk gives
// arrow keys, Home/End, Enter and aria-activedescendant. Lenis is stopped while open.

import { Command } from "cmdk";
import { useLenis } from "lenis/react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog as DialogPrimitive, VisuallyHidden } from "radix-ui";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { links } from "@/content/links";
import { subsystems } from "@/content/robot";
import { pageBlurbs, site } from "@/content/site";
import { displayName, team } from "@/content/team";
import { cn } from "@/lib/utils";
import { useThemeSwitch } from "./theme-toggle";

export const PALETTE_EVENT = "apex:palette";
export const FIRE_EVENT = "apex:fire";

/** Open the palette from anywhere (e.g. a header button). */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: "open" }));
}

type Item = {
  id: string;
  label: string;
  meta?: string;
  keywords?: string[];
  run: () => void;
};

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && !!el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']");

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const switchTheme = useThemeSwitch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!lenis) return;
    if (open) lenis.stop();
    else lenis.start();
  }, [open, lenis]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href, { transitionTypes: ["nav-forward"] });
    },
    [router],
  );
  const external = useCallback((href: string) => {
    setOpen(false);
    window.open(href, "_blank", "noopener,noreferrer");
  }, []);

  const groups = useMemo(() => {
    const pages: Item[] = [
      { id: "page-home", label: "Home", meta: "/", keywords: ["start", "apex robotics"], run: () => go("/") },
      ...site.nav.map((n) => ({
        id: `page-${n.href}`,
        label: n.label,
        meta: n.href,
        keywords: [n.short, pageBlurbs[n.href]],
        run: () => go(n.href),
      })),
      {
        id: "page-robot-lab",
        label: "Robot Lab",
        meta: "/lab/robot",
        keywords: ["lab", "bench", "3d model", "explode", "apex-r1"],
        run: () => go("/lab/robot"),
      },
    ];
    const people: Item[] = team.map((m) => ({
      id: `member-${m.slug}`,
      label: displayName(m),
      meta: m.role,
      keywords: [...m.disciplines, m.role, m.founder ? "founder" : ""],
      run: () => go(`/team/${m.slug}`),
    }));
    const robot: Item[] = subsystems.map((s) => ({
      id: `sub-${s.id}`,
      label: `${s.index} ${s.name}`,
      meta: s.code,
      keywords: [s.summary],
      run: () => go(`/robot#robot-${s.id}`),
    }));
    const actions: Item[] = [
      ...(pathname === "/"
        ? [
            {
              id: "act-fire",
              label: "Fire POLLEN",
              meta: "HOME",
              keywords: ["shoot", "launch", "ball"],
              run: () => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent(FIRE_EVENT));
              },
            },
          ]
        : []),
      {
        id: "act-theme",
        label: "Toggle light / dark theme",
        meta: "THEME",
        keywords: ["dark mode", "light mode", "colour"],
        run: () => {
          setOpen(false);
          window.setTimeout(() => switchTheme(), 60);
        },
      },
      {
        id: "act-copy",
        label: `Copy team number ${site.teamNumber}`,
        meta: "COPY",
        keywords: ["team number", "36674"],
        run: () => {
          navigator.clipboard?.writeText(site.teamNumber).then(
            () => setToast(`Copied ${site.teamNumber}`),
            () => setToast("Copy failed"),
          );
          setOpen(false);
        },
      },
      { id: "act-github", label: "Robot code on GitHub", meta: "↗", keywords: ["repo", "java", "source"], run: () => external(site.links.github) },
      { id: "act-packet", label: "Sponsorship packet", meta: "↗", keywords: ["sponsor", "donate", "partner"], run: () => external(site.links.sponsorPacket) },
    ];
    const resources: Item[] = links.map((l) => ({
      id: `link-${l.url}`,
      label: l.title,
      meta: "↗",
      keywords: [l.group, l.description],
      run: () => external(l.url),
    }));
    return [
      { heading: "Pages", items: pages },
      { heading: "Actions", items: actions },
      { heading: "Team", items: people },
      { heading: "Robot", items: robot },
      { heading: "Resources", items: resources },
    ];
  }, [go, external, pathname, switchTheme]);

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none" />
          <DialogPrimitive.Content
            className="fixed inset-x-3 top-[12svh] z-[70] mx-auto max-w-[640px] overflow-hidden rounded-sm border border-hairline bg-surface-1 text-fg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none"
          >
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>Site menu</DialogPrimitive.Title>
              <DialogPrimitive.Description>Search pages, people, robot subsystems, resources and actions.</DialogPrimitive.Description>
            </VisuallyHidden.Root>
            <Command label="Site menu" loop className="flex max-h-[min(560px,76svh)] flex-col">
              <div className="flex items-center gap-3 border-b border-hairline px-4">
                <span aria-hidden="true" className="font-mono text-[12px] text-fg-muted">
                  &gt;
                </span>
                <Command.Input
                  autoFocus
                  placeholder="Pages, people, subsystems…"
                  className="h-14 w-full bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-muted"
                />
                <kbd className="hidden h-5 items-center rounded-sm border border-hairline px-1.5 font-mono text-[10px] text-fg-muted sm:inline-flex">
                  ESC
                </kbd>
              </div>
              <Command.List data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
                <Command.Empty className="px-3 py-8 text-center font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase">
                  No match — try “turret” or a name
                </Command.Empty>
                {groups.map((g) => (
                  <Command.Group
                    key={g.heading}
                    heading={g.heading}
                    className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-[0.1em] [&_[cmdk-group-heading]]:text-fg-muted [&_[cmdk-group-heading]]:uppercase"
                  >
                    {g.items.map((it) => (
                      <PaletteItem key={it.id} value={`${it.label} ${it.id}`} keywords={it.keywords} onSelect={it.run} meta={it.meta}>
                        {it.label}
                      </PaletteItem>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
              <div className="flex items-center justify-between gap-4 border-t border-hairline px-4 py-2.5 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">
                <span>↑↓ Move · ↵ Open</span>
                <span>
                  {site.name} · Team {site.teamNumber}
                </span>
              </div>
            </Command>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-sm border border-hairline bg-surface-2 px-3 py-2 font-mono text-[11px] tracking-[0.08em] text-fg uppercase transition-opacity duration-200",
          toast ? "opacity-100" : "opacity-0",
        )}
      >
        {toast}
      </div>
    </>
  );
}

function PaletteItem({
  children,
  meta,
  value,
  keywords,
  onSelect,
}: {
  children: ReactNode;
  meta?: string;
  value: string;
  keywords?: string[];
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords?.filter(Boolean)}
      onSelect={onSelect}
      className="relative flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-sm px-3 py-2 text-[15px] text-fg-muted data-[selected=true]:bg-surface-2 data-[selected=true]:text-fg before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-pollen-line before:opacity-0 data-[selected=true]:before:opacity-100"
    >
      <span className="truncate">{children}</span>
      {meta && <span className="shrink-0 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">{meta}</span>}
    </Command.Item>
  );
}
