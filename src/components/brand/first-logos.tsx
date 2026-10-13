// Official FIRST® Tech Challenge + BIOBUZZ™ logos (DESIGN_SPEC §7) — static, unmodified PNGs
// from public/first/. Reverse (white) files on dark, standard files on light — swapped by theme
// class, never by CSS filters. Minimum sizes enforced: FTC horizontal 60px tall, BIOBUZZ
// wordmark 336px wide. Always rendered next to "Apex Robotics · Team 36674".
//
//   <ProgramLogos />                  the calm Season / Program strip (footer)
// Server-safe.

import Image from "next/image";
import { Mark } from "@/components/brand/mark";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import ftcDark from "../../../public/first/FIRSTTech_iconHorz_RGB_reverse.png";
import ftcLight from "../../../public/first/FIRSTTech_iconHorz_RGB.png";
import bbDark from "../../../public/first/first_canopy_ftc_biobuzz_wordmark_rgb_white.png";
import bbLight from "../../../public/first/first_canopy_ftc_biobuzz_wordmark_rgb_black.png";

const FTC_H = 60; // min 60px tall
const BB_W = 336; // min 336px wide

function ThemedLogo({
  dark,
  light,
  alt,
  width,
  height,
}: {
  dark: typeof ftcDark;
  light: typeof ftcLight;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <>
      <Image src={dark} alt={alt} width={width} height={height} className="hidden shrink-0 dark:block" sizes={`${width}px`} style={{ maxWidth: "100%", height: "auto" }} />
      <Image src={light} alt={alt} width={width} height={height} className="block shrink-0 dark:hidden" sizes={`${width}px`} style={{ maxWidth: "100%", height: "auto" }} />
    </>
  );
}

export function ProgramLogos({ className }: { className?: string }) {
  const ftcW = Math.round((ftcDark.width / ftcDark.height) * FTC_H);
  const bbH = Math.round((bbDark.height / bbDark.width) * BB_W);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-14 gap-y-8", className)}>
      <ThemedLogo dark={ftcDark} light={ftcLight} alt="FIRST Tech Challenge" width={ftcW} height={FTC_H} />
      <ThemedLogo dark={bbDark} light={bbLight} alt="BIOBUZZ presented by RTX" width={BB_W} height={bbH} />
      <p className="max-w-[30ch] text-[14px] leading-6 text-fg-muted">
        <span className="text-fg">
          {site.name} · Team {site.teamNumber}
        </span>
        <br />
        <Mark id="ftc" symbol={false} /> · <Mark id="biobuzz" symbol={false} presentedBy /> · {site.season.years}
      </p>
    </div>
  );
}
