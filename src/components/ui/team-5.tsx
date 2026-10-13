// Team 5 — expanding portrait strip, from Watermelon UI (https://ui.watermelon.sh), MIT License ·
// Copyright (c) 2025-present Watermelon Contributors.
// Adapted for Apex Robotics (home "THE TEAM" + team overview):
//   • 12 members: two rows of 6 on desktop; on phones a horizontal snap row with names always
//     visible (hover can't be the only way in)
//   • engraved duotone portraits (public/team/engraved/*) that cross-fade to the colour photo on
//     hover/focus; members without photo consent get the wings PHOTO PENDING plate
//   • hover AND keyboard focus expand a strip (flex 1 → 3); every strip is a real link
//   • social links + react-icons removed (no student socials on a youth team site — FIRST YPP);
//     gradients/shadows/rounded corners removed; local next/image only
//   • reduced motion: no flex/opacity transitions. Server-safe (pure CSS interaction).
//
//   <Team5 members={team.map(toTeam5Member)} />      (toTeam5Member is exported below)

import Image from "next/image"
import type { ReactNode } from "react"

import { ApexWings } from "@/components/brand/apex-wings"
import { TransitionLink } from "@/components/site/transition-link"
import { displayName, engravedSrc, hasPublicPhoto, type TeamMember } from "@/content/team"
import { cn } from "@/lib/utils"

export interface Team5Member {
  id: string
  name: string
  role: string
  /** Engraved (duotone) portrait. Omit → PHOTO PENDING plate. */
  image?: string
  /** Colour photo shown on hover/focus. */
  imageColor?: string
  href?: string
  /** Small tag (e.g. FOUNDER). */
  tag?: string
}

export interface Team5Props {
  members: Team5Member[]
  /** Rows on desktop (default 2 → 6 per row for 12 members). */
  rows?: number
  className?: string
  /** Height of each desktop row. */
  rowHeightClassName?: string
}

/** Map a roster entry to a strip member (privacy-aware). */
export function toTeam5Member(m: TeamMember): Team5Member {
  const photo = hasPublicPhoto(m)
  return {
    id: m.slug,
    name: displayName(m),
    role: m.role,
    image: photo ? engravedSrc(m) : undefined,
    imageColor: photo ? m.photo?.src : undefined,
    href: `/team/${m.slug}`,
    tag: m.founder ? "Founder" : undefined,
  }
}

function Plate() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-2 text-wing">
      <div aria-hidden="true" className="hatch absolute inset-0 text-fg opacity-40" />
      <ApexWings className="relative w-[52%] max-w-[120px] opacity-70" />
    </div>
  )
}

function Portrait({ m, sizes }: { m: Team5Member; sizes: string }) {
  if (!m.image) return <Plate />
  return (
    <>
      <Image src={m.image} alt="" fill sizes={sizes} className="object-cover" />
      {m.imageColor && (
        <Image
          src={m.imageColor}
          alt=""
          fill
          sizes={sizes}
          className="object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
      )}
    </>
  )
}

function Strip({ m }: { m: Team5Member }) {
  const body = (
    <>
      <Portrait m={m} sizes="(min-width: 1280px) 30vw, 40vw" />
      {m.tag && (
        <span className="absolute top-0 left-0 border border-pollen-edge bg-pollen px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-pollen-ink uppercase">
          {m.tag}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 flex translate-y-2 flex-col gap-1 bg-bg/90 px-4 py-3 opacity-0 transition-[opacity,translate] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
        <span className="font-display text-[19px] leading-tight font-[560] whitespace-nowrap text-fg [font-stretch:108%]">{m.name}</span>
        <span className="font-mono text-[10px] tracking-[0.08em] whitespace-nowrap text-fg-muted uppercase">{m.role}</span>
      </span>
    </>
  )
  const classes = cn(
    "group relative block min-w-0 flex-[1] overflow-hidden border border-hairline bg-surface-2 outline-offset-2",
    "transition-[flex-grow,border-color] duration-500 ease-out hover:flex-[3] focus-visible:flex-[3] hover:border-border-ui motion-reduce:transition-none"
  )
  return m.href ? (
    <TransitionLink href={m.href} className={classes} aria-label={`${m.name} — ${m.role}`}>
      {body}
    </TransitionLink>
  ) : (
    <div className={classes}>{body}</div>
  )
}

function MobileCard({ m }: { m: Team5Member }) {
  const inner: ReactNode = (
    <>
      <span className="relative block aspect-[4/5] overflow-hidden border border-hairline bg-surface-2">
        <Portrait m={m} sizes="62vw" />
      </span>
      <span className="mt-2 block font-display text-[17px] leading-tight font-[560] text-fg [font-stretch:108%]">{m.name}</span>
      <span className="block font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">{m.role}</span>
    </>
  )
  return (
    <li className="w-[58vw] max-w-[260px] shrink-0 snap-start">
      {m.href ? (
        <TransitionLink href={m.href} className="block">
          {inner}
        </TransitionLink>
      ) : (
        inner
      )}
    </li>
  )
}

export default function Team5({ members, rows = 2, className, rowHeightClassName = "h-[clamp(260px,24vw,380px)]" }: Team5Props) {
  const perRow = Math.ceil(members.length / rows)
  const grouped = Array.from({ length: rows }, (_, r) => members.slice(r * perRow, (r + 1) * perRow)).filter((g) => g.length)

  return (
    <div className={cn("w-full", className)}>
      {/* desktop / tablet: expanding strips */}
      <div className="hidden flex-col gap-2 md:flex">
        {grouped.map((row, i) => (
          <div key={i} className={cn("flex gap-2", rowHeightClassName)}>
            {row.map((m) => (
              <Strip key={m.id} m={m} />
            ))}
          </div>
        ))}
      </div>
      {/* phones: snap row, names always visible */}
      <ul
        data-lenis-prevent=""
        className="-mx-[var(--page-margin)] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--page-margin)] pb-3 md:hidden"
        aria-label="Team members"
      >
        {members.map((m) => (
          <MobileCard key={m.id} m={m} />
        ))}
      </ul>
    </div>
  )
}

export { Team5 }
