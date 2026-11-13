// R7 GET /api/responses/[id] (Lane C). Polled by the respondent page.
import { connection } from 'next/server';
import { parseResponseId, respond } from '@/lib/api/errors';
import { getResponseResult } from '@/lib/payment/runner';

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  await connection();
  return respond(async () => getResponseResult(parseResponseId((await ctx.params).id)));
}
