// ─────────────────────────────────────────────────────────────────────────────
// FIRST® branding helpers (DESIGN_SPEC §7, research/biobuzz-first.md §2.2).
//
//   <Mark id="first" />             FIRST®            (FIRST always italic caps)
//   <Mark id="ftc" />               FIRST® Tech Challenge
//   <Mark id="ftc-short" />         FTC®
//   <Mark id="biobuzz" />           BIOBUZZ™   — add `presentedBy` on the first body mention:
//   <Mark id="biobuzz" presentedBy />  BIOBUZZ™ presented by RTX
//   <Mark id="canopy" />            FIRST® CANOPY™
//   <Mark id="gp" />                Gracious Professionalism®
//   <Mark id="first" in="heading" /> tracks headings separately from body copy
//
// The ® / ™ symbol is printed on the FIRST use per page (separately for headings and body);
// later uses omit it. In Server Components this is tracked per render with React `cache`;
// inside Client Components every use keeps its symbol (allowed by FIRST, just a little noisy).
// Force it either way with `symbol={true|false}`.
//
// <MarkText>{"We're … FIRST® Tech Challenge …"}</MarkText> renders a plain content string with
// FIRST italicised and ®/™ set as small superscripts — use it for strings from src/content.
//
// Never: "BioBuzz", possessive "FIRST's", or fusing a mark into our name ("ApexFTC").
// ─────────────────────────────────────────────────────────────────────────────

import { cache, Fragment, type ReactNode } from "react";

export type MarkId = "first" | "ftc" | "ftc-short" | "biobuzz" | "canopy" | "gp";

/** Per-render memory of which marks already printed their symbol. */
const seenMarks = cache(() => new Set<string>());

function firstUse(key: string, force?: boolean): boolean {
  if (typeof force === "boolean") return force;
  const seen = seenMarks();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

const Sym = ({ s }: { s: "®" | "™" }) => <sup className="mark-reg">{s}</sup>;
const FirstWord = () => <i className="mark-first">FIRST</i>;

export interface MarkProps {
  id: MarkId;
  /** Heading or body copy — FIRST asks for the symbol on the first use in EACH. Default "body". */
  in?: "heading" | "body";
  /** Force the ®/™ on (true) or off (false). Default: first use per page only. */
  symbol?: boolean;
  /** BIOBUZZ only: append "presented by RTX" (do this on the first body mention). */
  presentedBy?: boolean;
}

export function Mark({ id, in: where = "body", symbol, presentedBy }: MarkProps) {
  // FIRST® and FTC® share the FIRST symbol budget; BIOBUZZ, CANOPY and GP each have their own.
  const firstSym = firstUse(`first:${where}`, id === "first" || id === "ftc" || id === "canopy" ? symbol : false);
  switch (id) {
    case "first":
      return (
        <span className="whitespace-nowrap">
          <FirstWord />
          {firstSym && <Sym s="®" />}
        </span>
      );
    case "ftc":
      return (
        <>
          <span className="whitespace-nowrap">
            <FirstWord />
            {firstSym && <Sym s="®" />}
          </span>{" "}
          Tech Challenge
        </>
      );
    case "ftc-short":
      return <FtcShort where={where} symbol={symbol} />;
    case "biobuzz":
      return <Biobuzz where={where} symbol={symbol} presentedBy={presentedBy} />;
    case "canopy":
      return (
        <>
          <span className="whitespace-nowrap">
            <FirstWord />
            {firstSym && <Sym s="®" />}
          </span>{" "}
          <CanopyWord where={where} symbol={symbol} />
        </>
      );
    case "gp":
      return <Gp where={where} symbol={symbol} />;
  }
}

function FtcShort({ where, symbol }: { where: string; symbol?: boolean }) {
  const sym = firstUse(`ftc-short:${where}`, symbol);
  return (
    <span className="whitespace-nowrap">
      FTC{sym && <Sym s="®" />}
    </span>
  );
}

function Biobuzz({ where, symbol, presentedBy }: { where: string; symbol?: boolean; presentedBy?: boolean }) {
  const sym = firstUse(`biobuzz:${where}`, symbol);
  return (
    <>
      <span className="whitespace-nowrap">
        BIOBUZZ{sym && <Sym s="™" />}
      </span>
      {presentedBy && " presented by RTX"}
    </>
  );
}

function CanopyWord({ where, symbol }: { where: string; symbol?: boolean }) {
  const sym = firstUse(`canopy:${where}`, symbol);
  return (
    <span className="whitespace-nowrap">
      CANOPY{sym && <Sym s="™" />}
    </span>
  );
}

function Gp({ where, symbol }: { where: string; symbol?: boolean }) {
  const sym = firstUse(`gp:${where}`, symbol);
  return (
    <span className="whitespace-nowrap">
      Gracious Professionalism{sym && <Sym s="®" />}
    </span>
  );
}

/**
 * Render a plain string with FIRST italicised and ®/™ as small superscripts.
 * `<MarkText>{chapter.body}</MarkText>` — safe in Server and Client Components.
 */
export function MarkText({ children }: { children: string }): ReactNode {
  const parts = children.split(/(FIRST|®|™)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p === "FIRST") return <FirstWord key={i} />;
        if (p === "®" || p === "™") return <Sym key={i} s={p} />;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
