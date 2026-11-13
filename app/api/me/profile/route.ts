// GET and PUT /api/me/profile (Lane C, added). The signed-in user's sign-up answers. Auth: the sign-in session.
import { connection } from 'next/server';
import { readJson, respond } from '@/lib/api/errors';
import { getMyProfile, saveMyProfile } from '@/lib/api/profile';

// A profile is a dozen short fields.
const MAX_BODY_BYTES = 4096;

export async function GET(request: Request): Promise<Response> {
  await connection();
  return respond(() => getMyProfile(request.headers));
}

export async function PUT(request: Request): Promise<Response> {
  return respond(async () => saveMyProfile(request.headers, await readJson(request, MAX_BODY_BYTES)));
}
