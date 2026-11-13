// POST /api/me/password (Lane C, added). Adds a password to the signed-in account. Auth: the sign-in session.
import { readJson, respond } from '@/lib/api/errors';
import { setMyPassword } from '@/lib/api/password';

const MAX_BODY_BYTES = 1024;

export async function POST(request: Request): Promise<Response> {
  return respond(async () => setMyPassword(request.headers, await readJson(request, MAX_BODY_BYTES)));
}
