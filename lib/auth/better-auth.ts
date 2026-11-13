// Server only. Better Auth: register with email + wallet (SIWE) + password, log in with email + password.
// Cookie sessions, tables in Postgres.
// Money actions still use the per-action wallet signature in lib/auth/signature.ts.
import { betterAuth } from "better-auth";
import { siwe } from "better-auth/plugins/siwe";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { verifyMessage } from "viem";

export function appUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** Host (with port) the SIWE message must name. */
export const siweDomain = () => new URL(appUrl()).host;

let pool: Pool | null = null;
function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  // Small pool: serverless instances multiply. Use Neon's pooled connection string.
  pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000 });
  return pool;
}

export function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be set to a random string of 32+ characters");
  return betterAuth({
    appName: "ResFunder",
    baseURL: appUrl(),
    secret,
    database: getPool(),
    session: { expiresIn: 60 * 60 * 24 * 7 },
    // Log in with email + password. Accounts are only created by the wallet sign-in (SIWE), so every
    // user has a wallet; the password is added right after, through setPassword (lib/api/password.ts).
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8, maxPasswordLength: 128 },
    plugins: [
      siwe({
        domain: siweDomain(),
        anonymous: false, // an email is required alongside the wallet
        getNonce: async () => randomBytes(16).toString("hex"),
        verifyMessage: async ({ message, signature, address }) => {
          try {
            return await verifyMessage({ address: address as `0x${string}`, message, signature: signature as `0x${string}` });
          } catch {
            return false;
          }
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
let auth: Auth | null = null;
/** Created on first use, so builds and tests don't need the env vars. */
export function getAuth(): Auth {
  return (auth ??= createAuth());
}
