// Only same-site paths are valid redirect targets after sign-in.
export function safeNext(raw: string | null | undefined, fallback = "/surveys"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}

export const signInUrl = (next: string) => `/sign-in?next=${encodeURIComponent(next)}`;
