// LINKS — "Resources we use." (DESIGN_SPEC §5). The 20 verified links from src/content/links.ts as
// a drawing-sheet reference list with a live filter (components/links/links-directory.tsx) and a
// numbered notes block. Edit the links in src/content/links.ts; this page follows automatically.

import type { Metadata } from "next";
import { LinksDirectory } from "@/components/links/links-directory";
import { LinksHeader } from "@/components/links/links-header";
import { LinksNotes } from "@/components/links/links-notes";
import { ScrollProgress } from "@/components/motion";
import { PageTransition } from "@/components/site/page-transition";

export const metadata: Metadata = {
  title: "Links",
  description:
    "The manuals, docs and tools behind APEX-R1 — official FIRST resources first, every link checked. Apex Robotics, FTC Team 36674.",
};

export default function LinksPage() {
  return (
    <PageTransition>
      <ScrollProgress />
      <LinksHeader />
      <LinksDirectory notes={<LinksNotes />} />
    </PageTransition>
  );
}
