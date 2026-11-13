// POST /api/password-reset/confirm (Lane C, added). Forgot password, step 2: the linked wallet's signature
// over the reset message sets a new password and ends the account's sessions. No session needed.
import { readJson, respond } from '@/lib/api/errors';
import { confirmPasswordReset } from '@/lib/api/password-reset';

const MAX_BODY_BYTES = 2048;

export async function POST(request: Request): Promise<Response> {
  return respond(async () => confirmPasswordReset(await readJson(request, MAX_BODY_BYTES)));
}
