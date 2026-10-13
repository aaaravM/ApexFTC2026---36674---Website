// FoundingPlaque — FIG. 1 on /sponsors: an engraved "Founding Partner" plate with the wings, the team
// and the season, and a dashed, hatched slot that is still OPEN. It illustrates the idea the packet
// is built on (a rookie team's first partners) and its Gold benefit (a custom "Founding Partner"
// plaque) — it is labelled as an illustration, not the final plaque, and it never carries a name
// the team hasn't been given. Brushed-metal lines (cult texture-overlay), slotted screws, a bevel.
// Decorative apart from its accessible label. Motion: the wings flap once as the plaque comes into
// view beside the CTA; the open slot's dashes march. Server-safe.

import { TextureOverlay } from "@/components/ui/texture-overlay";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { PlateScrews } from "./nameplate";
import { MarchingAnts, WingsFlap } from "./sponsor-motion";

export function FoundingPlaque({ className, partnerName }: { className?: string; partnerName?: string }) {
  return (
    <div
      role="img"
      aria-label={`Illustration: a Founding Partner plate for ${site.name}, Team ${site.teamNumber}, inaugural season ${site.season.years} — ${
        partnerName ? partnerName : "slot open"
      }.`}
      className={cn("relative aspect-square w-full overflow-hidden border border-border-ui bg-surface-2 sm:aspect-[5/4]", className)}
    >
      <TextureOverlay texture="horizontalLines" opacity={0.14} />
      <PlateScrews inset="3" />

      <div
        aria-hidden="true"
        className="absolute inset-[26px] flex flex-col items-center justify-between border border-hairline-strong px-4 py-[7%] text-center sm:inset-9 sm:px-8"
      >
        <WingsFlap className="w-[clamp(52px,7vw,76px)] text-wing" />

        <div>
          <p className="font-display text-[clamp(22px,3vw,38px)] leading-[1.02] font-light tracking-[0.12em] text-fg uppercase [font-stretch:125%]">
            Founding
            <br />
            Partner
          </p>
          <p className="mt-4 font-mono text-[10px] leading-4 tracking-[0.14em] text-fg-muted uppercase">
            {site.name} · Team {site.teamNumber}
          </p>
          <p className="font-mono text-[10px] leading-4 tracking-[0.14em] text-fg-muted uppercase">
            Inaugural season · {site.season.years}
          </p>
        </div>

        <div
          className={cn(
            "relative flex h-11 w-full max-w-[320px] items-center justify-center text-fg-muted",
            partnerName ? "border border-border-ui" : "hatch",
          )}
        >
          {!partnerName && <MarchingAnts />}
          <span className="relative bg-surface-2 px-2.5 font-mono text-[10px] leading-4 tracking-[0.14em] uppercase">
            {partnerName ? <span className="text-fg">{partnerName}</span> : "Slot 01 · open"}
          </span>
        </div>
      </div>
    </div>
  );
}
