import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { CommandPalette } from "@/components/site/command-palette";
import { Footer } from "@/components/site/footer";
import { Header, HeaderFallback } from "@/components/site/header";
import { Providers } from "@/components/site/providers";
import { site } from "@/content/site";
import { fontVariables } from "./fonts";
import "./globals.css";

// Every route must stay fully static (prerendered at build time). Request-time work fails the
// build instead of silently making a page dynamic. See DESIGN_SPEC §9.
export const ensureStatic = "navigation";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — FIRST Tech Challenge Team ${site.teamNumber}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: ["Apex Robotics", "FTC 36674", "FIRST Tech Challenge", "BIOBUZZ", "Tracy California", "robotics team"],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — FTC Team ${site.teamNumber}`,
    description: site.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — FTC Team ${site.teamNumber}`,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0d" },
    { media: "(prefers-color-scheme: light)", color: "#f4f4f1" },
  ],
  colorScheme: "dark light",
};

// Runs before first paint: skip the wings draw-on if it already played this session.
const WINGS_FLAG = `try{if(sessionStorage.getItem("apex:wings"))document.documentElement.dataset.wings="drawn"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${fontVariables}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: WINGS_FLAG }} />
      </head>
      <body>
        <Providers>
          <Suspense fallback={<HeaderFallback />}>
            <Header />
          </Suspense>
          <main id="main" tabIndex={-1} className="relative z-10 outline-none">
            {children}
          </main>
          <Footer />
          <Suspense fallback={null}>
            <CommandPalette />
          </Suspense>
        </Providers>
        <div aria-hidden="true" className="grain" />
      </body>
    </html>
  );
}
