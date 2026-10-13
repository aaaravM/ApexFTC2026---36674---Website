"use client";

// Header contact sheet (TEAM page, desktop): all 12 frames in the page header, so the first screen
// has faces in it. Each frame jumps to that member's card: the roster clears its filter if the
// card is hidden, scrolls it under the sticky bar, pings its frame and (keyboard) moves focus to
// it. Plain #anchors underneath, so it works before hydration too.

import Image from "next/image";
import type { CSSProperties, MouseEvent } from "react";
import { PortraitPlate } from "@/components/site/member-portrait";
import { displayName, engravedSrc, hasPublicPhoto, team } from "@/content/team";
import { pad2 } from "./data";
import "./team.css";

/** Fired by the header sheet, handled by TeamRoster. */
export const JUMP_EVENT = "team:jump";
export interface JumpDetail {
  slug: string;
  /** Activated from the keyboard → move focus to the card. */
  keyboard: boolean;
}

function jump(e: MouseEvent<HTMLAnchorElement>, slug: string) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  // detail === 0 → the click came from Enter/Space, not a pointer
  window.dispatchEvent(
    new CustomEvent<JumpDetail>(JUMP_EVENT, {
      detail: { slug, keyboard: e.detail === 0 },
    }),
  );
}

export function HeaderSheet() {
  return (
    <nav aria-label="Jump to a team member" className="team-sheet">
      <p className="type-label flex items-center justify-between text-fg-muted">
        <span>Contact sheet</span>
        <span className="tabular-nums">{pad2(team.length)} frames</span>
      </p>
      <ol className="mt-3 grid grid-cols-6 gap-x-1.5 gap-y-3">
        {team.map((m, i) => (
          <li
            key={m.slug}
            className="team-sheet-frame min-w-0"
            style={{ "--c": i % 6, "--r": Math.floor(i / 6) } as CSSProperties}
          >
            <a
              href={`#team-card-${m.slug}`}
              onClick={(e) => jump(e, m.slug)}
              aria-label={`#${pad2(i + 1)} ${displayName(m)}`}
              className="group block"
            >
              <span className="mb-1 block font-mono text-[10px] leading-4 tracking-[0.06em] text-fg-muted tabular-nums transition-colors duration-[120ms] group-hover:text-fg group-focus-visible:text-fg">
                {pad2(i + 1)}
              </span>
              <span className="block border border-hairline transition-colors duration-[220ms] ease-out group-hover:border-pollen-line group-focus-visible:border-pollen-line">
                {hasPublicPhoto(m) ? (
                  <span className="relative block aspect-[4/5] overflow-hidden bg-surface-2">
                    <Image src={engravedSrc(m)} alt="" fill sizes="72px" className="object-cover" />
                  </span>
                ) : (
                  <PortraitPlate quiet />
                )}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
