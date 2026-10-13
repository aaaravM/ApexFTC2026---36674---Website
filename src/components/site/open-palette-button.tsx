"use client";

// A button that opens the command palette (for pages / 404). Styled like <Button>.
//   <OpenPaletteButton>Open ⌘K</OpenPaletteButton>

import type { ReactNode } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button";
import { openCommandPalette } from "./command-palette";

export function OpenPaletteButton({
  children = "Search the site",
  variant = "primary",
  size = "md",
  className,
}: {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      aria-keyshortcuts="Control+K Meta+K"
      className={buttonClasses({ variant, size, className })}
    >
      {children}
    </button>
  );
}
