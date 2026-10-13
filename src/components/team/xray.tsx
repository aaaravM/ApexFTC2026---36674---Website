"use client";

// X-RAY portrait (DESIGN_SPEC §5 TEAM, research/design-direction.md §7.3): the engraved duotone
// print, with the member's original colour photo revealed through a circular lens.
//   • fine pointer: the lens follows the pointer (servo spring) and opens where the pointer enters
//   • keyboard focus: the lens grows from the member's face (photo.focal)
//   • `full` (member page toggle): the lens opens over the whole print
//   • touch: no lens (tap opens the profile, where the toggle lives)
//   • reduced motion: no moving lens — the original crossfades in (≤150ms)
// Pointer handlers go on the CARD (so the stretched link on top doesn't swallow them); the
// lens measures against the print's own box (`mediaRef`, owned by the caller). No React state
// per pointer move — motion values only.
//
//   const mediaRef = useRef<HTMLDivElement>(null);
//   const lens = useXrayLens(mediaRef, { focal: m.photo?.focal, enabled: hasPublicPhoto(m) });
//   <div {...lens.handlers}><div ref={mediaRef}><XrayPortrait member={m} lens={lens} sizes="…" /></div></div>

import Image from "next/image";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { useCallback, useMemo, useRef, useState, type FocusEvent, type PointerEvent, type RefObject } from "react";
import { PortraitPlate } from "@/components/site/member-portrait";
import { DitherImageContent, DitherImageFrame } from "@/components/ui/dither-image";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { displayName, engravedSrc, hasPublicPhoto, type TeamMember } from "@/content/team";
import { cn } from "@/lib/utils";

export type LensMode = "off" | "pointer" | "focus" | "full";

