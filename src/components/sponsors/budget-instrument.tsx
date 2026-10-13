"use client";

// BudgetInstrument — "Where it goes" on /sponsors (DESIGN_SPEC §5: the packet's rookie startup
// budget, $3,800–$5,500, as a hairline bar breakdown; only the two known amounts are sized, the
// rest read VARIES).
//
// Every line item sits on ONE shared axis, $0 → $5,500 (the top of the packet's range), so the
// bars compare honestly: ≈ $550 startup hardware, ≈ $650+ practice field (the "+" is a hatched
// tail, not an amount), robot components and competition fees unsized (dashed, VARIES), and the
// typical total as a solid run to $3,800 with the $3,800–$5,500 range hatched.
//
// "Size a contribution": a native range input on the same axis. Its needle shows on every track
// (the pollen ticks), and the read-outs give the tier it reaches (packet thresholds) and its share
// of a typical rookie startup budget — plain arithmetic on the packet's numbers. The thumb and the
// ticks share one inset (THUMB/2) so they line up exactly.
//
// Motion: bars measure out once when they come into view (explains magnitude); the needle follows
// input. The rows step in, the known amounts count up while their bars measure out, and the total
// runs to $3,800 before the hatched range opens out to $5,500 (its figures count as it goes). Reduced motion: bars are static (MotionConfig), NumberFlow jumps, no tick transition.

