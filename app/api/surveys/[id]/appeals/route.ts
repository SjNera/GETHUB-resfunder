// GET /api/surveys/[id]/appeals (Lane C, added). Appeals on a survey. Auth: view_log, researcher only.
import { connection } from 'next/server';
import { respond } from '@/lib/api/errors';
import { parseSurveyId } from '@/lib/api/surveys';
import { listAppeals } from '@/lib/payment/review';

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  await connection();
  return respond(async () => listAppeals(parseSurveyId((await ctx.params).id), request.headers));
}
