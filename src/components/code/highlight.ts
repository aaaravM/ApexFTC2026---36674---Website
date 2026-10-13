// Build-time Java highlighting with shiki 4 (server only).
// shiki calls Date.now() internally, so under cacheComponents it MUST run inside "use cache" with
// cacheLife("max") (lab-verified: otherwise the prerender aborts). We return plain token data —
// { c: text, k: kind } per token, one array per line — and render our own spans (code-view.tsx),
// so client components can mark lines live (gates, active ball, solver path) without re-highlighting.
//
// Theme: our own monochrome scheme. The theme maps TextMate scopes to sentinel colours
// ("var(--tok-<kind>)") that we read back into a token kind; the look lives in code-view.tsx.

import { cacheLife } from "next/cache";
import { codeToTokens, type ThemeRegistration } from "shiki";

export type TokenKind = "default" | "comment" | "keyword" | "type" | "function" | "number" | "string" | "constant" | "punct";

export interface CodeToken {
  /** Text. */
  c: string;
  /** Kind (drives the colour/weight). */
  k: TokenKind;
}
export type CodeLine = CodeToken[];

const v = (k: TokenKind) => `var(--tok-${k})`;

const apexMono: ThemeRegistration = {
  name: "apex-mono",
  type: "dark",
  fg: v("default"),
  bg: "transparent",
  colors: { "editor.foreground": v("default"), "editor.background": "transparent" },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment", "comment.block.javadoc"], settings: { foreground: v("comment") } },
    { scope: ["string", "string.quoted", "punctuation.definition.string"], settings: { foreground: v("string") } },
    { scope: ["constant.numeric"], settings: { foreground: v("number") } },
    { scope: ["constant.language"], settings: { foreground: v("keyword") } },
    {
      scope: ["keyword", "keyword.control", "storage.modifier", "storage.type.primitive", "keyword.other", "variable.language.this"],
      settings: { foreground: v("keyword") },
    },
    {
      scope: ["keyword.operator", "punctuation", "meta.brace", "punctuation.separator", "punctuation.terminator", "punctuation.bracket"],
      settings: { foreground: v("punct") },
    },
    {
      scope: ["entity.name.type", "storage.type", "entity.name.class", "storage.type.java", "storage.type.generic"],
      settings: { foreground: v("type") },
    },
    { scope: ["entity.name.function", "meta.method-call entity.name.function", "support.function"], settings: { foreground: v("function") } },
    {
      scope: ["constant.other.enum", "variable.other.constant", "constant.other", "variable.other.enummember"],
      settings: { foreground: v("constant") },
    },
  ],
};

const KIND_RE = /var\(--tok-([a-z]+)\)/;

function kindOf(color: string | undefined): TokenKind {
  const m = color ? KIND_RE.exec(color) : null;
  return (m?.[1] as TokenKind | undefined) ?? "default";
}

/** Highlight Java once per build (cached for the life of the deployment). */
export async function highlightJava(code: string): Promise<CodeLine[]> {
  "use cache";
  cacheLife("max");
  const { tokens } = await codeToTokens(code, { lang: "java", theme: apexMono });
  return tokens.map((line) => line.map((t) => ({ c: t.content, k: kindOf(t.color) })));
}

/** Highlight several excerpts at once, keyed by id. */
export async function highlightExcerpts<T extends { id: string; code: string }>(excerpts: readonly T[]) {
  const out: Record<string, CodeLine[]> = {};
  for (const e of excerpts) out[e.id] = await highlightJava(e.code);
  return out;
}
