// Server only. Better Auth: register with email + wallet (SIWE) + password, log in with email + password.
// Cookie sessions, tables in Postgres.
// Money actions still use the per-action wallet signature in lib/auth/signature.ts.
import { betterAuth } from "better-auth";
import { siwe } from "better-auth/plugins/siwe";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { verifyMessage } from "viem";

const https = (host: string | undefined) => (host ? `https://${host.replace(/^https?:\/\//, "")}` : null);

/**
 * The public address of the app. BETTER_AUTH_URL wins when set. On Vercel without it: the production
 * domain in production, the branch URL on a preview. Local dev falls back to localhost.
 */
export function appUrl(env: NodeJS.ProcessEnv = process.env): string {
  const vercel =
    env.VERCEL_ENV === "production"
      ? https(env.VERCEL_PROJECT_PRODUCTION_URL) ?? https(env.VERCEL_URL)
      : https(env.VERCEL_BRANCH_URL) ?? https(env.VERCEL_URL);
  return (env.BETTER_AUTH_URL || vercel || `http://localhost:${env.PORT || 3000}`).replace(/\/+$/, "");
}

/** Every address this deployment answers on, so Better Auth accepts requests from each of them. */
export function trustedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const all = [appUrl(env), https(env.VERCEL_PROJECT_PRODUCTION_URL), https(env.VERCEL_BRANCH_URL), https(env.VERCEL_URL)];
  return [...new Set(all.filter((u): u is string => !!u))];
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
    trustedOrigins: trustedOrigins(),
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