import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { CountUp } from "@/components/motion";
import { Stagger, StaggerItem } from "@/components/outreach/motion-safe";
import { TransitionLink } from "@/components/site/transition-link";
import { budget, tiers, type Tier } from "@/content/sponsors";
import { fmtFixed, fmtUsd } from "@/lib/format";
import { dur, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { onApexR1 } from "./packet";

const [LOW, HIGH] = budget.rangeUsd;
const SCALE = HIGH;
const STEP = 25;
/** Native range thumb width (px). Tracks are inset by half of it so ticks sit under the thumb's centre. */
const THUMB = 18;

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const frac = (usd: number) => r3(Math.min(1, Math.max(0, usd / SCALE)));
/** CSS `left` for a dollar value on the shared axis. */
const at = (usd: number) => `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${frac(usd)})`;
/** CSS `width` for a dollar span on the shared axis. */
const span = (usd: number) => `calc((100% - ${THUMB}px) * ${frac(usd)})`;

type CashTier = Tier & { minUsd: number };
const CASH: CashTier[] = tiers.filter((t): t is CashTier => t.minUsd !== null).sort((a, b) => b.minUsd - a.minUsd);
const tierFor = (usd: number) => CASH.find((t) => usd >= t.minUsd);

const AXIS_TICKS = Array.from({ length: Math.floor(SCALE / 500) + 1 }, (_, i) => i * 500);
const AXIS_LABELS = [0, 1000, 2000, 3000, 4000, 5000];

const pctFormat = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;
const usdFormat = { style: "currency", currency: "USD", maximumFractionDigits: 0 } as const;

export function BudgetInstrument({ className, defaultAmount = 500 }: { className?: string; defaultAmount?: number }) {
  const id = useId();
  const [amount, setAmount] = useState(defaultAmount);
  const tier = tierFor(amount);
  // Share of a typical budget: against the top of the range (low share) and the bottom (high share),
  // capped at the whole budget.
  const shareLo = Math.min(100, (amount / HIGH) * 100);
  const shareHi = Math.min(100, (amount / LOW) * 100);
  const sameShare = fmtFixed(shareLo, 1) === fmtFixed(shareHi, 1);
  const valueText = `${fmtUsd(amount)}: ${tier ? `${tier.name} tier` : "below the Bronze tier"}, ${
    sameShare ? fmtFixed(shareHi, 1) : `${fmtFixed(shareLo, 1)} to ${fmtFixed(shareHi, 1)}`
  } percent of a typical rookie startup budget`;

  return (
    <div className={cn("border border-hairline", className)}>
      <Stagger as="ol" amount={0.15} aria-label="Typical rookie startup budget, by line">
        {budget.items.map((item, i) => {
          const apex = onApexR1[item.label];
          return (
            <StaggerItem as="li" key={item.label} className={cn("px-4 pt-5 pb-4 sm:px-6", i > 0 && "border-t border-hairline")}>
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] text-fg-muted tabular-nums" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[16px] leading-6 font-medium text-fg">{item.label}</span>
                  </p>
                  <p className="mt-1 pl-[27px] text-[14px] leading-5 text-fg-muted">{item.detail}</p>
                  {apex && (
                    <p className="mt-2 pl-[27px] font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">
                      On APEX-R1 ·{" "}
                      <TransitionLink href={apex.href} className="link-draw tracking-[0.02em] text-fg normal-case">
                        {apex.parts}
                      </TransitionLink>
                    </p>
                  )}
                </div>
                <p className="shrink-0 pt-0.5 font-mono text-[14px] leading-5 tabular-nums">
                  {item.approxUsd ? (
                    <span className="text-fg">
                      <CountUp value={item.approxUsd} prefix="≈ $" suffix={item.plus ? "+" : ""} />
                    </span>
                  ) : (
                    <span className="text-[11px] tracking-[0.08em] text-fg-muted uppercase">Varies</span>
                  )}
                </p>
              </div>
              <Track className="mt-4" value={item.approxUsd} plus={item.plus} cursor={amount} delay={0.25 + i * 0.06} />
            </StaggerItem>
          );
        })}
      </Stagger>

      {/* Σ the typical total */}
      <div className="border-t border-hairline px-4 pt-5 pb-3 sm:px-6">
        <div className="flex items-start justify-between gap-5">
          <p className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] text-fg-muted" aria-hidden="true">
              Σ
            </span>
            <span className="text-[16px] leading-6 font-medium text-fg">{budget.label}</span>
          </p>
          <p className="shrink-0 pt-0.5 font-mono text-[14px] leading-5 text-fg tabular-nums">
            <CountUp value={LOW} prefix="$" />
            <span className="text-fg-muted">–</span>
            <CountUp value={HIGH} prefix="$" duration={1.9} />
          </p>
        </div>
        <div className="relative mt-4 h-3" aria-hidden="true">
          <span className="absolute top-1/2 h-px -translate-y-1/2 bg-hairline" style={{ left: at(0), width: span(SCALE) }} />
          <motion.span
            className="absolute top-1/2 h-[6px] origin-left -translate-y-1/2 bg-border-ui"
            style={{ left: at(0), width: span(LOW) }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 1 }}
            transition={{ duration: dur.large, ease: ease.out, delay: 0.3 }}
          />
          {/* the range: once the typical run lands at $3,800, the span opens out to $5,500 */}
          <motion.span
            className="hatch absolute top-1/2 h-[6px] origin-left -translate-y-1/2 text-fg-muted"
            style={{ left: at(LOW), width: span(HIGH - LOW) }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 1 }}
            transition={{ duration: dur.large * 0.8, ease: ease.inOut, delay: 0.3 + dur.large * 0.85 }}
          />
          <span className="absolute top-0 bottom-0 w-px bg-fg-muted" style={{ left: at(LOW) }} />
          <span className="absolute top-0 bottom-0 w-px bg-fg-muted" style={{ left: at(HIGH) }} />
          <Needle usd={amount} />
        </div>

        {/* shared axis */}
        <div className="relative mt-3 h-8" aria-hidden="true">
          {AXIS_TICKS.map((v) => (
            <span
              key={v}
              className={cn("absolute top-0 w-px bg-hairline-strong", v % 1000 === 0 ? "h-2" : "h-1")}
              style={{ left: at(v) }}
            />
          ))}
          {AXIS_LABELS.map((v) => (
            <span
              key={v}
              className={cn(
                "absolute top-3 -translate-x-1/2 font-mono text-[10px] leading-4 text-fg-muted tabular-nums",
                v % 2000 !== 0 && "max-sm:hidden",
              )}
              style={{ left: at(v) }}
            >
              {v === 0 ? "$0" : `$${v / 1000}k`}
            </span>
          ))}
        </div>
      </div>

      {/* size a contribution */}
      <div className="border-t border-hairline bg-surface-1 px-4 pt-5 pb-6 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <label htmlFor={id} className="type-label text-fg">
            Size a contribution
          </label>
          <p className="font-mono text-[10px] leading-4 tracking-[0.06em] text-fg-muted uppercase max-sm:hidden" aria-hidden="true">
            Drag · ← → ${STEP} · PgUp PgDn $500
          </p>
        </div>

        <input
          id={id}
          type="range"
          min={0}
          max={SCALE}
          step={STEP}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "PageUp" || e.key === "PageDown") {
              e.preventDefault();
              setAmount((a) => Math.min(SCALE, Math.max(0, a + (e.key === "PageUp" ? 500 : -500))));
            }
          }}
          aria-valuetext={valueText}
          className={rangeClasses}
        />

        <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap" role="group" aria-label="Jump to a tier threshold">
          {[...CASH].reverse().map((t) => {
            const on = amount === t.minUsd;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                aria-label={`${t.name}, ${fmtUsd(t.minUsd)}`}
                onClick={() => setAmount(t.minUsd)}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border px-3 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors duration-[120ms] max-sm:flex-col max-sm:gap-0.5 max-sm:py-1.5 sm:h-9 sm:min-h-0",
                  on ? "border-border-ui bg-surface-2 text-fg" : "border-hairline text-fg-muted hover:border-border-ui hover:text-fg",
                )}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className={cn("size-1.5 rounded-full", on ? "bg-pollen-line" : "bg-border-ui")} />
                  {t.name}
                </span>
                <span aria-hidden="true" className="max-sm:hidden">
                  ·
                </span>
                <span className="tabular-nums">{fmtUsd(t.minUsd)}</span>
              </button>
            );
          })}
        </div>

        <dl className="mt-6 grid grid-cols-[1fr_1fr] border-t border-l border-hairline sm:grid-cols-[0.9fr_0.8fr_1.3fr]">
          <Readout label="Amount">
            <NumberFlow value={amount} format={usdFormat} locales="en-US" />
          </Readout>
          <Readout label="Tier">
            <span className={cn(tier ? "text-fg" : "text-fg-muted")}>{tier ? tier.name : "Below Bronze"}</span>
          </Readout>
          <Readout label="Of a rookie budget" className="col-span-2 sm:col-span-1">
            {!sameShare && (
              <>
                <NumberFlow value={shareLo} format={pctFormat} locales="en-US" />
                <span className="text-fg-muted">–</span>
              </>
            )}
            <NumberFlow value={shareHi} format={pctFormat} locales="en-US" suffix="%" />
          </Readout>
        </dl>
      </div>
    </div>
  );
}

