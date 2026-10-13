// Error 3 ("CONNECTION SEVERED" 404 block) — from Watermelon UI (https://ui.watermelon.sh),
// MIT License · Copyright (c) 2025-present Watermelon Contributors.
// Re-written for Apex Robotics in the solver's voice: NO SOLUTION — TARGET OUT OF RANGE (404).
// The lime glitch loop, black backdrop and blur are gone; the giant "404" is an engraved outline
// (1px stroke), the failReason line is the REAL message our solver returns for an out-of-range
// shot (computed from src/lib/ballistics.ts), and the actions are RETURN TO FIELD / OPEN ⌘K.
// Server-safe. Used by src/app/not-found.tsx.
//
//   <NotFoundBlock />
//   <NotFoundBlock title="No member at this address." reason="no team member with that name" />

import { ArcMotif } from "@/components/site/arc-motif"
import { ButtonLink } from "@/components/site/button"
import { ShortcutKbd } from "@/components/site/kbd"
import { OpenPaletteButton } from "@/components/site/open-palette-button"
import { solve } from "@/lib/ballistics"
import { cn } from "@/lib/utils"

/** The solver's own words for a shot it can't make (a 30 ft throw at a CELL). */
const OUT_OF_RANGE = solve({ muzzle: { x: 0, y: 0, z: 14 }, target: { x: 360, y: 0, z: 44 } }).failReason

export function NotFoundBlock({
  title = "No solution — target out of range.",
  reason = "no page at this address — check the link, or pick a page below",
  className,
}: {
  title?: string
  reason?: string
  className?: string
}) {
  return (
    <section className={cn("container-page flex min-h-[100svh] flex-col justify-center pt-[var(--header-h)] pb-16", className)}>
      <p
        aria-hidden="true"
        className="font-display text-[clamp(96px,22vw,320px)] leading-[0.8] font-[250] tracking-[0.02em] text-transparent select-none [-webkit-text-stroke:1px_var(--border-ui)] [font-stretch:125%]"
      >
        404
      </p>
      <p className="type-label mt-10 text-fg-muted">[ ERR / 404 ]</p>
      <h1 className="type-display mt-5 max-w-[16ch]">{title}</h1>
      <dl className="mt-6 space-y-1 font-mono text-[12px] leading-6 tracking-[0.02em] text-fg-muted">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-fg">failReason:</dt>
          <dd>&quot;{reason}&quot;</dd>
        </div>
        {OUT_OF_RANGE && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-fg">solver:</dt>
            <dd>&quot;{OUT_OF_RANGE}&quot;</dd>
          </div>
        )}
      </dl>
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <ButtonLink href="/" direction="back">
          Return to field
        </ButtonLink>
        <OpenPaletteButton variant="ghost">
          Open <ShortcutKbd className="ml-1" />
        </OpenPaletteButton>
      </div>
      <ArcMotif className="mt-16 max-w-3xl text-fg-muted" distanceIn={150} targetHeightIn={44} />
    </section>
  )
}

/** Original export name. */
export default function ErrorPage() {
  return <NotFoundBlock />
}
