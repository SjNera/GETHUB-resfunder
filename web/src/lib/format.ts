const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPeso(centavos: number): string {
  return peso.format(centavos / 100);
}

const pluralRules = new Intl.PluralRules("en");

/** plural(1, "response") → "1 response"; plural(2, "response") → "2 responses" */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  const word = pluralRules.select(n) === "one" ? singular : pluralForm;
  return `${n.toLocaleString("en-PH")} ${word}`;
}

export function shortHash(hash: string, head = 6, tail = 4): string {
  if (hash.length <= head + tail + 2) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

const absolute = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const absoluteWithYear = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatDateTime(iso: string): string {
  return absolute.format(new Date(iso));
}

/** Relative within a week, absolute after (ui-cheatsheet). */
export function formatWhen(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs > 7 * day) return absoluteWithYear.format(new Date(iso));
  if (abs >= day) return relative.format(Math.round(diff / day), "day");
  if (abs >= hour) return relative.format(Math.round(diff / hour), "hour");
  if (abs >= minute) return relative.format(Math.round(diff / minute), "minute");
  return diff >= 0 ? "in a moment" : "just now";
}

/** "5d 3h", "3h 12m", "12m" — for countdowns. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const m = Math.floor(ms / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${mm}m`;
  return `${mm}m`;
}

export const BSCSCAN = "https://testnet.bscscan.com";
export const txUrl = (hash: string) => `${BSCSCAN}/tx/${hash}`;
export const addressUrl = (address: string) => `${BSCSCAN}/address/${address}`;
