// POST /api/password-reset (Lane C, added). Forgot password, step 1: issues a one-time nonce for the email.
// No session. The answer is the same whether or not the email has an account.
import { readJson, respond } from '@/lib/api/errors';
import { startPasswordReset } from '@/lib/api/password-reset';

const MAX_BODY_BYTES = 1024;

export async function POST(request: Request): Promise<Response> {
  return respond(async () => startPasswordReset(await readJson(request, MAX_BODY_BYTES)));
}
