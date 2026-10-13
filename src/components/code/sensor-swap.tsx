// "Swap what each sensor is responsible for" (docs/03-ARCHITECTURE.md). The usual FTC pattern vs
// what BIOBUZZ™ needs, as a comparison table with the swapped rows marked. Server component; the
// "swap" motion (rows land, ⇄ turns, the new sensor slides over from the usual column) is CSS on
// the Armed trigger.

import { MarkText } from "@/components/brand/mark";
import type { CSSProperties } from "react";
import { Armed } from "@/components/code/armed";
import { sensorSwap } from "@/content/code";
import { cn } from "@/lib/utils";

const at = (i: number) => ({ "--i": i }) as CSSProperties;

export function SensorSwap({ className }: { className?: string }) {
  const [, usualHead, needHead] = sensorSwap.columns;
  return (
    <div className={cn("min-w-0", className)}>
      {/* Desktop/tablet: a real table */}
      <Armed effect="swap" as="table" inset={0.2} className="hidden w-full border-collapse text-left md:table">
        <caption className="sr-only">Which sensor answers which question: the usual FTC pattern compared with what BIOBUZZ needs</caption>
        <thead>
          <tr className="border-b border-border-ui">
            <th scope="col" className="w-[30%] pb-3 font-mono text-[10px] font-normal tracking-[0.1em] text-fg-muted uppercase">
              Question
            </th>
            <th scope="col" className="w-[30%] pb-3 font-mono text-[10px] font-normal tracking-[0.1em] text-fg-muted uppercase">
              {usualHead}
            </th>
            <th scope="col" className="w-[10%] pb-3">
              <span className="sr-only">Change</span>
            </th>
            <th scope="col" className="pb-3 font-mono text-[10px] font-normal tracking-[0.1em] text-fg uppercase">
              <MarkText>{needHead}</MarkText>
            </th>
          </tr>
        </thead>
        <tbody>
          {sensorSwap.rows.map(([q, usual, need], i) => {
            const swapped = usual !== need;
            return (
              <tr key={q} style={at(i)} className="code-row border-b border-hairline align-baseline">
                <th scope="row" className="py-5 pr-6 text-[16px] font-[560]">
                  {q}
                </th>
                <td className={cn("py-5 pr-6 text-[16px]", swapped ? "text-fg-muted" : "text-fg")}>{usual}</td>
                <td className="py-5 pr-6 font-mono text-[11px] tracking-[0.08em] whitespace-nowrap text-fg-muted uppercase">
                  {swapped ? (
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden="true" className="code-swap-icon text-[15px] text-fg">
                        ⇄
                      </span>
                      Swapped
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden="true" className="text-[15px]">
                        =
                      </span>
                      Same
                    </span>
                  )}
                </td>
                <td className="relative py-5 text-[16px] font-[560] text-fg">
                  {swapped && <span aria-hidden="true" className="code-swap-bar absolute inset-y-5 -left-3 w-px bg-pollen-line" />}
                  <span className={swapped ? "code-swap-in" : undefined}>{need}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Armed>

      {/* Phones: one card per question */}
      <Armed effect="swap" as="dl" className="border-t border-border-ui md:hidden">
        {sensorSwap.rows.map(([q, usual, need], i) => {
          const swapped = usual !== need;
          return (
            <div key={q} style={at(i)} className="code-row border-b border-hairline py-5">
                <dt className="text-[16px] font-[560]">{q}</dt>
                <dd className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                  <span className="font-mono text-[10px] leading-6 tracking-[0.1em] text-fg-muted uppercase">Usual</span>
                  <span className={swapped ? "text-fg-muted" : "text-fg"}>{usual}</span>
                  <span className="font-mono text-[10px] leading-6 tracking-[0.1em] text-fg uppercase">
                    <MarkText>{needHead.replace("What ", "").replace(" needs", "")}</MarkText>
                  </span>
                  <span className="font-[560] text-fg">
                    <span className={swapped ? "code-swap-in" : undefined}>{need}</span>
                    <span className="ml-2 font-mono text-[10px] font-normal tracking-[0.08em] text-fg-muted uppercase">{swapped ? "⇄ swapped" : "= same"}</span>
                  </span>
                </dd>
            </div>
          );
        })}
      </Armed>
    </div>
  );
}
