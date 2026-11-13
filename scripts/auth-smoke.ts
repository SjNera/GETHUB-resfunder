// Smoke test for sign-in: nonce -> SIWE signature -> verify (email + wallet) -> session -> sign-out.
// Calls the Better Auth handler directly, no server needed. Needs DATABASE_URL (with the auth tables
// applied: npm run db:apply:auth) and BETTER_AUTH_SECRET. Uses a throwaway key, never a real one.
//   npm run auth:smoke
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { getAuth, siweDomain, appUrl } from '../lib/auth/better-auth';
import { buildSiweMessage } from '../lib/ui/siwe';

const auth = getAuth();
const base = appUrl();
const post = (path: string, body: unknown, cookie?: string) =>
  auth.handler(
    new Request(`${base}/api/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: base, ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );
const must = (ok: boolean, what: string, detail?: unknown) => {
  if (!ok) throw new Error(`${what}${detail === undefined ? '' : `\n  got: ${JSON.stringify(detail)}`}`);
  console.log(`  ok  ${what}`);
};

const account = privateKeyToAccount(generatePrivateKey());
const email = `smoke-${Date.now()}@example.com`;

const nonceRes = await post('/siwe/nonce', {});
const { nonce } = (await nonceRes.json()) as { nonce: string };
must(nonceRes.status === 200 && nonce.length >= 8, 'nonce issued');

const message = buildSiweMessage({ address: account.address, nonce, domain: siweDomain(), uri: base, chainId: 97 });
const signature = await account.signMessage({ message });

const bad = await post('/siwe/verify', { message, signature: `0x${'00'.repeat(65)}`, email });
must(bad.status === 401, 'a wrong signature is rejected', bad.status);

const fresh = await (await post('/siwe/nonce', {})).json() as { nonce: string };
const message2 = buildSiweMessage({ address: account.address, nonce: fresh.nonce, domain: siweDomain(), uri: base, chainId: 97 });
const sig2 = await account.signMessage({ message: message2 });
const ok = await post('/siwe/verify', { message: message2, signature: sig2, email });
const okBody = (await ok.json()) as { success?: boolean; user?: { walletAddress: string } };
must(ok.status === 200 && okBody.success === true, 'valid signature signs in', okBody);
must(okBody.user?.walletAddress.toLowerCase() === account.address.toLowerCase(), 'session wallet matches the signer');

const cookie = (ok.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
must(cookie.length > 0, 'a session cookie is set');

const replay = await post('/siwe/verify', { message: message2, signature: sig2, email });
must(replay.status === 401, 'the same signed message cannot be replayed', replay.status);

const sess = await auth.handler(new Request(`${base}/api/auth/get-session`, { headers: { cookie } }));
const s = (await sess.json()) as { user?: { email: string } } | null;
must(s?.user?.email === email.toLowerCase(), 'get-session returns the email account', s);

const out = await post('/sign-out', {}, cookie);
must(out.status === 200, 'sign-out works');
const after = await auth.handler(new Request(`${base}/api/auth/get-session`, { headers: { cookie } }));
must((await after.json()) === null, 'the session is gone after sign-out');
console.log('auth smoke passed');
process.exit(0);
