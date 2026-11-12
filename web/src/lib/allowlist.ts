/**
 * Demo allowlist, stated openly in the UI. Only these school emails can sign
 * in; only a hash of the email ever goes on-chain. Override with a
 * comma-separated NEXT_PUBLIC_ALLOWLIST. Real magic-link sign-in is a TODO.
 */
const DEFAULT = [
  "ana.santos@umak.edu.ph",
  "ben.cruz@umak.edu.ph",
  "carla.reyes@umak.edu.ph",
  "dan.lim@umak.edu.ph",
  "thesis.group7@umak.edu.ph",
];

export const ALLOWLIST: string[] = (process.env.NEXT_PUBLIC_ALLOWLIST ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)
  .concat(process.env.NEXT_PUBLIC_ALLOWLIST ? [] : DEFAULT);

export function isAllowlisted(email: string): boolean {
  return ALLOWLIST.includes(email.trim().toLowerCase());
}
