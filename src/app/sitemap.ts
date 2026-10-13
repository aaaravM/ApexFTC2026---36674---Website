// sitemap.xml (DESIGN_SPEC §10 ERRATA #8) — static: built from content, no request-time data.
// /lab/robot (Robot Lab) is public and listed (USER-REQUIREMENTS #8); /lab/motion is dev-only and is not.

import type { MetadataRoute } from "next";
import { CONTENT_UPDATED, site } from "@/content/site";
import { team } from "@/content/team";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  const lastModified = CONTENT_UPDATED;
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    ...site.nav.map((n) => ({
      url: `${base}${n.href}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${base}/lab/robot`, lastModified, changeFrequency: "monthly", priority: 0.4 },
  ];
  const members: MetadataRoute.Sitemap = team.map((m) => ({
    url: `${base}/team/${m.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.5,
  }));
  return [...pages, ...members];
}
