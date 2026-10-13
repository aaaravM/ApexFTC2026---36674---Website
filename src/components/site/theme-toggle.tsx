"use client";

// Theme toggle — the switch is drawn top→bottom like a pen plotter (Skiper UI skiper26's
// View-Transition theme wipe, restyled; see components/ui/skiper-ui/skiper26.tsx for the
// original). Uses document.startViewTransition when available, with the header temporarily
// un-anchored so the whole page sweeps together. Reduced motion → instant switch.
//
//   <ThemeToggle />                 header icon button
//   const toggle = useThemeSwitch(); toggle();   (command palette)

import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useCallback, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const noop = () => () => {};

export function useThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  return useCallback(
    (next?: "light" | "dark") => {
      const target = next ?? (resolvedTheme === "light" ? "dark" : "light");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
      if (reduce || !doc.startViewTransition) {
        setTheme(target);
        return;
      }
      const root = document.documentElement;
      root.classList.add("theme-wipe");
      const vt = doc.startViewTransition(() => {
        setTheme(target);
        // next-themes applies the class synchronously in an effect; force it now so the
        // snapshot of the "new" state already has the new theme.
        root.classList.remove(target === "light" ? "dark" : "light");
        root.classList.add(target);
        root.style.colorScheme = target;
      });
      vt.finished.finally(() => root.classList.remove("theme-wipe"));
    },
    [resolvedTheme, setTheme],
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const isDark = !mounted || resolvedTheme !== "light";
  const toggle = useThemeSwitch();

  return (
    <button
      type="button"
      onClick={() => toggle()}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-sm border border-hairline text-fg-muted transition-colors duration-[120ms] hover:border-border-ui hover:text-fg",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.25" />
        <motion.path
          d="M12 4.75a7.25 7.25 0 0 1 0 14.5z"
          fill="currentColor"
          initial={false}
          animate={{ rotate: isDark ? 0 : 180 }}
          style={{ originX: "12px", originY: "12px", transformBox: "view-box" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />
      </svg>
    </button>
  );
}
