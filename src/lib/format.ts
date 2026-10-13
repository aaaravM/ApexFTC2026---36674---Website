// Number formatting with a FIXED locale, so server and browser always print the same string
// (a browser in de-DE would otherwise render "3.180" where the server rendered "3,180" →
// hydration mismatch). Use these everywhere numbers are shown.

const cache = new Map<string, Intl.NumberFormat>();

/** Intl.NumberFormat("en-US", opts), memoised. */
export function nf(opts: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", opts);
    cache.set(key, f);
  }
  return f;
}

/** 3180 → "3,180" */
export const fmtInt = (n: number) => nf({ maximumFractionDigits: 0 }).format(n);

/** fmtFixed(0.4213, 2) → "0.42" (always exactly `d` decimals) */
export const fmtFixed = (n: number, d = 1) => nf({ minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

/** fmtSigned(38) → "+38", fmtSigned(-4.5, 1) → "−4.5" (true minus sign) */
export const fmtSigned = (n: number, d = 0) => {
  const s = fmtFixed(Math.abs(n), d);
  if (Math.abs(n) < 0.5 * 10 ** -d) return `${fmtFixed(0, d)}`;
  return `${n < 0 ? "−" : "+"}${s}`;
};

/** fmtDeg(-38.2) → "−038°" (padded, signed, for dials) */
export const fmtDegPadded = (deg: number) => {
  const r = Math.round(deg);
  return `${r < 0 ? "−" : "+"}${String(Math.abs(r)).padStart(3, "0")}°`;
};

/** radians → degrees */
export const toDeg = (rad: number) => (rad * 180) / Math.PI;
/** degrees → radians */
export const toRad = (deg: number) => (deg * Math.PI) / 180;

/** inches → "8 ft 0 in" style */
export const fmtFeetInches = (inches: number) => {
  const ft = Math.floor(inches / 12);
  const inch = Math.round(inches - ft * 12);
  return inch === 12 ? `${ft + 1} ft 0 in` : `${ft} ft ${inch} in`;
};

/** "$3,800" */
export const fmtUsd = (n: number) => nf({ style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