/* ─── parts ─────────────────────────────────────────────────────────────────── */

function Readout({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-w-0 border-r border-b border-hairline px-3 py-2.5", className)}>
      <dt className="font-mono text-[10px] leading-4 tracking-[0.08em] text-fg-muted uppercase">{label}</dt>
      <dd className="mt-0.5 font-mono text-[clamp(18px,1.6vw,22px)] leading-8 font-light text-fg tabular-nums">{children}</dd>
    </div>
  );
}

/** The contribution needle on a track: a pollen tick at the slider's value. */
function Needle({ usd }: { usd: number }) {
  return (
    <span
      className="absolute -top-1 -bottom-1 w-px bg-pollen-line transition-[left] duration-[120ms] ease-out motion-reduce:transition-none"
      style={{ left: at(usd) }}
    />
  );
}

function Track({
  value,
  plus,
  cursor,
  delay,
  className,
}: {
  value: number | null;
  plus: boolean;
  cursor: number;
  delay: number;
  className?: string;
}) {
  const measured = value !== null;
  return (
    <div className={cn("relative h-3", className)} aria-hidden="true">
      {measured ? (
        <span className="absolute top-1/2 h-px -translate-y-1/2 bg-hairline" style={{ left: at(0), width: span(SCALE) }} />
      ) : (
        <span
          className="absolute top-1/2 h-0 -translate-y-1/2 border-t border-dashed border-hairline-strong"
          style={{ left: at(0), width: span(SCALE) }}
        />
      )}
      {measured && (
        <motion.span
          className="absolute top-1/2 h-[6px] origin-left -translate-y-1/2 bg-fg"
          style={{ left: at(0), width: span(value) }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 1 }}
          transition={{ duration: dur.large, ease: ease.out, delay }}
        />
      )}
      {measured && plus && (
        <span className="hatch absolute top-1/2 h-[6px] w-7 -translate-y-1/2 text-fg-muted" style={{ left: at(value) }} />
      )}
      <Needle usd={cursor} />
    </div>
  );
}

/* Native range, restyled: a 1px track and an 18px-wide slider "carriage" with a pollen needle. */
const rangeClasses = cn(
  "mt-3 block h-8 w-full cursor-pointer appearance-none bg-transparent",
  "[&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-border-ui",
  "[&::-moz-range-track]:h-px [&::-moz-range-track]:bg-border-ui",
  "[&::-webkit-slider-thumb]:-mt-[13px] [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:h-[27px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[2px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border-ui [&::-webkit-slider-thumb]:bg-surface-2 [&::-webkit-slider-thumb]:bg-[linear-gradient(var(--pollen-line),var(--pollen-line))] [&::-webkit-slider-thumb]:bg-[length:1px_100%] [&::-webkit-slider-thumb]:bg-center [&::-webkit-slider-thumb]:bg-no-repeat",
  "[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-[27px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:rounded-[2px] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border-ui [&::-moz-range-thumb]:bg-surface-2 [&::-moz-range-thumb]:bg-[linear-gradient(var(--pollen-line),var(--pollen-line))] [&::-moz-range-thumb]:bg-[length:1px_100%] [&::-moz-range-thumb]:bg-center [&::-moz-range-thumb]:bg-no-repeat",
  "hover:[&::-webkit-slider-thumb]:bg-surface-1 hover:[&::-moz-range-thumb]:bg-surface-1",
);
