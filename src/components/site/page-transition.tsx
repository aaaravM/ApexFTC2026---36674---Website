// PageTransition — wrap EVERY page's content (in page.tsx, not the layout: layouts persist, so
// enter/exit never fire there). Navigations tagged "nav-forward"/"nav-back" (TransitionLink,
// the header nav, the command palette) slide + fade per DESIGN_SPEC §2; anything else (browser
// back/forward, refresh) does not animate directionally. Reduced motion → short crossfade.
//
//   export default function Page() {
//     return <PageTransition>…</PageTransition>;
//   }
// Server-safe.

import { ViewTransition, type ReactNode } from "react";

const directional = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" } as const;

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={directional} exit={directional} default="none">
      {children}
    </ViewTransition>
  );
}
