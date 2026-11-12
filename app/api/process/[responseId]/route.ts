// R6 POST /api/process/[responseId] (Lane C). Runs screening and payment. Safe to repeat.
import { parseResponseId, respond } from '@/lib/api/errors';
import { processResponse } from '@/lib/payment/runner';

export const maxDuration = 60;

export async function POST(_request: Request, ctx: { params: Promise<{ responseId: string }> }): Promise<Response> {
  return respond(async () => processResponse(parseResponseId((await ctx.params).responseId)));
}
