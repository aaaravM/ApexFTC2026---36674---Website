// ChapterContent — the text of one home story chapter (server-rendered in its FINAL state;
// home-story.tsx positions and fades it, and replays its entrance every time the panel appears —
// see chapter-reveal.ts for the data-hr / data-scramble / data-count contract). Copy comes
// verbatim from src/content/robot.ts `homeChapters`; figures carry their source line so every
// number on the page says where it came from.

import type { CSSProperties } from "react";
import { MarkText } from "@/components/brand/mark";
import { Magnetic, RollText } from "@/components/motion";
import { ButtonLink } from "@/components/site/button";
import type { StoryChapter } from "@/content/robot";
import { headlineFacts, season } from "@/content/season";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

/** Extra navigation for chapters that have no link in the content file (navigation only, no facts). */
const EXTRA_LINKS: Record<string, { href: string; label: string; external?: boolean }> = {
  drive: { href: "/robot#robot-drivetrain", label: "Drivetrain and odometry specs" },
  intake: { href: "/robot#robot-hopper", label: "How the sorter works" },
  season: { href: site.links.manual, label: "Read the game manual", external: true },
};

/** Where the chapter's figures come from (real files / manual sections only). */
const SOURCES: Record<string, string> = {
  machine: `Competition Manual ${season.asOf} · R102 · RobotConstants.java`,
  season: `Competition Manual ${season.asOf} · ${Array.from(new Set(headlineFacts.map((f) => f.cite.replace(/^Manual \S+ · /, "")))).join(" · ")}`,
};

const vars = (v: Record<string, string | number>) => v as CSSProperties;

/**
 * The chapter H2, split for the motion kit's mask rise (same markup as <TextReveal>), with the
 * standalone word APEX — the team's namesake, the top of the arc — set in the accent.
 */
function ChapterTitle({ id, text }: { id: string; text: string }) {
  const chars = text.length <= 40;
  const words = text.split(" ");
  let i = 0;
  return (
    <h2
      id={id}
      data-hr=""
      className="m-text type-h2 mt-[clamp(14px,2.4vh,24px)] text-fg"
      style={vars({ "--m-delay": "0.06s", "--m-stagger": chars ? "0.024s" : "0.045s", "--m-dur": "0.9s" })}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => {
          const accent = /^APEX(?!-)/.test(word) ? 4 : 0;
          return (
            <span key={w}>
              <span className="m-word">
                {chars ? (
                  Array.from(word).map((ch, c) => (
                    <span key={c} className="m-mask">
                      <span className={cn("m-unit", c < accent && "text-pollen-text")} style={vars({ "--i": i++ })}>
                        {ch}
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="m-mask">
                    <span className="m-unit" style={vars({ "--i": i++ })}>
                      {accent ? (
                        <>
                          <span className="text-pollen-text">{word.slice(0, accent)}</span>
                          {word.slice(accent)}
                        </>
                      ) : (
                        word
                      )}
                    </span>
                  </span>
                )}
              </span>
              {w < words.length - 1 ? " " : null}
            </span>
          );
        })}
      </span>
    </h2>
  );
}

/** A figure that counts up from zero on entry; a hidden copy holds its final width (no jitter). */
function Figure({ value, count }: { value: string; count: boolean }) {
  if (!count) return <>{value}</>;
  return (
    <span className="relative inline-block">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="invisible">
        {value}
      </span>
      <span aria-hidden="true" data-count="" data-final={value} className="absolute inset-0">
        {value}
      </span>
    </span>
  );
}

export function ChapterContent({ chapter, index, total }: { chapter: StoryChapter; index: number; total: number }) {
  const link = chapter.link ?? EXTRA_LINKS[chapter.id];
  const source = SOURCES[chapter.id];
  const pad = (n: number) => String(n).padStart(2, "0");
  const stats = chapter.stats ?? [];
  return (
    <>
      <div className="flex items-center gap-4">
        <p className="type-label shrink-0 whitespace-pre text-fg-muted">
          <span className="sr-only">{chapter.eyebrow}</span>
          <span aria-hidden="true" data-scramble="">
            {chapter.eyebrow}
          </span>
        </p>
        <span aria-hidden="true" data-hr="" className="m-line min-w-0 flex-1 text-hairline" style={vars({ "--m-delay": "0.05s" })} />
        <span aria-hidden="true" data-scramble="" className="type-label shrink-0 whitespace-pre text-fg-muted tabular-nums max-[359.98px]:hidden">
          {pad(index + 1)} / {pad(total)}
        </span>
      </div>
      <ChapterTitle id={`home-${chapter.id}-title`} text={chapter.title} />
      <p data-hr="fade" className="type-lede mt-[clamp(12px,2vh,20px)]" style={vars({ "--hd": "0.22s" })}>
        <MarkText>{chapter.body}</MarkText>
      </p>
      {stats.length > 0 && (
        <div className="relative mt-[clamp(16px,3vh,32px)] pt-[clamp(12px,1.8vh,18px)]">
          <span aria-hidden="true" data-hr="" className="m-line absolute inset-x-0 top-0 text-hairline" style={vars({ "--m-delay": "0.26s" })} />
          <dl
            data-home-stats=""
            className={cn(
              "grid justify-start gap-x-[clamp(20px,2.8vw,40px)] gap-y-4",
              stats.length > 3 ? "grid-cols-[repeat(2,auto)] min-[440px]:grid-cols-[repeat(4,auto)]" : "grid-cols-[repeat(3,auto)]",
            )}
          >
            {stats.map((s) => (
              <div key={s.label} className="flex min-w-0 flex-col-reverse justify-end">
                <dt data-hr="fade" className="type-label mt-2 text-fg-muted" style={vars({ "--hd": "0.4s" })}>
                  {s.label}
                </dt>
                <dd className="font-mono text-[clamp(18px,1.9vw,26px)] leading-none font-light tracking-[-0.02em] whitespace-nowrap text-fg tabular-nums">
                  {/* years and names are not quantities — they stay still */}
                  <Figure value={s.value} count={/\d/.test(s.value) && !/year/i.test(s.label)} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {source && (
        <p data-hr="fade" className="mt-3 font-mono text-[10px] leading-4 tracking-[0.06em] text-fg-muted/80 uppercase" style={vars({ "--hd": "0.5s" })}>
          Source · {source}
        </p>
      )}
      {link && (
        <div data-hr="fade" className="mt-[clamp(14px,2.6vh,28px)]" style={vars({ "--hd": "0.55s" })}>
          <Magnetic>
            <ButtonLink href={link.href} external={(link as { external?: boolean }).external} variant="secondary">
              <RollText>{link.label}</RollText>
            </ButtonLink>
          </Magnetic>
        </div>
      )}
    </>
  );
}
