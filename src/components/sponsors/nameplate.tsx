// Nameplate — a machine nameplate (four slotted screws, a bevel line, brushed texture) with a
// dashed blank where a Founding Partner's logo goes. The blank SCALES WITH THE TIER, from the
// packet's own words: Gold "large logo", Silver "medium logo", Bronze "name or small logo" — and a
// CAD-style dimension line names the size. Relative sizes only: the real placements are set with
// the build.
//
//   <Nameplate size="large" />                       open slot
//   <Nameplate size="medium" partner={sponsor} />    shows their logo (or name) once they sign
// An open blank's dashed outline marches slowly (MarchingAnts; static under reduced motion).
// Server-safe.

import Image from "next/image";
import { TextureOverlay } from "@/components/ui/texture-overlay";
import type { Sponsor } from "@/content/sponsors";
import { cn } from "@/lib/utils";
import { MarchingAnts } from "./sponsor-motion";

export type PlateSize = "large" | "medium" | "small";

const BLANK: Record<PlateSize, { w: number; h: number; dim: string; caption: string }> = {
  large: { w: 74, h: 46, dim: "Large", caption: "Your logo" },
  medium: { w: 52, h: 36, dim: "Medium", caption: "Your logo" },
  small: { w: 32, h: 26, dim: "Small", caption: "Name or logo" },
};

/** A slotted screw head. Rotations are fixed (deterministic render, no random). */
export function Screw({ className, rotate }: { className?: string; rotate: number }) {
  return (
    <span aria-hidden="true" className={cn("absolute size-[9px] rounded-full border border-border-ui", className)}>
      <span className="absolute inset-x-[1px] top-1/2 h-px -translate-y-1/2 bg-border-ui" style={{ rotate: `${rotate}deg` }} />
    </span>
  );
}

export function PlateScrews({ inset = "2.5" }: { inset?: "2.5" | "3" }) {
  const p =
    inset === "3"
      ? ["left-3 top-3", "right-3 top-3", "left-3 bottom-3", "right-3 bottom-3"]
      : ["left-2.5 top-2.5", "right-2.5 top-2.5", "left-2.5 bottom-2.5", "right-2.5 bottom-2.5"];
  const rot = [24, 112, 158, 66];
  return (
    <>
      {p.map((pos, i) => (
        <Screw key={pos} className={pos} rotate={rot[i]} />
      ))}
    </>
  );
}

export interface NameplateProps {
  size: PlateSize;
  partner?: Sponsor;
  className?: string;
}

export function Nameplate({ size, partner, className }: NameplateProps) {
  const b = BLANK[size];
  return (
    <div
      className={cn("relative aspect-[16/9] w-full overflow-hidden border border-hairline-strong bg-surface-2", className)}
      role="img"
      aria-label={
        partner
          ? `${partner.name} — ${b.dim.toLowerCase()} logo plate`
          : `Open slot: ${size === "small" ? "name or small logo" : `${b.dim.toLowerCase()} logo`} on the robot and team shirts`
      }
    >
      <TextureOverlay texture="horizontalLines" opacity={0.1} />
      <PlateScrews />
      <span aria-hidden="true" className="absolute inset-[18px] border border-hairline" />

      <div className="absolute inset-0 flex items-center justify-center pt-3">
        <div className="relative" style={{ width: `${b.w}%`, height: `${b.h}%` }}>
          {/* dimension line: |—— LARGE ——| */}
          <span aria-hidden="true" className="absolute inset-x-0 -top-[18px] flex h-2.5 items-center">
            <span className="h-full w-px bg-fg-muted/70" />
            <span className="h-px flex-1 bg-fg-muted/50" />
            <span className="px-1.5 font-mono text-[9px] leading-none tracking-[0.1em] text-fg-muted uppercase">{b.dim}</span>
            <span className="h-px flex-1 bg-fg-muted/50" />
            <span className="h-full w-px bg-fg-muted/70" />
          </span>

          <div
            aria-hidden="true"
            className={cn(
              "relative flex size-full items-center justify-center text-fg-muted",
              partner ? "border border-border-ui bg-surface-1" : "hatch",
            )}
          >
            {!partner && <MarchingAnts />}
            {partner ? (
              partner.logo ? (
                <Image src={partner.logo} alt="" fill sizes="240px" className="object-contain p-[10%]" />
              ) : (
                <span className="px-2 text-center font-display text-[clamp(13px,1.3vw,18px)] leading-tight font-medium text-fg [font-stretch:110%]">
                  {partner.name}
                </span>
              )
            ) : (
              <span className="relative bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-[0.08em] whitespace-nowrap uppercase">
                {b.caption}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
