// 404 — "No solution — target out of range." Watermelon UI error-3, adapted into the solver's voice
// (src/components/not-found/*): the solver's real failReason for a CELL 404 ft away, RETURN TO FIELD
// and OPEN ⌘K, and FIG. 404 — the hardest shot APEX-R1 can make falling short of the target.
// Renders for every unmatched URL and for notFound() (e.g. an unknown /team/<name>).

import type { Metadata } from "next";
import { NotFoundView } from "@/components/not-found/not-found-view";
import { PageTransition } from "@/components/site/page-transition";

export const metadata: Metadata = {
  title: "Page not found",
  description: "No solution — target out of range. This address isn't a page on the Apex Robotics site.",
};

export default function NotFound() {
  return (
    <PageTransition>
      <NotFoundView />
    </PageTransition>
  );
}
