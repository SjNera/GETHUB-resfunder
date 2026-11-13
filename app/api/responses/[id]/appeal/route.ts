// POST /api/responses/[id]/appeal (Lane C, added). The respondent appeals a rejection once.
// Auth: the sign-in session, and the session wallet must be the one that answered.
import { parseResponseId, readJson, respond } from '@/lib/api/errors';
import { fileAppeal } from '@/lib/payment/review';

// The text is at most a few hundred characters.
const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return respond(async () =>
    fileAppeal(parseResponseId((await ctx.params).id), request.headers, await readJson(request, MAX_BODY_BYTES)),
  );
}
