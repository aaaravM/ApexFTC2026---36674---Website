// Odometer — a real figure on mechanical number wheels (home sponsor band). Server-rendered at its
// final reading; when an ancestor <Arm className="home-tiers"> plays, every wheel rolls up from 0
// and the low digits turn fastest (ones: two extra turns, tens: one), settling right → left like
// a counter. Screen readers get the plain figure. Styles: home.css (.home-odo-*).
//
//   <Odometer value={500} prefix="$" />

import type { CSSProperties } from "react";
import { nf } from "@/lib/format";
import { cn } from "@/lib/utils";

const DIGITS = Array.from("0123456789");

export function Odometer({ value, prefix = "", className }: { value: number; prefix?: string; className?: string }) {
  const text = nf({ maximumFractionDigits: 0 }).format(value);
  const chars = Array.from(text);
  const total = chars.filter((c) => /\d/.test(c)).length;
  let seen = 0;
  return (
    <span className={cn("home-odo", className)}>
      <span className="sr-only">
        {prefix}
        {text}
      </span>
      <span aria-hidden="true" className="home-odo-row">
        {prefix && <span>{prefix}</span>}
        {chars.map((ch, i) => {
          if (!/\d/.test(ch)) return <span key={i}>{ch}</span>;
          const place = total - 1 - seen++; // 0 = ones
          const turns = Math.max(0, 2 - place);
          const reel = Array.from({ length: turns + 1 }, () => DIGITS).flat();
          return (
            <span key={i} className="home-odo-wheel">
              <span className="home-odo-reel" style={{ "--stop": turns * 10 + Number(ch), "--turns": turns } as CSSProperties}>
                {reel.map((d, k) => (
                  <span key={k}>{d}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
