// robots.txt (DESIGN_SPEC §10 ERRATA #8) — static. /lab/motion is a dev-only demo (404 in production).

import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/lab/motion"] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
