// MemberPortrait — a team member's 4:5 portrait, privacy-aware (DESIGN_SPEC §5 TEAM, §6).
//   <MemberPortrait member={m} sizes="(min-width:1024px) 22vw, 45vw" />            engraved duotone
//   <MemberPortrait member={m} variant="color" />                                  colour original (x-ray layer)
//   <MemberPortrait member={m} variant="full" priority />                          uncropped original
// Shows the photo ONLY when `consent` is true (hasPublicPhoto); otherwise the PHOTO PENDING plate
// (wings mark on a hatched plate, same tone as the engraved set). The engraved files come from
// `npm run portraits` (scripts/portraits.mjs → public/team/engraved/<slug>.webp).
// Fills its parent's width; set the parent's width. Server-safe.

import Image from "next/image";
import { ApexWings } from "@/components/brand/apex-wings";
import { displayName, engravedSrc, hasPublicPhoto, type TeamMember } from "@/content/team";
import { cn } from "@/lib/utils";

export interface MemberPortraitProps {
  member: TeamMember;
  variant?: "engraved" | "color" | "full";
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Hide the PHOTO PENDING caption on the plate (e.g. tiny thumbnails). */
  quietPlate?: boolean;
}

export function MemberPortrait({
  member,
  variant = "engraved",
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority,
  className,
  quietPlate,
}: MemberPortraitProps) {
  if (!hasPublicPhoto(member)) return <PortraitPlate className={className} quiet={quietPlate} />;
  const src = variant === "engraved" ? engravedSrc(member) : variant === "full" ? (member.photo.full ?? member.photo.src) : member.photo.src;
  const [fx, fy] = member.photo.focal;
  return (
    <div className={cn("relative aspect-[4/5] w-full overflow-hidden bg-surface-2", className)}>
      <Image
        src={src}
        alt={`Portrait of ${displayName(member)}`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        style={{ objectPosition: variant === "engraved" ? "50% 50%" : `${fx}% ${fy}%` }}
      />
    </div>
  );
}

/** The no-photo plate: wings mark on a hatched duotone plate + mono "PHOTO PENDING". */
export function PortraitPlate({ className, quiet }: { className?: string; quiet?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex aspect-[4/5] w-full flex-col items-center justify-center overflow-hidden bg-surface-2 text-wing",
        className,
      )}
    >
      <div aria-hidden="true" className="hatch absolute inset-0 text-fg opacity-40" />
      <ApexWings className="relative w-[46%] opacity-70" />
      {!quiet && (
        <p className="absolute inset-x-0 bottom-3 text-center font-mono text-[10px] tracking-[0.1em] text-fg-muted uppercase">
          Photo pending
        </p>
      )}
    </div>
  );
}
