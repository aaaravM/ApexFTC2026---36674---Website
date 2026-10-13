// Tier cards for /sponsors (DESIGN_SPEC §5 SPONSORS: real packet tiers, real benefits, OPEN SLOT
// states, never a fake sponsor name).
//
//   <TierCard tier={gold} partners={[]} />     Gold / Silver / Bronze: figure, nameplate, benefits
//   <InKindBand tier={inKind} partners={[]} /> the in-kind row (no logo benefit in the packet → no plate)
//
// When a partner signs, add them to `sponsors` in src/content/sponsors.ts (with permission to show
// the logo) and they appear on their tier's plate and in its partner list.
// Motion (the page's signature, varied on purpose): the cards are `data-enter` plates that rise and
// tip up into place in sequence (<Entrance preset="tilt"> on /sponsors), the amount counts up from
// $0, each benefit line ticks in with its check glyph's stroke drawing, and the open logo blank's
// dashed outline marches slowly (nameplate.tsx). Server-safe.

import { CountUp } from "@/components/motion";
import { CheckGlyph, Entrance } from "@/components/outreach/entrance";
import { Chip } from "@/components/site/chip";
import type { Sponsor, Tier } from "@/content/sponsors";
import { cn } from "@/lib/utils";
import { Nameplate } from "./nameplate";
import { plateSize } from "./packet";

/** "$500+" → ["$500", "+"] */
function splitAmount(amount: string): [string, string] {
  return amount.endsWith("+") ? [amount.slice(0, -1), "+"] : [amount, ""];
}

function StatusChip({ count }: { count: number }) {
  return (
    <Chip dot={count ? "on" : "pollen"} tone={count ? "strong" : "default"}>
      {count ? `${count} partner${count === 1 ? "" : "s"} · open` : "Open slot"}
    </Chip>
  );
}

function TierName({ id, name }: { id: string; name: string }) {
  return (
    <h3 id={id} className="type-label-lg text-fg">
      <span aria-hidden="true" className="text-fg-muted">
        [{" "}
      </span>
      {name}
      <span aria-hidden="true" className="text-fg-muted">
        {" "}
        ]
      </span>
    </h3>
  );
}

function Benefits({ items, className }: { items: string[]; className?: string }) {
  return (
    <Entrance as="ul" preset="tick" stagger={0.11} delay={0.35} inset={0.04} className={cn("border-b border-hairline", className)}>
      {items.map((b) => (
        <li
          key={b}
          data-enter=""
          className="grid grid-cols-[18px_minmax(0,1fr)] gap-x-2 border-t border-hairline py-3 text-[14px] leading-[1.45] text-fg"
        >
          <CheckGlyph className="mt-[4px] size-3 text-fg-muted" />
          <span>{b}</span>
        </li>
      ))}
    </Entrance>
  );
}

function PartnerList({ partners }: { partners: Sponsor[] }) {
  if (!partners.length) return null;
  return (
    <ul className="mt-6 space-y-2" aria-label="Partners in this tier">
      {partners.map((p) => (
        <li key={p.name} className="font-mono text-[11px] leading-5 tracking-[0.04em] text-fg-muted">
          {p.url ? (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="link-draw text-fg">
              {p.name}
              <span aria-hidden="true"> ↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span className="text-fg">{p.name}</span>
          )}
          {p.since ? ` · since ${p.since}` : ""}
          {p.enabled ? ` · ${p.enabled}` : ""}
        </li>
      ))}
    </ul>
  );
}

export function TierCard({ tier, partners, className }: { tier: Tier; partners: Sponsor[]; className?: string }) {
  const [figure, plus] = splitAmount(tier.amount);
  // Count up only when the printed figure is exactly the tier's number ("$500" ↔ 500).
  const amount = tier.minUsd !== null && `$${tier.minUsd}` === figure.replace(/,/g, "") ? tier.minUsd : null;
  const size = tier.id === "gold" || tier.id === "silver" || tier.id === "bronze" ? plateSize[tier.id] : "small";
  const headingId = `sponsors-tier-${tier.id}`;
  return (
    <article
      data-enter=""
      aria-labelledby={headingId}
      className={cn("flex origin-top flex-col border-r border-b border-hairline bg-bg", className)}
    >
      <div className="flex flex-1 flex-col p-5 sm:p-7">
        <header className="flex items-center justify-between gap-3">
          <TierName id={headingId} name={tier.name} />
          <StatusChip count={partners.length} />
        </header>

        <p className="type-figure mt-8 text-fg sm:mt-10">
          {amount !== null ? <CountUp value={amount} prefix="$" /> : figure}
          {plus && <span className="text-fg-muted">{plus}</span>}
        </p>

        <Nameplate size={size} partner={partners[0]} className="mt-8" />

        <Benefits items={tier.benefits} className="mt-8" />
        <PartnerList partners={partners} />
      </div>
    </article>
  );
}

export function InKindBand({ tier, partners, className }: { tier: Tier; partners: Sponsor[]; className?: string }) {
  const headingId = `sponsors-tier-${tier.id}`;
  const kinds = tier.amount
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <article data-enter="" aria-labelledby={headingId} className={cn("origin-top border-r border-b border-hairline bg-bg", className)}>
      <div className="grid gap-y-8 p-5 sm:p-7 lg:grid-cols-12 lg:gap-x-[var(--gutter)]">
        <div className="lg:col-span-5">
          <header className="flex items-center justify-between gap-3 lg:justify-start lg:gap-5">
            <TierName id={headingId} name={tier.name} />
            <StatusChip count={partners.length} />
          </header>
          <p className="mt-6 font-display text-[clamp(24px,2.4vw,34px)] leading-[1.05] font-medium tracking-[-0.005em] text-fg [font-stretch:108%]">
            {kinds.map((k, i) => (
              <span key={k}>
                {i > 0 && (
                  <span aria-hidden="true" className="text-fg-muted">
                    {" · "}
                  </span>
                )}
                <span className="capitalize">{k}</span>
              </span>
            ))}
          </p>
        </div>
        <div className="lg:col-span-6 lg:col-start-7 lg:self-end">
          <Benefits items={tier.benefits} />
          <PartnerList partners={partners} />
        </div>
      </div>
    </article>
  );
}
