// HighlightText — a content string with the filter's matches marked like a highlighter pen, while
// keeping the FIRST® brand rules from <MarkText>: FIRST stays italic (even when only part of it
// matches) and ®/™ stay small superscripts. Pure render, safe in Server and Client Components.
//
//   <HighlightText text={link.title} tokens={["pedro"]} />

import { Fragment, type ReactNode } from "react";

/** Character-level "is this matched?" mask for every token (case-insensitive). */
function matchMask(text: string, tokens: string[]): boolean[] {
  const mask = new Array<boolean>(text.length).fill(false);
  if (!tokens.length) return mask;
  const lower = text.toLowerCase();
  for (const token of tokens) {
    if (!token) continue;
    let at = lower.indexOf(token);
    while (at !== -1) {
      for (let k = at; k < at + token.length; k++) mask[k] = true;
      at = lower.indexOf(token, at + token.length);
    }
  }
  return mask;
}

/** Split `segment` (which starts at `offset` in the full string) into runs of matched / unmatched. */
function runs(segment: string, offset: number, mask: boolean[]): ReactNode[] {
  const out: ReactNode[] = [];
  let start = 0;
  for (let i = 1; i <= segment.length; i++) {
    const boundary = i === segment.length || mask[offset + i] !== mask[offset + start];
    if (!boundary) continue;
    const piece = segment.slice(start, i);
    out.push(
      mask[offset + start] ? (
        <mark
          key={start}
          className="rounded-[1px] bg-[color-mix(in_oklab,var(--pollen)_34%,transparent)] text-fg [box-decoration-break:clone]"
        >
          {piece}
        </mark>
      ) : (
        <Fragment key={start}>{piece}</Fragment>
      ),
    );
    start = i;
  }
  return out;
}

export function HighlightText({ text, tokens }: { text: string; tokens: string[] }): ReactNode {
  const mask = matchMask(text, tokens);
  const parts = text.split(/(FIRST|®|™)/g);
  let offset = 0;
  return parts.map((part, i) => {
    const at = offset;
    offset += part.length;
    if (!part) return null;
    if (part === "®" || part === "™") {
      return (
        <sup key={i} className="mark-reg">
          {part}
        </sup>
      );
    }
    const content = runs(part, at, mask);
    return part === "FIRST" ? (
      <i key={i} className="mark-first">
        {content}
      </i>
    ) : (
      <Fragment key={i}>{content}</Fragment>
    );
  });
}
