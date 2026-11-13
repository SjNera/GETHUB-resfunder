// Browser safe. The message a wallet signs to reset the password of the account it is linked to.
// The browser and the server build it with this one function.

/** A reset nonce is valid for this long after the server issues it. */
export const RESET_TTL_MS = 10 * 60_000;
/** 16 random bytes, hex. */
export const RESET_NONCE_RE = /^[0-9a-f]{32}$/;

export function buildResetMessage(email: string, wallet: string, nonce: string): string {
  return [
    "ResFunder password reset",
    "",
    "Sign to prove this wallet owns the account, then set a new password. Free, no transaction.",
    "",
    `Email: ${email.trim().toLowerCase()}`,
    `Wallet: ${wallet.toLowerCase()}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}
