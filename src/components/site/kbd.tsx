"use client";

// Kbd — keyboard key chip (mono, 2px radius, hairline).
//   <Kbd>Esc</Kbd>
//   <ShortcutKbd />      "⌘K" on Apple platforms, "Ctrl K" elsewhere (server renders "⌘K")

import { useSyncExternalStore, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-sm border border-hairline bg-surface-2 px-1.5 font-mono text-[10px] leading-none text-fg-muted uppercase tracking-[0.04em]",
        className,
      )}
      {...props}
    />
  );
}

const noop = () => () => {};
const isApple = () => /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

/** Platform-aware "⌘K" / "Ctrl K" chip. */
export function ShortcutKbd({ letter = "K", className }: { letter?: string; className?: string }) {
  const apple = useSyncExternalStore(noop, isApple, () => true);
  return (
    <Kbd className={className}>
      <span aria-hidden="true">{apple ? "⌘" : "Ctrl "}</span>
      <span aria-hidden="true">{letter}</span>
      <span className="sr-only">{apple ? "Command" : "Control"} {letter}</span>
    </Kbd>
  );
}
