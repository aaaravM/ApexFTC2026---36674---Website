// Site footer (DESIGN_SPEC §3): index + elsewhere links, the Season/Program strip with the
// official FIRST® Tech Challenge + BIOBUZZ™ logos, an engineering title block, the trademark line,
// the colophon, and a giant wordmark cropped by the bottom of the page. Server Component.

import { ApexWings } from "@/components/brand/apex-wings";
import { ProgramLogos } from "@/components/brand/first-logos";
import { Mark } from "@/components/brand/mark";
import { LineDraw, Scramble, TextReveal } from "@/components/motion";
import { LinkDraw, LinkExternal } from "@/components/ui/skiper-ui/skiper40";
import { site } from "@/content/site";
import { TitleBlock } from "./page-header";

// Module scope, Server Component only: cacheComponents forbids `new Date()` during render.
const BUILD_YEAR = new Date().getFullYear();

const elsewhere = [
  { label: "Robot code on GitHub", href: site.links.github },
  { label: "FTC Scout", href: site.links.ftcScout },
  { label: "FTC Events", href: site.links.ftcEvents },
  { label: "Sponsorship packet", href: site.links.sponsorPacket },
];

export function Footer() {
  return (
    <footer className="relative mt-[clamp(64px,10vw,140px)] overflow-hidden" aria-labelledby="footer-title">
      {/* Motion: the top rule draws in from the left, the strip rules from the right, the column
          labels decode and the giant wordmark rises letter by letter as the page ends. */}
      <LineDraw className="absolute inset-x-0 top-0 text-hairline" />
      <h2 id="footer-title" className="sr-only">
        Site footer
      </h2>

      <div className="container-page grid gap-x-[var(--gutter)] gap-y-12 pt-16 pb-14 sm:grid-cols-2 lg:grid-cols-12 lg:pt-20">
        {/* identity */}
        <div className="lg:col-span-4">
          <div className="flex items-center gap-3">
            <ApexWings size={44} className="text-wing" />
            <div>
              <p className="font-display text-[15px] leading-none tracking-[0.16em] text-fg uppercase [font-stretch:125%]">{site.name}</p>
              <p className="mt-1.5 font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">
                Team {site.teamNumber} · {site.locationShort}
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-[38ch] text-[15px] leading-6 text-fg-muted">
            A rookie <Mark id="ftc" /> team building APEX-R1, a turret shooter that aims while it drives, for{" "}
            <Mark id="biobuzz" presentedBy />.
          </p>
        </div>

        {/* index */}
        <nav aria-label="Footer" className="lg:col-span-3 lg:col-start-6">
          <Scramble as="p" text="[ Index ]" className="type-label text-fg-muted" />
          <ul className="mt-5 space-y-2.5">
            {site.nav.map((n) => (
              <li key={n.href} className="flex items-baseline gap-3">
                <span className="w-5 font-mono text-[10px] text-fg-muted tabular-nums">{n.index}</span>
                <LinkDraw href={n.href} className="text-[15px] text-fg">
                  {n.label}
                </LinkDraw>
              </li>
            ))}
          </ul>
        </nav>

        {/* elsewhere */}
        <div className="lg:col-span-3 lg:col-start-10">
          <Scramble as="p" text="[ Elsewhere ]" className="type-label text-fg-muted" />
          <ul className="mt-5 space-y-2.5">
            {elsewhere.map((l) => (
              <li key={l.href}>
                <LinkExternal href={l.href} className="text-[15px] text-fg">
                  {l.label}
                </LinkExternal>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
            {site.links.email ? (
              <a href={`mailto:${site.links.email}`} className="link-draw text-fg">
                {site.links.email}
              </a>
            ) : (
              <>Team inbox · coming soon</>
            )}
          </p>
        </div>
      </div>

      {/* Season / Program strip — official logos, static */}
      <div className="relative">
        <LineDraw origin="right" className="absolute inset-x-0 top-0 text-hairline" />
        <LineDraw origin="right" delay={0.15} className="absolute inset-x-0 bottom-0 text-hairline" />
        <div className="container-page py-10">
          <p className="type-label mb-6 text-fg-muted">[ Season / Program ]</p>
          <ProgramLogos />
        </div>
      </div>

      {/* title block + legal */}
      <div className="container-page pt-8 pb-10">
        <TitleBlock
          items={[
            { label: "DWG", value: "DWG-001" },
            { label: "REV", value: "A" },
            { label: "©", value: BUILD_YEAR },
            { label: "SHEET", value: "1 / 1" },
            { label: "DRAWN BY", value: site.name },
            { label: "SCALE", value: "1 : 1" },
          ]}
        />
        <p className="mt-6 max-w-[110ch] text-[12px] leading-5 text-fg-muted">
          <Mark id="first" symbol />, <Mark id="ftc" symbol />, <Mark id="ftc-short" symbol />, <Mark id="canopy" symbol /> and{" "}
          <Mark id="biobuzz" symbol /> are trademarks of For Inspiration and Recognition of Science and Technology (
          <Mark id="first" symbol={false} />
          ). {site.name} (Team {site.teamNumber}) is a student team; this is not an official <Mark id="first" symbol={false} /> website.
          Visit{" "}
          <a href={site.links.firstInspires} className="text-fg underline decoration-hairline-strong underline-offset-2 hover:decoration-current">
            firstinspires.org
          </a>
          .
        </p>
        <p className="mt-3 max-w-[110ch] text-[12px] leading-5 text-fg-muted">
          Colophon — set in Hubot Sans, Mona Sans and Martian Mono (SIL Open Font License). Interface components adapted from{" "}
          <a href="https://www.cult-ui.com" className="text-fg underline decoration-hairline-strong underline-offset-2 hover:decoration-current">
            Cult UI
          </a>{" "}
          (MIT),{" "}
          <a href="https://ui.watermelon.sh" className="text-fg underline decoration-hairline-strong underline-offset-2 hover:decoration-current">
            Watermelon UI
          </a>{" "}
          (MIT) and{" "}
          <a href="https://skiper-ui.com" className="text-fg underline decoration-hairline-strong underline-offset-2 hover:decoration-current">
            Skiper UI
          </a>
          . The shot solver on this site is a direct port of our robot&apos;s Java code.
        </p>
      </div>

      {/* giant wordmark, cropped by the page bottom */}
      <div aria-hidden="true" className="pointer-events-none select-none overflow-hidden">
        <TextReveal
          as="p"
          mode="chars"
          text="Apex Robotics"
          stagger={0.04}
          duration={1.1}
          inset={0}
          className="footer-wordmark -mb-[0.24em] block text-center font-display leading-[0.8] font-[250] tracking-[0.02em] whitespace-nowrap text-fg/90 uppercase [font-stretch:125%]"
        />
      </div>
    </footer>
  );
}
