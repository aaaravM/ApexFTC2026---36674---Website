// FundsMarquee — a real-data ticker: what Founding Partner money buys (DESIGN_SPEC §5: watermelon
// marquee "only for a real-data ticker … never a fake logo wall").
// Every item is either a line of the packet's startup budget ("control hubs", "a competition field
// and tiles", "regional registration", "the Starter Kit of parts") or the real part that line
// means on APEX-R1 (src/content/robot.ts: REV Control Hub + Expansion Hub, goBILDA 5202 motors,
// 104 mm mecanum wheels, REV Color Sensor V3, goBILDA Pinpoint).
// The Marquee pauses on hover/focus and under reduced motion; copies 2…n are aria-hidden.
// Server-safe.

import { Marquee } from "@/components/ui/marquee";

const FUNDS = [
  "REV Control Hub",
  "Expansion Hub",
  "goBILDA 5202 motors",
  "104 mm mecanum wheels",
  "REV Color Sensor V3",
  "goBILDA Pinpoint odometry",
  "Competition field + tiles",
  "Regional registration",
  "Starter kit of parts",
];

export function FundsMarquee() {
  return (
    <div className="border-y border-hairline">
      <div className="container-page flex flex-col gap-3 py-5 md:flex-row md:items-center md:gap-8">
        <p id="sponsors-funds-label" className="type-label shrink-0 text-fg-muted">
          <span aria-hidden="true">[ </span>What it funds<span aria-hidden="true"> ]</span>
        </p>
        <Marquee
          pauseOnHover
          gap={36}
          speed="normal"
          aria-labelledby="sponsors-funds-label"
          role="group"
          className="min-w-0 flex-1 [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]"
        >
          {FUNDS.map((item) => (
            <span
              key={item}
              className="flex items-center gap-9 font-mono text-[12px] leading-5 tracking-[0.03em] whitespace-nowrap text-fg"
            >
              {item}
              <span aria-hidden="true" className="text-fg-muted">
                /
              </span>
            </span>
          ))}
        </Marquee>
      </div>
    </div>
  );
}
