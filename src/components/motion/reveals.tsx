"use client";

// CSS-driven reveals (no per-frame JS). All render their final state on the server.
//
// LineDraw — a 1px rule draws across when it scrolls into view.
//   <LineDraw className="text-hairline" />            // colour comes from currentColor
//   <LineDraw origin="right" delay={0.2} />
//
// ImageWipe — plotter-style clip reveal + slow scale settle for images, renders and panels.
//   <ImageWipe className="aspect-[4/5]"><Image … fill /></ImageWipe>
//   <ImageWipe from="left">…</ImageWipe>
//
// RollText — label rolls up to a duplicate when its link/button is hovered or focused.
//   <Link href="/team"><RollText>Meet the team</RollText> →</Link>

import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./motion.css";
import { useArm } from "./use-arm";

export function LineDraw({
  className,
  origin = "left",
  delay = 0,
  immediate,
}: {
  className?: string;
  origin?: "left" | "right" | "center";
  delay?: number;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useArm(ref, { immediate, inset: 0.06 });
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn("m-line", className)}
      style={{ "--m-origin": origin, "--m-delay": `${delay}s` } as CSSProperties}
      data-m={immediate ? "play" : undefined}
    />
  );
}

const WIPE_FROM = {
  up: "100% 0 0 0", // reveals bottom → top
  down: "0 0 100% 0",
  left: "0 100% 0 0", // reveals left → right
  right: "0 0 0 100%",
} as const;

export function ImageWipe({
  children,
  className,
  from = "up",
  delay = 0,
  immediate,
}: {
  children: ReactNode;
  className?: string;
  from?: keyof typeof WIPE_FROM;
  delay?: number;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useArm(ref, { immediate, inset: 0.08 });
  return (
    <div
      ref={ref}
      className={cn("m-wipe", className)}
      style={{ "--m-from-inset": WIPE_FROM[from], "--m-delay": `${delay}s` } as CSSProperties}
      data-m={immediate ? "play" : undefined}
    >
      <div className="m-wipe-inner">{children}</div>
    </div>
  );
}

export function RollText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn("m-roll", className)}>
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  );
}
