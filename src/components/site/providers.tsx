"use client";

// Root client providers (mounted once in src/app/layout.tsx, never hidden by Activity):
//   • next-themes  — class strategy, dark default, no system theme (spec §1)
//   • MotionConfig — reducedMotion="user": motion skips transform/layout animation for users who ask
//   • SmoothScroll — one Lenis instance (desktop + motion allowed only)
//   • WingsSessionFlag — marks the wings draw-on as done for the rest of the session

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { Suspense, type ReactNode } from "react";
import { ScrollRestorer } from "./scroll-restorer";
import { SmoothScroll } from "./smooth-scroll";
import { WingsSessionFlag } from "./wings-session-flag";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <SmoothScroll />
        <Suspense fallback={null}>
          <ScrollRestorer />
        </Suspense>
        <WingsSessionFlag />
        {children}
      </MotionConfig>
    </ThemeProvider>
  );
}
