// ─────────────────────────────────────────────────────────────────────────────
// Wordmark — "APEX ROBOTICS" in the wordmark style (Hubot Sans, wdth 125, wght 300,
// +0.04em tracking, lh 0.86; size measured to fit: 13.2vw two-line / 8.6vw one-line). Real text: selectable, indexable,
// and splittable into letters for animation.
//
//   <Wordmark as="h1" />                  auto: two lines below `md`, one line from `md` up
//   <Wordmark lines="one" />              force one line ("two" forces two)
//   <Wordmark letters />                  every letter in <span data-letter data-word data-index>
//                                         (for the home "name disappears into the robot" scrub);
//                                         an sr-only copy keeps the accessible text clean.
// Size it with className (e.g. `text-[12vw]`) — `type-wordmark` sets the defaults. Server-safe.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

export interface WordmarkProps {
  as?: "h1" | "h2" | "p" | "div" | "span";
  lines?: "auto" | "one" | "two";
  letters?: boolean;
  className?: string;
  id?: string;
}

export function Wordmark({ as: Tag = "p", lines = "auto", letters = false, className, id }: WordmarkProps) {
  let n = 0;
  const render = (word: string, wi: number) =>
    letters
      ? word.split("").map((ch) => {
          const i = n++;
          return (
            <span key={i} data-letter="" data-word={wi} data-index={i} className="inline-block">
              {ch}
            </span>
          );
        })
      : word;

  const second = lines === "one" ? "inline-block" : lines === "two" ? "block" : "block md:inline-block";
  const size = lines === "one" ? "wordmark-one-line" : lines === "auto" ? "md:wordmark-one-line" : undefined;

  return (
    <Tag id={id} className={cn("type-wordmark", size, className)}>
      {letters && <span className="sr-only">Apex Robotics</span>}
      <span className="inline-block whitespace-nowrap" aria-hidden={letters || undefined}>
        {render("APEX", 0)}
      </span>{" "}
      <span className={cn("whitespace-nowrap", second)} aria-hidden={letters || undefined}>
        {render("ROBOTICS", 1)}
      </span>
    </Tag>
  );
}
