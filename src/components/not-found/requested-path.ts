"use client";

// The address that missed, and the nearest page that IS in range — for the 404 page.
// The 404 HTML is prerendered once for every bad address, so the path is read on the client after
// hydration (server and first client render agree on `null`; no hydration mismatch).

import { usePathname } from "next/navigation";
import { site } from "@/content/site";
import { displayName, team } from "@/content/team";
import { useMounted } from "@/lib/hooks";

/** The requested pathname (decoded), or null on the server / before hydration. */
export function useRequestedPath(): string | null {
  const pathname = usePathname();
  const mounted = useMounted();
  if (!mounted || !pathname) return null;
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

export interface Target {
  href: string;
  label: string;
}

export const HOME_TARGET: Target = { href: "/", label: "Home" };

/** Classic edit distance (small strings only). */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

/**
 * The closest real page to a mistyped address: "/robots" → /robot, "/team/anish" → that member,
 * "/code/anything" → /code. Falls back to Home.
 */
export function nearestTarget(path: string | null): Target {
  if (!path) return HOME_TARGET;
  const segs = path.toLowerCase().split(/[/?#]/).filter(Boolean);
  if (!segs.length) return HOME_TARGET;
  const [first, second] = segs;

  // A team member: /team/<slug>, /team/<first name>, small typos.
  if ((first === "team" || distance(first, "team") <= 1) && second) {
    let best: { m: (typeof team)[number]; d: number } | null = null;
    for (const m of team) {
      const parts = m.slug.split("-");
      const d = m.slug.startsWith(second) && second.length >= 3 ? 0 : Math.min(distance(second, m.slug), ...parts.map((p) => distance(second, p) + 1));
      if (!best || d < best.d) best = { m, d };
    }
    if (best && best.d <= 2) return { href: `/team/${best.m.slug}`, label: displayName(best.m) };
    return { href: "/team", label: "Meet the Team" };
  }

  // A section: exact (/robot/whatever → /robot), prefix (/spons → /sponsors) or a small typo.
  let best: { href: string; label: string; d: number } | null = null;
  for (const n of site.nav) {
    const key = n.href.slice(1);
    const d = key === first ? 0 : first.length >= 3 && key.startsWith(first) ? 0.5 : distance(first, key);
    if (!best || d < best.d) best = { href: n.href, label: n.label, d };
  }
  if (best && best.d <= Math.max(1, Math.round(first.length / 3))) return { href: best.href, label: best.label };
  return HOME_TARGET;
}