const SERVO = { stiffness: 260, damping: 30, mass: 1 };
const APERTURE = { stiffness: 210, damping: 27, mass: 1 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface XrayLens {
  handlers: {
    onPointerEnter: (e: PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    onPointerLeave: (e: PointerEvent<HTMLElement>) => void;
    onFocus: (e: FocusEvent<HTMLElement>) => void;
    onBlur: (e: FocusEvent<HTMLElement>) => void;
  };
  /** Open/close the lens over the whole print (member page toggle). */
  setFull: (on: boolean) => void;
  mode: LensMode;
  enabled: boolean;
  reduce: boolean;
  x: MotionValue<number>;
  y: MotionValue<number>;
  r: MotionValue<number>;
}

export interface XrayLensOptions {
  /** Face position in % of the 4:5 crop (TeamMember.photo.focal). */
  focal?: [number, number];
  /** Lens radius as a fraction of the print width (pointer / keyboard). */
  hover?: number;
  focus?: number;
  enabled?: boolean;
}

export function useXrayLens(
  mediaRef: RefObject<HTMLElement | null>,
  { focal = [50, 42], hover = 0.3, focus = 0.4, enabled = true }: XrayLensOptions = {},
): XrayLens {
  // hydration-safe (server snapshot = false): the reduced branch renders different markup
  const reduce = usePrefersReducedMotion();
  const [mode, setModeState] = useState<LensMode>("off");
  const modeRef = useRef<LensMode>("off");
  const [fx, fy] = focal;

  const tx = useMotionValue(fx);
  const ty = useMotionValue(fy);
  const tr = useMotionValue(0);
  const x = useSpring(tx, SERVO);
  const y = useSpring(ty, SERVO);
  const r = useSpring(tr, APERTURE);

  const setMode = useCallback((m: LensMode) => {
    modeRef.current = m;
    setModeState(m);
  }, []);

  const measure = useCallback(() => mediaRef.current?.getBoundingClientRect() ?? null, [mediaRef]);

  /** Put the lens centre somewhere instantly (no spring travel). */
  const place = useCallback(
    (px: number, py: number) => {
      tx.jump(px);
      ty.jump(py);
      x.jump(px);
      y.jump(py);
    },
    [tx, ty, x, y],
  );

  const toPercent = useCallback((e: PointerEvent<HTMLElement>, b: DOMRect) => {
    return [
      clamp(((e.clientX - b.left) / b.width) * 100, -8, 108),
      clamp(((e.clientY - b.top) / b.height) * 100, -8, 108),
    ] as const;
  }, []);

  const handlers = useMemo<XrayLens["handlers"]>(
    () => ({
      onPointerEnter: (e) => {
        if (!enabled || e.pointerType === "touch" || modeRef.current === "full") return;
        const b = measure();
        if (!b) return;
        const [px, py] = toPercent(e, b);
        if (modeRef.current === "off") place(px, py);
        else {
          tx.set(px);
          ty.set(py);
        }
        tr.set(b.width * hover);
        setMode("pointer");
      },
      onPointerMove: (e) => {
        if (!enabled || e.pointerType === "touch") return;
        const m = modeRef.current;
        if (m === "full") return;
        const b = measure();
        if (!b) return;
        const [px, py] = toPercent(e, b);
        if (m !== "pointer") {
          // keyboard lens was open, or the enter event was missed: take over from here
          tr.set(b.width * hover);
          setMode("pointer");
        }
        tx.set(px);
        ty.set(py);
      },
      onPointerLeave: (e) => {
        if (!enabled || e.pointerType === "touch") return;
        if (modeRef.current !== "pointer") return;
        tr.set(0);
        setMode("off");
      },
      onFocus: (e) => {
        if (!enabled || modeRef.current === "full") return;
        const t = e.target as HTMLElement;
        if (!t.matches(":focus-visible")) return; // mouse-click focus: the pointer lens handles it
        const b = measure();
        if (!b) return;
        if (modeRef.current === "off") place(fx, fy);
        else {
          tx.set(fx);
          ty.set(fy);
        }
        tr.set(b.width * focus);
        setMode("focus");
      },
      onBlur: (e) => {
        if (!enabled || modeRef.current !== "focus") return;
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        tr.set(0);
        setMode("off");
      },
    }),
    [enabled, measure, toPercent, place, tx, ty, tr, hover, focus, fx, fy, setMode],
  );

  const setFull = useCallback(
    (on: boolean) => {
      if (!enabled) return;
      const b = measure();
      if (on) {
        if (modeRef.current === "off") place(fx, fy);
        else {
          tx.set(fx);
          ty.set(fy);
        }
        // far enough from the face to clear every corner
        tr.set(b ? Math.hypot(b.width, b.height) * 1.05 : 2000);
        setMode("full");
      } else {
        tr.set(0);
        setMode("off");
      }
    },
    [enabled, measure, place, tx, ty, tr, fx, fy, setMode],
  );

  return { handlers, setFull, mode, enabled, reduce, x, y, r };
}

/** The original colour photo, clipped by the lens, plus the lens ring (hairline + 4 ticks). */
function XrayLayer({ src, lens, sizes }: { src: string; lens: XrayLens; sizes: string }) {
  const { x, y, r, mode, reduce } = lens;
  const clipPath = useMotionTemplate`circle(${r}px at ${x}% ${y}%)`;
  const left = useMotionTemplate`${x}%`;
  const top = useMotionTemplate`${y}%`;
  const size = useTransform(r, (v) => Math.max(0, v * 2));
  const ringOpacity = useTransform(r, [0, 18], [0, 1]);
  const showRing = !reduce && mode !== "full";

  return (
    <>
      <motion.div
        aria-hidden="true"
        className={cn("absolute inset-0", reduce && "transition-opacity duration-150 ease-out")}
        style={reduce ? { opacity: mode === "off" ? 0 : 1 } : { clipPath, WebkitClipPath: clipPath }}
      >
        {/* Same 4:5 crop and centring as the engraved print, so the two line up pixel for pixel. */}
        <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
      </motion.div>
      {showRing && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ecece7]/70 mix-blend-difference"
          style={{ left, top, width: size, height: size, opacity: ringOpacity }}
        >
          <span className="absolute -top-2 left-1/2 h-1.5 w-px bg-[#ecece7]/80" />
          <span className="absolute -bottom-2 left-1/2 h-1.5 w-px bg-[#ecece7]/80" />
          <span className="absolute top-1/2 -left-2 h-px w-1.5 bg-[#ecece7]/80" />
          <span className="absolute top-1/2 -right-2 h-px w-1.5 bg-[#ecece7]/80" />
        </motion.div>
      )}
    </>
  );
}

export interface XrayPortraitProps {
  member: TeamMember;
  lens: XrayLens;
  sizes: string;
  /** Above the fold: load eagerly with high fetch priority (next/image `preload` is for heroes). */
  eager?: boolean;
  /** Render the 1-bit dither layer the print develops out of (inside a team <Arrive>). */
  develop?: boolean;
  className?: string;
}

/** 4:5 engraved print + x-ray lens; members without photo consent get the wings plate. */
export function XrayPortrait({ member, lens, sizes, eager, develop, className }: XrayPortraitProps) {
  if (!hasPublicPhoto(member)) {
    return <PortraitPlate className={cn("team-plate", className)} />;
  }
  return (
    <div className={cn("relative aspect-[4/5] w-full overflow-hidden bg-surface-2", className)}>
      <Image
        src={engravedSrc(member)}
        alt={`Portrait of ${displayName(member)}`}
        fill
        sizes={sizes}
        loading={eager ? "eager" : undefined}
        fetchPriority={eager ? "high" : undefined}
        className="team-print object-cover"
      />
      {develop && (
        // display:none unless the card is arriving (team.css §9); same URL as the print → cached
        <div aria-hidden="true" className="team-dither">
          <DitherImageFrame size="md" brightness={0.92} aspectRatio="4 / 5" className="h-full">
            <DitherImageContent src={engravedSrc(member)} alt="" fill sizes={sizes} />
          </DitherImageFrame>
          <span className="team-dither-tint" />
          <span className="team-dither-lift" />
        </div>
      )}
      <XrayLayer src={member.photo.src} lens={lens} sizes={sizes} />
    </div>
  );
}

export { XrayLayer };
