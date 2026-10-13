// DrawingSheet — the frame of DWG-004 (DESIGN_SPEC §5 CAD): paper in both site themes, an outer
// and an inner border, zone numbers across the top and bottom (4 / 8 / 12 by breakpoint — 12 is the
// page grid), zone letters down the sides (I and O skipped, as on real drawings, so they never read
// as 1 and 0), centring marks, and the drawing number repeated upside-down in the top-left corner.
//
//   <DrawingSheet dwg="DWG-004">…sheet content…</DrawingSheet>
// Server component (the plotted borders are a small client island); the zone numbers and letters tick
// in round the sheet on load (CSS, ./plot.css). Everything decorative is aria-hidden.

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PlotFrame } from "./plot-frame";
import { styles } from "./styles";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");
/** 48 zones of 320–360px: enough for the longest (phone) layout; the band clips the rest. */
const ROWS = [...LETTERS, ...LETTERS.map((l) => `A${l}`)];

function numbers(n: number) {
  return Array.from({ length: n }, (_, i) => String(i + 1));
}

function HBand({ edge }: { edge: "top" | "bottom" }) {
  const pos = edge === "top" ? styles.bandTop : styles.bandBottom;
  return (
    <>
      {[
        [4, styles.zones4],
        [8, styles.zones8],
        [12, styles.zones12],
      ].map(([n, cls]) => (
        <div key={n} aria-hidden="true" className={cn(styles.bandH, pos, cls as string)}>
          {numbers(n as number).map((z, i) => (
            <span key={z} style={{ "--i": i } as CSSProperties}>
              {z}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

function VBand({ edge }: { edge: "left" | "right" }) {
  return (
    <div aria-hidden="true" className={cn(styles.bandV, edge === "left" ? styles.bandLeft : styles.bandRight)}>
      {ROWS.map((z, i) => (
        <span key={z} style={{ "--i": i } as CSSProperties}>
          {z}
        </span>
      ))}
    </div>
  );
}

export function DrawingSheet({ dwg, children, className }: { dwg: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn(styles.paper, styles.sheet, className)}>
      {/* the drawing area carries the faint 24 px construction grid */}
      <div aria-hidden="true" className={cn(styles.drawingArea, "paper-grid")} />
      {/* the borders plot themselves on load: outer first, then the heavier inner border */}
      <PlotFrame className={styles.frameOuter} immediate duration={1.2} />
      <PlotFrame className={styles.frameInner} immediate weight={1.5} delay={0.25} duration={1.5} />
      <HBand edge="top" />
      <HBand edge="bottom" />
      <VBand edge="left" />
      <VBand edge="right" />
      <span aria-hidden="true" className={cn(styles.centreMark, styles.centreTop)} />
      <span aria-hidden="true" className={cn(styles.centreMark, styles.centreBottom)} />
      <span aria-hidden="true" className={cn(styles.centreMark, styles.centreLeft)} />
      <span aria-hidden="true" className={cn(styles.centreMark, styles.centreRight)} />
      <span aria-hidden="true" className={styles.dwgCorner}>
        {dwg}
      </span>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
