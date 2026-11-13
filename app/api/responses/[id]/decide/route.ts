// POST /api/responses/[id]/decide (Lane C, added). The researcher decides a response in review or an open appeal.
// Auth: the sign-in session, and the session wallet must be the survey's researcher.
import { parseResponseId, readJson, respond } from '@/lib/api/errors';
import { decideResponse } from '@/lib/payment/review';

// The body is one decision and one reason code.
const MAX_BODY_BYTES = 1024;
// Pay waits for a receipt, like R6.
export const maxDuration = 60;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return respond(async () =>
    decideResponse(parseResponseId((await ctx.params).id), request.headers, await readJson(request, MAX_BODY_BYTES)),
  );
}
